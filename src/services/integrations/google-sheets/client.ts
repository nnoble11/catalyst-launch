/**
 * Google Sheets Integration Client
 *
 * Import traction metrics from Google Sheets. Supports automatic
 * column detection and milestone tracking.
 *
 * Auth: OAuth2 (Google)
 * Sync: Pull-based
 */

import { BaseIntegration, IntegrationContext } from '../base/BaseIntegration';
import type {
  IntegrationDefinition,
  StandardIngestItem,
  SyncOptions,
  IntegrationTokens,
} from '@/types/integrations';
import { getOAuthConfig } from '@/config/integrations';
import { integrationRegistry } from '../registry';
import {
  createTractionMetrics,
  getProgressMilestonesByProject,
  createProgressMilestone,
} from '@/lib/db/queries';
import type { ProgressMilestoneType } from '@/types';

export interface SheetMetricsRow {
  date: Date;
  customers?: number;
  mrrCents?: number;
  revenueCents?: number;
  activeUsers?: number;
  npsScore?: number;
  customMetrics?: Record<string, number>;
}

export interface SheetsConfig {
  spreadsheetId: string;
  sheetName?: string;
  range?: string;
}

// Milestone thresholds
const CUSTOMER_MILESTONES: { type: ProgressMilestoneType; threshold: number }[] = [
  { type: 'first_customer', threshold: 1 },
  { type: 'ten_customers', threshold: 10 },
  { type: 'hundred_customers', threshold: 100 },
];

const MRR_MILESTONES: { type: ProgressMilestoneType; threshold: number }[] = [
  { type: 'first_revenue', threshold: 1 },
  { type: 'mrr_1k', threshold: 100000 },
  { type: 'mrr_10k', threshold: 1000000 },
  { type: 'mrr_100k', threshold: 10000000 },
];

