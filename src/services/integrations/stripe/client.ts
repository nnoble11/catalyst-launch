/**
 * Stripe Integration Client
 *
 * Automatically tracks revenue metrics and detects milestones:
 * - Customer count (first_customer, ten_customers, hundred_customers)
 * - Revenue milestones (first_revenue, mrr_1k, mrr_10k, mrr_100k)
 *
 * Auth: OAuth2 (Stripe Connect)
 * Sync: Pull + Webhooks
 */

import Stripe from 'stripe';
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
  createProgressMilestone,
  getProgressMilestonesByProject,
} from '@/lib/db/queries';
import type { ProgressMilestoneType } from '@/types';

export interface StripeMetrics {
  customerCount: number;
  totalRevenueCents: number;
  mrrCents: number;
  activeSubscriptions: number;
  churnedSubscriptions: number;
}

export interface MilestoneCheck {
  type: ProgressMilestoneType;
  achieved: boolean;
  value?: number | string;
}

// Milestone thresholds
const CUSTOMER_MILESTONES: { type: ProgressMilestoneType; threshold: number }[] = [
  { type: 'first_customer', threshold: 1 },
  { type: 'ten_customers', threshold: 10 },
  { type: 'hundred_customers', threshold: 100 },
];

const MRR_MILESTONES: { type: ProgressMilestoneType; threshold: number }[] = [
  { type: 'first_revenue', threshold: 1 }, // Any revenue
  { type: 'mrr_1k', threshold: 100000 }, // $1,000 in cents
  { type: 'mrr_10k', threshold: 1000000 }, // $10,000 in cents
  { type: 'mrr_100k', threshold: 10000000 }, // $100,000 in cents
];

