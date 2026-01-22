/**
 * Gmail Integration Client
 *
 * Gmail integration for capturing important emails.
 *
 * Auth: OAuth2 (Google)
 * Sync: Pull with label filtering
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

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: { name: string; value: string }[];
    body?: { data?: string };
    parts?: Array<{
      mimeType: string;
      body?: { data?: string };
    }>;
  };
  internalDate: string;
}

interface GmailListResponse {
  messages: { id: string; threadId: string }[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export class GmailIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: 'gmail',
    name: 'Gmail',
    description: 'Capture important emails and turn them into actionable items.',
    icon: 'mail',
    category: 'communication',
    authMethod: 'oauth2',
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    syncMethod: 'pull',
    supportedTypes: ['email', 'message'],
    defaultSyncInterval: 15,
    features: {
      realtime: false,
      bidirectional: false,
      incrementalSync: true,
      webhooks: true,
    },
    isAvailable: true,
  };

  private baseUrl = 'https://gmail.googleapis.com/gmail/v1';

  getAuthorizationUrl(state: string): string {
    const config = getOAuthConfig('gmail');
    if (!config) throw new Error('Gmail OAuth not configured');

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<IntegrationTokens> {
    const config = getOAuthConfig('gmail');
    if (!config) throw new Error('Gmail OAuth not configured');

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error('Token exchange failed');
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
    const config = getOAuthConfig('gmail');
    if (!config) throw new Error('Gmail OAuth not configured');

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: refreshToken,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
    };
  }

  async validateConnection(tokens: IntegrationTokens): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/users/me/profile`, {
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
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
    [key: string]: unknown;
  }> {
    const response = await fetch(`${this.baseUrl}/users/me/profile`, {
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Gmail profile');
    }

    const data = await response.json();
    return {
      accountEmail: data.emailAddress,
      messagesTotal: data.messagesTotal,
      threadsTotal: data.threadsTotal,
    };
  }

  async sync(
    context: IntegrationContext,
    options?: SyncOptions
  ): Promise<StandardIngestItem[]> {
    const items: StandardIngestItem[] = [];
    const limit = options?.limit || 50;

    // Build query - fetch recent inbox emails
    // Use date filter if since is provided, otherwise fetch from inbox
    let query = 'in:inbox';

    if (options?.since) {
      // Gmail uses after: with YYYY/MM/DD format
      const sinceDate = new Date(options.since);
      const dateStr = `${sinceDate.getFullYear()}/${String(sinceDate.getMonth() + 1).padStart(2, '0')}/${String(sinceDate.getDate()).padStart(2, '0')}`;
      query += ` after:${dateStr}`;
    } else {
      // Default to last 7 days if no since date
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const dateStr = `${sevenDaysAgo.getFullYear()}/${String(sevenDaysAgo.getMonth() + 1).padStart(2, '0')}/${String(sevenDaysAgo.getDate()).padStart(2, '0')}`;
      query += ` after:${dateStr}`;
    }

    const messageIds = await this.listMessages(
      context.tokens.accessToken,
      query,
      limit
    );

    for (const { id } of messageIds) {
      const message = await this.getMessage(context.tokens.accessToken, id);
      items.push(this.normalizeMessage(message));

      // Respect rate limits
      await this.sleep(50);
    }

    return items;
  }

  private async listMessages(
    accessToken: string,
    query: string,
    maxResults: number
  ): Promise<{ id: string; threadId: string }[]> {
    const params = new URLSearchParams({
      q: query,
      maxResults: maxResults.toString(),
    });

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/users/me/messages?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status}`);
    }

    const data: GmailListResponse = await response.json();
    return data.messages || [];
  }

  private async getMessage(
    accessToken: string,
    messageId: string
  ): Promise<GmailMessage> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/users/me/messages/${messageId}?format=full`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status}`);
    }

    return response.json();
  }

  private normalizeMessage(message: GmailMessage): StandardIngestItem {
    const headers = message.payload.headers;
    const getHeader = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;

    const subject = getHeader('Subject') || '(No Subject)';
    const from = getHeader('From') || '';
    const to = getHeader('To') || '';
    const date = getHeader('Date');

    // Extract body content
    let body = '';
    if (message.payload.body?.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    } else if (message.payload.parts) {
      const textPart = message.payload.parts.find(
        (p) => p.mimeType === 'text/plain'
      );
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    }

    // Fall back to snippet if no body
    if (!body) {
      body = message.snippet;
    }

    // Truncate very long emails
    if (body.length > 5000) {
      body = body.substring(0, 5000) + '...';
    }

    const content = `**From:** ${from}\n**To:** ${to}\n\n${body}`;

    return {
      sourceProvider: 'gmail',
      sourceId: message.id,
      sourceUrl: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
      type: 'email',
      title: subject,
      content,
      summary: message.snippet,
      metadata: {
        timestamp: new Date(parseInt(message.internalDate)),
        author: from,
        tags: message.labelIds,
        custom: {
          threadId: message.threadId,
          to,
          labels: message.labelIds,
        },
      },
      processingHints: {
        extractTasks: message.labelIds.includes('STARRED'),
        extractMemories: true,
      },
    };
  }
}

// Create and register the integration
const gmailIntegration = new GmailIntegration();
integrationRegistry.register(gmailIntegration);

export default gmailIntegration;