export class GoogleSheetsIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: 'google_sheets',
    name: 'Google Sheets',
    description: 'Import metrics and traction data from Google Sheets.',
    icon: 'table',
    category: 'productivity',
    authMethod: 'oauth2',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    syncMethod: 'pull',
    supportedTypes: ['note'],
    defaultSyncInterval: 60,
    features: {
      realtime: false,
      bidirectional: false,
      incrementalSync: true,
      webhooks: false,
    },
    isAvailable: false, // Coming soon
    isComingSoon: true,
  };

  private sheetsApiUrl = 'https://sheets.googleapis.com/v4/spreadsheets';

  getAuthorizationUrl(state: string): string {
    const config = getOAuthConfig('google_sheets');
    if (!config) throw new Error('Google Sheets OAuth not configured');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(' '),
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<IntegrationTokens> {
    const config = getOAuthConfig('google_sheets');
    if (!config) throw new Error('Google Sheets OAuth not configured');

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<IntegrationTokens> {
    const config = getOAuthConfig('google_sheets');
    if (!config) throw new Error('Google Sheets OAuth not configured');

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
    };
  }

  async validateConnection(tokens: IntegrationTokens): Promise<boolean> {
    try {
      // Just verify the token works with a simple API call
      const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo', {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getAccountInfo(tokens: IntegrationTokens): Promise<{
    accountName?: string;
    accountEmail?: string;
    workspace?: string;
    [key: string]: unknown;
  }> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    const data = await response.json();
    return {
      accountName: data.name,
      accountEmail: data.email,
      picture: data.picture,
    };
  }

  /**
   * Fetch data from a Google Sheet
   */
  async fetchSheetData(
    accessToken: string,
    config: SheetsConfig
  ): Promise<string[][]> {
    const range = config.range || (config.sheetName ? `${config.sheetName}!A:Z` : 'A:Z');
    const url = `${this.sheetsApiUrl}/${config.spreadsheetId}/values/${encodeURIComponent(range)}`;

    const response = await this.fetchWithRetry(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch sheet: ${error}`);
    }

    const data = await response.json();
    return data.values || [];
  }

  /**
   * Parse sheet rows into metrics
   */
  parseSheetRows(rows: string[][]): SheetMetricsRow[] {
    if (rows.length < 2) return []; // Need at least header + 1 data row

    const headers = rows[0].map((h) => h.toLowerCase().trim());
    const results: SheetMetricsRow[] = [];

    // Find column indices
    const dateIdx = headers.findIndex((h) =>
      ['date', 'metric_date', 'metricdate'].includes(h.replace(/[^a-z]/g, ''))
    );
    const customersIdx = headers.findIndex((h) =>
      ['customers', 'customercount', 'customer'].includes(h.replace(/[^a-z]/g, ''))
    );
    const mrrIdx = headers.findIndex((h) =>
      ['mrr', 'monthlyrecurringrevenue'].includes(h.replace(/[^a-z]/g, ''))
    );
    const revenueIdx = headers.findIndex((h) =>
      ['revenue', 'totalrevenue'].includes(h.replace(/[^a-z]/g, ''))
    );
    const activeUsersIdx = headers.findIndex((h) =>
      ['activeusers', 'dau', 'mau'].includes(h.replace(/[^a-z]/g, ''))
    );
    const npsIdx = headers.findIndex((h) =>
      ['nps', 'npsscore'].includes(h.replace(/[^a-z]/g, ''))
    );

    if (dateIdx === -1) {
      throw new Error('No date column found in sheet');
    }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[dateIdx]) continue;

      const date = new Date(row[dateIdx]);
      if (isNaN(date.getTime())) continue;

      const parseNum = (idx: number): number | undefined => {
        if (idx === -1 || !row[idx]) return undefined;
        const cleaned = row[idx].replace(/[$€£¥,\s]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? undefined : num;
      };

      results.push({
        date,
        customers: parseNum(customersIdx) ? Math.round(parseNum(customersIdx)!) : undefined,
        mrrCents: parseNum(mrrIdx) ? Math.round(parseNum(mrrIdx)! * 100) : undefined,
        revenueCents: parseNum(revenueIdx) ? Math.round(parseNum(revenueIdx)! * 100) : undefined,
        activeUsers: parseNum(activeUsersIdx) ? Math.round(parseNum(activeUsersIdx)!) : undefined,
        npsScore: parseNum(npsIdx),
      });
    }

    return results;
  }

  async sync(
    context: IntegrationContext,
    _options?: SyncOptions
  ): Promise<StandardIngestItem[]> {
    // Get spreadsheet config from metadata
    const sheetsConfig = context.metadata?.sheetsConfig as SheetsConfig | undefined;

    if (!sheetsConfig?.spreadsheetId) {
      return [{
        sourceProvider: 'google_sheets',
        sourceId: 'sync-error',
        type: 'note',
        title: 'Google Sheets Sync',
        content: 'No spreadsheet configured. Please set up the spreadsheet ID in your integration settings.',
        metadata: { timestamp: new Date() },
      }];
    }

    try {
      const rows = await this.fetchSheetData(context.tokens.accessToken, sheetsConfig);
      const metrics = this.parseSheetRows(rows);

      // Return summary as ingest item
      return [{
        sourceProvider: 'google_sheets',
        sourceId: `sync-${new Date().toISOString().split('T')[0]}`,
        sourceUrl: `https://docs.google.com/spreadsheets/d/${sheetsConfig.spreadsheetId}`,
        type: 'note',
        title: 'Google Sheets Metrics Sync',
        content: `Synced ${metrics.length} rows from Google Sheets`,
        metadata: {
          timestamp: new Date(),
          custom: {
            rowCount: metrics.length,
            spreadsheetId: sheetsConfig.spreadsheetId,
          },
        },
      }];
    } catch (error) {
      return [{
        sourceProvider: 'google_sheets',
        sourceId: 'sync-error',
        type: 'note',
        title: 'Google Sheets Sync Error',
        content: error instanceof Error ? error.message : 'Unknown error',
        metadata: { timestamp: new Date() },
      }];
    }
  }

  /**
   * Sync Google Sheets data to traction metrics and detect milestones
   */
  async syncSheetsToProject(
    accessToken: string,
    projectId: string,
    config: SheetsConfig
  ): Promise<{
    rowsImported: number;
    newMilestones: ProgressMilestoneType[];
  }> {
    const rows = await this.fetchSheetData(accessToken, config);
    const metrics = this.parseSheetRows(rows);

    // Track max values for milestone detection
    let maxCustomers = 0;
    let maxMrrCents = 0;
    let hasRevenue = false;

    // Import each row
    for (const metric of metrics) {
      await createTractionMetrics({
        projectId,
        metricDate: metric.date,
        customers: metric.customers,
        mrrCents: metric.mrrCents,
        revenueCents: metric.revenueCents,
        activeUsers: metric.activeUsers,
        npsScore: metric.npsScore,
        customMetrics: metric.customMetrics,
      });

      if (metric.customers) maxCustomers = Math.max(maxCustomers, metric.customers);
      if (metric.mrrCents) maxMrrCents = Math.max(maxMrrCents, metric.mrrCents);
      if ((metric.revenueCents && metric.revenueCents > 0) || (metric.mrrCents && metric.mrrCents > 0)) {
        hasRevenue = true;
      }
    }

    // Detect milestones
    const existingMilestones = await getProgressMilestonesByProject(projectId);
    const existingTypes = new Set(existingMilestones.map((m) => m.milestoneType));
    const newMilestones: ProgressMilestoneType[] = [];

    // Customer milestones
    for (const milestone of CUSTOMER_MILESTONES) {
      if (maxCustomers >= milestone.threshold && !existingTypes.has(milestone.type)) {
        await createProgressMilestone({
          projectId,
          milestoneType: milestone.type,
          evidence: {
            metric: 'customers',
            value: maxCustomers,
            notes: 'Detected from Google Sheets sync',
            sourceUrl: `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`,
          },
          visibility: 'cohort',
        });
        newMilestones.push(milestone.type);
      }
    }

    // Revenue milestones
    if (hasRevenue && !existingTypes.has('first_revenue')) {
      await createProgressMilestone({
        projectId,
        milestoneType: 'first_revenue',
        evidence: {
          metric: 'revenue',
          notes: 'Detected from Google Sheets sync',
          sourceUrl: `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`,
        },
        visibility: 'cohort',
      });
      newMilestones.push('first_revenue');
    }

    // MRR milestones
    for (const milestone of MRR_MILESTONES) {
      if (milestone.type === 'first_revenue') continue;
      if (maxMrrCents >= milestone.threshold && !existingTypes.has(milestone.type)) {
        await createProgressMilestone({
          projectId,
          milestoneType: milestone.type,
          evidence: {
            metric: 'mrr',
            value: maxMrrCents / 100,
            notes: 'Detected from Google Sheets sync',
            sourceUrl: `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`,
          },
          visibility: 'cohort',
        });
        newMilestones.push(milestone.type);
      }
    }

    return { rowsImported: metrics.length, newMilestones };
  }
}

// Create and register the integration
const googleSheetsIntegration = new GoogleSheetsIntegration();
integrationRegistry.register(googleSheetsIntegration);

export default googleSheetsIntegration;