export class StripeIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: 'stripe',
    name: 'Stripe',
    description: 'Automatically track revenue, MRR, and customer milestones from Stripe.',
    icon: 'credit-card',
    category: 'productivity',
    authMethod: 'oauth2',
    scopes: ['read_only'],
    syncMethod: 'webhook',
    supportedTypes: ['note'],
    defaultSyncInterval: 60,
    features: {
      realtime: true,
      bidirectional: false,
      incrementalSync: true,
      webhooks: true,
    },
    isAvailable: true,
  };

  /**
   * Create a Stripe API client
   */
  private createStripeClient(accessToken: string): Stripe {
    return new Stripe(accessToken, {
      apiVersion: '2025-12-15.clover',
    });
  }

  getAuthorizationUrl(state: string): string {
    const config = getOAuthConfig('stripe');
    if (!config) throw new Error('Stripe OAuth not configured');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      scope: 'read_only',
      state,
      redirect_uri: config.redirectUri,
    });

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<IntegrationTokens> {
    const config = getOAuthConfig('stripe');
    if (!config) throw new Error('Stripe OAuth not configured');

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_secret: config.clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || 'Failed to exchange Stripe code');
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      // Stripe Connect doesn't provide refresh tokens in the same way
      // The access token is long-lived
    };
  }

  async refreshAccessToken(_refreshToken: string): Promise<IntegrationTokens> {
    // Stripe Connect access tokens don't expire in the traditional sense
    // They remain valid until deauthorized
    throw new Error('Stripe Connect tokens do not require refresh');
  }

  async validateConnection(tokens: IntegrationTokens): Promise<boolean> {
    try {
      const stripe = this.createStripeClient(tokens.accessToken);
      await stripe.balance.retrieve();
      return true;
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
    const stripe = this.createStripeClient(tokens.accessToken);
    const account = await stripe.accounts.retrieve();

    return {
      accountName: account.business_profile?.name ?? account.settings?.dashboard?.display_name ?? undefined,
      accountEmail: account.email ?? undefined,
      workspace: account.business_type ?? undefined,
      stripeAccountId: account.id,
      country: account.country,
      livemode: account.charges_enabled,
    };
  }

  /**
   * Fetch current metrics from Stripe
   */
  async fetchStripeMetrics(stripe: Stripe): Promise<StripeMetrics> {
    // Get customer count
    const customers = await stripe.customers.list({ limit: 1 });
    const customerCount = customers.data.length > 0
      ? (await stripe.customers.list({ limit: 100 })).data.filter((c: Stripe.Customer) => !c.deleted).length
      : 0;

    // Get active subscriptions and calculate MRR
    const subscriptions = await stripe.subscriptions.list({
      status: 'active',
      limit: 100,
    });

    let mrrCents = 0;
    for (const sub of subscriptions.data) {
      for (const item of sub.items.data) {
        const price = item.price;
        if (price.recurring) {
          const amount = price.unit_amount || 0;
          const quantity = item.quantity || 1;
          // Normalize to monthly
          if (price.recurring.interval === 'year') {
            mrrCents += Math.round((amount * quantity) / 12);
          } else if (price.recurring.interval === 'month') {
            mrrCents += amount * quantity;
          } else if (price.recurring.interval === 'week') {
            mrrCents += Math.round((amount * quantity) * 4.33);
          } else if (price.recurring.interval === 'day') {
            mrrCents += Math.round((amount * quantity) * 30);
          }
        }
      }
    }

    // Get total revenue from balance transactions
    const balance = await stripe.balance.retrieve();
    const totalRevenueCents = balance.available.reduce((sum: number, b: Stripe.Balance.Available) => sum + b.amount, 0) +
      balance.pending.reduce((sum: number, b: Stripe.Balance.Pending) => sum + b.amount, 0);

    // Get churned subscriptions count (cancelled in last 30 days)
    const cancelledSubs = await stripe.subscriptions.list({
      status: 'canceled',
      limit: 100,
    });
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    const churnedSubscriptions = cancelledSubs.data.filter(
      (s: Stripe.Subscription) => s.canceled_at && s.canceled_at > thirtyDaysAgo
    ).length;

    return {
      customerCount,
      totalRevenueCents,
      mrrCents,
      activeSubscriptions: subscriptions.data.length,
      churnedSubscriptions,
    };
  }

  /**
   * Check which milestones have been achieved based on metrics
   */
  checkMilestones(metrics: StripeMetrics): MilestoneCheck[] {
    const checks: MilestoneCheck[] = [];

    // Check customer milestones
    for (const milestone of CUSTOMER_MILESTONES) {
      checks.push({
        type: milestone.type,
        achieved: metrics.customerCount >= milestone.threshold,
        value: metrics.customerCount,
      });
    }

    // Check revenue milestones
    for (const milestone of MRR_MILESTONES) {
      const achieved = milestone.type === 'first_revenue'
        ? metrics.totalRevenueCents > 0 || metrics.mrrCents > 0
        : metrics.mrrCents >= milestone.threshold;

      checks.push({
        type: milestone.type,
        achieved,
        value: milestone.type === 'first_revenue'
          ? metrics.totalRevenueCents
          : metrics.mrrCents,
      });
    }

    return checks;
  }

  async sync(
    context: IntegrationContext,
    _options?: SyncOptions
  ): Promise<StandardIngestItem[]> {
    const stripe = this.createStripeClient(context.tokens.accessToken);
    const metrics = await this.fetchStripeMetrics(stripe);

    // Create a summary item
    const summaryItem: StandardIngestItem = {
      sourceProvider: 'stripe',
      sourceId: `metrics-${new Date().toISOString().split('T')[0]}`,
      sourceUrl: 'https://dashboard.stripe.com',
      type: 'note',
      title: 'Stripe Metrics Sync',
      content: `**Revenue Metrics Update**\n\n` +
        `- Customers: ${metrics.customerCount}\n` +
        `- MRR: $${(metrics.mrrCents / 100).toFixed(2)}\n` +
        `- Active Subscriptions: ${metrics.activeSubscriptions}\n` +
        `- Churned (30d): ${metrics.churnedSubscriptions}\n` +
        `- Total Revenue: $${(metrics.totalRevenueCents / 100).toFixed(2)}`,
      metadata: {
        timestamp: new Date(),
        custom: {
          customerCount: metrics.customerCount,
          mrrCents: metrics.mrrCents,
          totalRevenueCents: metrics.totalRevenueCents,
          activeSubscriptions: metrics.activeSubscriptions,
          churnedSubscriptions: metrics.churnedSubscriptions,
        },
      },
    };

    return [summaryItem];
  }

  /**
   * Sync Stripe data to traction metrics and auto-create milestones
   */
  async syncStripeToProject(
    accessToken: string,
    projectId: string
  ): Promise<{
    metrics: StripeMetrics;
    newMilestones: ProgressMilestoneType[];
  }> {
    const stripe = this.createStripeClient(accessToken);

    // Fetch current metrics from Stripe
    const metrics = await this.fetchStripeMetrics(stripe);

    // Save to traction metrics
    await createTractionMetrics({
      projectId,
      metricDate: new Date(),
      customers: metrics.customerCount,
      mrrCents: metrics.mrrCents,
      revenueCents: metrics.totalRevenueCents,
    });

    // Check for new milestones
    const existingMilestones = await getProgressMilestonesByProject(projectId);
    const existingTypes = new Set(existingMilestones.map(m => m.milestoneType));

    const milestoneChecks = this.checkMilestones(metrics);
    const newMilestones: ProgressMilestoneType[] = [];

    for (const check of milestoneChecks) {
      if (check.achieved && !existingTypes.has(check.type)) {
        // Create new milestone
        await createProgressMilestone({
          projectId,
          milestoneType: check.type,
          evidence: {
            metric: check.type.includes('customer') ? 'customers' : 'mrr',
            value: check.value,
            notes: `Automatically detected via Stripe integration`,
            sourceUrl: 'https://dashboard.stripe.com',
          },
          visibility: 'cohort',
        });
        newMilestones.push(check.type);
      }
    }

    return { metrics, newMilestones };
  }

  /**
   * Handle incoming Stripe webhook events
   */
  async handleWebhook(
    payload: unknown,
    _signature?: string
  ): Promise<StandardIngestItem[]> {
    const event = payload as Stripe.Event;

    // Events that might trigger milestone checks
    const relevantEvents = [
      'customer.created',
      'customer.subscription.created',
      'customer.subscription.updated',
      'invoice.paid',
      'charge.succeeded',
    ];

    if (!relevantEvents.includes(event.type)) {
      return [];
    }

    // Create an item for the webhook event
    const item: StandardIngestItem = {
      sourceProvider: 'stripe',
      sourceId: event.id,
      type: 'note',
      title: `Stripe: ${event.type}`,
      content: `Received Stripe event: ${event.type}`,
      metadata: {
        timestamp: new Date(event.created * 1000),
        custom: {
          eventType: event.type,
          eventId: event.id,
          livemode: event.livemode,
        },
      },
    };

    return [item];
  }

  /**
   * Process a Stripe webhook event and sync metrics
   */
  async processStripeWebhook(
    event: Stripe.Event,
    projectId: string,
    stripeAccessToken: string
  ): Promise<{ processed: boolean; newMilestones: ProgressMilestoneType[] }> {
    // Events that might trigger milestone checks
    const relevantEvents = [
      'customer.created',
      'customer.subscription.created',
      'customer.subscription.updated',
      'invoice.paid',
      'charge.succeeded',
    ];

    if (!relevantEvents.includes(event.type)) {
      return { processed: false, newMilestones: [] };
    }

    // Sync and check for milestones
    const result = await this.syncStripeToProject(stripeAccessToken, projectId);

    return { processed: true, newMilestones: result.newMilestones };
  }
}

// Create and register the integration
const stripeIntegration = new StripeIntegration();
integrationRegistry.register(stripeIntegration);

export default stripeIntegration;
