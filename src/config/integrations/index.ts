/**
 * Integration Configuration
 *
 * Environment variable mappings and configuration for all integrations.
 * This centralizes OAuth credentials and API settings.
 */

import type { IntegrationProvider } from '@/types/integrations';
import { INTEGRATION_PROVIDERS } from '@/types/integrations';

/**
 * Normalize URL slug to provider ID
 * Converts hyphens to underscores (e.g., 'google-calendar' -> 'google_calendar')
 */
export function normalizeProviderId(slug: string): IntegrationProvider | null {
  // First try direct match
  if (INTEGRATION_PROVIDERS.includes(slug as IntegrationProvider)) {
    return slug as IntegrationProvider;
  }

  // Convert hyphens to underscores and try again
  const normalized = slug.replace(/-/g, '_');
  if (INTEGRATION_PROVIDERS.includes(normalized as IntegrationProvider)) {
    return normalized as IntegrationProvider;
  }

  return null;
}

/**
 * Convert provider ID to URL slug
 * Converts underscores to hyphens (e.g., 'google_calendar' -> 'google-calendar')
 */
export function providerIdToSlug(providerId: IntegrationProvider): string {
  return providerId.replace(/_/g, '-');
}

export interface IntegrationOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authorizationUrl: string;
  tokenUrl: string;
}

export interface IntegrationApiConfig {
  baseUrl: string;
  apiKey?: string;
  webhookSecret?: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * OAuth configurations for each provider
 */
export const OAUTH_CONFIGS: Partial<Record<IntegrationProvider, IntegrationOAuthConfig>> = {
  // Readwise
  readwise: {
    clientId: process.env.READWISE_CLIENT_ID || '',
    clientSecret: process.env.READWISE_CLIENT_SECRET || '',
    redirectUri: `${APP_URL}/api/integrations/readwise/callback`,
    scopes: [],
    authorizationUrl: 'https://readwise.io/api/v2/auth/',
    tokenUrl: 'https://readwise.io/api/v2/token/',
  },

  // Linear
  linear: {
    clientId: process.env.LINEAR_CLIENT_ID || '',
    clientSecret: process.env.LINEAR_CLIENT_SECRET || '',
    redirectUri: `${APP_URL}/api/integrations/linear/callback`,
    scopes: ['read', 'write', 'issues:create'],
    authorizationUrl: 'https://linear.app/oauth/authorize',
    tokenUrl: 'https://api.linear.app/oauth/token',
  },

  // Todoist
  todoist: {
    clientId: process.env.TODOIST_CLIENT_ID || '',
    clientSecret: process.env.TODOIST_CLIENT_SECRET || '',
    redirectUri: `${APP_URL}/api/integrations/todoist/callback`,
    scopes: ['data:read_write'],
    authorizationUrl: 'https://todoist.com/oauth/authorize',
    tokenUrl: 'https://todoist.com/oauth/access_token',
  },

  // Gmail (uses Google OAuth)
  gmail: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: `${APP_URL}/api/integrations/gmail/callback`,
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.labels',
    ],
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
  },

  // Pocket
  pocket: {
    clientId: process.env.POCKET_CONSUMER_KEY || '',
    clientSecret: '', // Pocket uses consumer key only
    redirectUri: `${APP_URL}/api/integrations/pocket/callback`,
    scopes: [],
    authorizationUrl: 'https://getpocket.com/v3/oauth/authorize',
    tokenUrl: 'https://getpocket.com/v3/oauth/request',
  },

  // Raindrop.io
  raindrop: {
    clientId: process.env.RAINDROP_CLIENT_ID || '',
    clientSecret: process.env.RAINDROP_CLIENT_SECRET || '',
    redirectUri: `${APP_URL}/api/integrations/raindrop/callback`,
    scopes: [],
    authorizationUrl: 'https://raindrop.io/oauth/authorize',
    tokenUrl: 'https://raindrop.io/oauth/access_token',
  },

  // Discord
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    redirectUri: `${APP_URL}/api/integrations/discord/callback`,
    scopes: ['identify', 'guilds', 'messages.read', 'bot'],
    authorizationUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
  },

  // Zoom
  zoom: {
    clientId: process.env.ZOOM_CLIENT_ID || '',
    clientSecret: process.env.ZOOM_CLIENT_SECRET || '',
    redirectUri: `${APP_URL}/api/integrations/zoom/callback`,
    scopes: ['recording:read', 'user:read'],
    authorizationUrl: 'https://zoom.us/oauth/authorize',
    tokenUrl: 'https://zoom.us/oauth/token',
  },

  // Google Calendar (reuses Google OAuth)
  google_calendar: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: `${APP_URL}/api/integrations/google-calendar/callback`,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
  },

  // Notion
  notion: {
    clientId: process.env.NOTION_CLIENT_ID || '',
    clientSecret: process.env.NOTION_CLIENT_SECRET || '',
    redirectUri: `${APP_URL}/api/integrations/notion/callback`,
    scopes: [],
    authorizationUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
  },

  // Slack
  slack: {
    clientId: process.env.SLACK_CLIENT_ID || '',
    clientSecret: process.env.SLACK_CLIENT_SECRET || '',
    redirectUri: `${APP_URL}/api/integrations/slack/callback`,
    scopes: ['chat:write', 'commands', 'users:read', 'users:read.email', 'channels:read', 'im:write'],
    authorizationUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
  },

  // Stripe Connect
  stripe: {
    clientId: process.env.STRIPE_CLIENT_ID || '',
    clientSecret: process.env.STRIPE_SECRET_KEY || '',
    redirectUri: `${APP_URL}/api/integrations/stripe/callback`,
    scopes: ['read_write'],
    authorizationUrl: 'https://connect.stripe.com/oauth/authorize',
    tokenUrl: 'https://connect.stripe.com/oauth/token',
  },

  // GitHub
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    redirectUri: `${APP_URL}/api/integrations/github/callback`,
    scopes: ['repo', 'read:user'],
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
  },

  // Google Sheets (reuses Google OAuth)
  google_sheets: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: `${APP_URL}/api/integrations/google-sheets/callback`,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
  },
};

/**
 * API configurations for each provider
 */
export const API_CONFIGS: Partial<Record<IntegrationProvider, IntegrationApiConfig>> = {
  // Granola (API Key based)
  granola: {
    baseUrl: process.env.GRANOLA_API_BASE_URL || 'https://api.granola.so/v1',
    apiKey: process.env.GRANOLA_API_KEY,
  },

  // Readwise
  readwise: {
    baseUrl: 'https://readwise.io/api/v2',
  },

  // Linear
  linear: {
    baseUrl: 'https://api.linear.app',
    webhookSecret: process.env.LINEAR_WEBHOOK_SECRET,
  },

  // Todoist
  todoist: {
    baseUrl: 'https://api.todoist.com/rest/v2',
  },

  // Gmail
  gmail: {
    baseUrl: 'https://gmail.googleapis.com/gmail/v1',
  },

  // Pocket
  pocket: {
    baseUrl: 'https://getpocket.com/v3',
  },

  // Raindrop.io
  raindrop: {
    baseUrl: 'https://api.raindrop.io/rest/v1',
  },

  // Discord
  discord: {
    baseUrl: 'https://discord.com/api/v10',
    webhookSecret: process.env.DISCORD_WEBHOOK_SECRET,
  },

  // Zoom
  zoom: {
    baseUrl: 'https://api.zoom.us/v2',
    webhookSecret: process.env.ZOOM_WEBHOOK_SECRET,
  },

  // Browser Extension
  browser_extension: {
    baseUrl: `${APP_URL}/api/integrations/browser-extension`,
    apiKey: process.env.BROWSER_EXTENSION_SECRET,
  },

  // Stripe
  stripe: {
    baseUrl: 'https://api.stripe.com',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },

  // Google Sheets
  google_sheets: {
    baseUrl: 'https://sheets.googleapis.com/v4',
  },

  // GitHub
  github: {
    baseUrl: 'https://api.github.com',
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
  },
};

/**
 * Webhook secrets for verification
 */
export const WEBHOOK_SECRETS: Partial<Record<IntegrationProvider, string>> = {
  linear: process.env.LINEAR_WEBHOOK_SECRET || '',
  zoom: process.env.ZOOM_WEBHOOK_SECRET || '',
  discord: process.env.DISCORD_WEBHOOK_SECRET || '',
  slack: process.env.SLACK_SIGNING_SECRET || '',
  stripe: process.env.STRIPE_WEBHOOK_SECRET || '',
  github: process.env.GITHUB_WEBHOOK_SECRET || '',
};

/**
 * Get OAuth config for a provider
 */
export function getOAuthConfig(provider: IntegrationProvider): IntegrationOAuthConfig | undefined {
  return OAUTH_CONFIGS[provider];
}

/**
 * Get API config for a provider
 */
export function getApiConfig(provider: IntegrationProvider): IntegrationApiConfig | undefined {
  return API_CONFIGS[provider];
}

/**
 * Check if a provider is properly configured
 */
export function isProviderConfigured(provider: IntegrationProvider): boolean {
  const oauth = OAUTH_CONFIGS[provider];
  const api = API_CONFIGS[provider];

  // For API key providers
  if (api?.apiKey) {
    return true;
  }

  // For OAuth providers
  if (oauth) {
    return Boolean(oauth.clientId && oauth.clientSecret);
  }

  return false;
}

/**
 * Get all configured providers
 */
export function getConfiguredProviders(): IntegrationProvider[] {
  const providers: IntegrationProvider[] = [];

  for (const provider of Object.keys(OAUTH_CONFIGS) as IntegrationProvider[]) {
    if (isProviderConfigured(provider)) {
      providers.push(provider);
    }
  }

  for (const provider of Object.keys(API_CONFIGS) as IntegrationProvider[]) {
    if (!providers.includes(provider) && isProviderConfigured(provider)) {
      providers.push(provider);
    }
  }

  return providers;
}
