/**
 * Pocket Integration Client
 *
 * Pocket is a read-later service. This integration syncs saved articles.
 *
 * Auth: OAuth2 (Pocket-specific flow)
 * Sync: Pull
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

interface PocketItem {
  item_id: string;
  resolved_id: string;
  given_url: string;
  given_title: string;
  resolved_url: string;
  resolved_title: string;
  excerpt: string;
  word_count: string;
  is_article: string;
  is_index: string;
  has_image: string;
  has_video: string;
  favorite: string;
  status: string; // 0=unread, 1=archived, 2=deleted
  time_added: string;
  time_updated: string;
  time_read: string;
  time_favorited: string;
  tags?: Record<string, { item_id: string; tag: string }>;
  authors?: Record<string, { item_id: string; author_id: string; name: string }>;
  image?: { item_id: string; src: string; width: string; height: string };
}

interface PocketGetResponse {
  status: number;
  list: Record<string, PocketItem>;
  since: number;
}

export class PocketIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: 'pocket',
    name: 'Pocket',
    description: 'Import your saved articles and reading list from Pocket.',
    icon: 'bookmark',
    category: 'knowledge_reading',
    authMethod: 'oauth2',
    syncMethod: 'pull',
    supportedTypes: ['article', 'bookmark'],
    defaultSyncInterval: 30,
    features: {
      realtime: false,
      bidirectional: false,
      incrementalSync: true,
      webhooks: false,
    },
    isAvailable: true,
  };

  private baseUrl = 'https://getpocket.com/v3';

  getAuthorizationUrl(state: string): string {
    // Pocket uses a custom OAuth flow
    // First, we need to get a request token, then redirect
    // For simplicity, we'll use the consumer key approach
    const config = getOAuthConfig('pocket');
    if (!config) throw new Error('Pocket OAuth not configured');

    const redirectUri = `${config.redirectUri}?state=${state}`;
    return `https://getpocket.com/auth/authorize?request_token=REQUEST_TOKEN&redirect_uri=${encodeURIComponent(redirectUri)}`;
  }

  async exchangeCodeForTokens(code: string): Promise<IntegrationTokens> {
    const config = getOAuthConfig('pocket');
    if (!config) throw new Error('Pocket OAuth not configured');

    const response = await fetch(`${this.baseUrl}/oauth/authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Accept': 'application/json',
      },
      body: JSON.stringify({
        consumer_key: config.clientId,
        code,
      }),
    });

    if (!response.ok) {
      throw new Error('Token exchange failed');
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
    };
  }

  async refreshAccessToken(_refreshToken: string): Promise<IntegrationTokens> {
    // Pocket tokens don't expire
    throw new Error('Pocket tokens do not require refresh');
  }

  async validateConnection(tokens: IntegrationTokens): Promise<boolean> {
    try {
      const config = getOAuthConfig('pocket');
      if (!config) return false;

      const response = await fetch(`${this.baseUrl}/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Accept': 'application/json',
        },
        body: JSON.stringify({
          consumer_key: config.clientId,
          access_token: tokens.accessToken,
          count: 1,
        }),
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
    // Pocket API doesn't provide user info directly
    return {
      accountName: 'Pocket User',
    };
  }

  async sync(
    context: IntegrationContext,
    options?: SyncOptions
  ): Promise<StandardIngestItem[]> {
    const config = getOAuthConfig('pocket');
    if (!config) throw new Error('Pocket OAuth not configured');

    const items: StandardIngestItem[] = [];
    const limit = options?.limit || 50;

    const params: Record<string, unknown> = {
      consumer_key: config.clientId,
      access_token: context.tokens.accessToken,
      count: limit,
      detailType: 'complete',
      sort: 'newest',
    };

    if (options?.since) {
      params.since = Math.floor(options.since.getTime() / 1000);
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Accept': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Pocket API error: ${response.status}`);
    }

    const data: PocketGetResponse = await response.json();

    for (const item of Object.values(data.list)) {
      items.push(this.normalizeItem(item));
    }

    return items;
  }

  private normalizeItem(item: PocketItem): StandardIngestItem {
    const title = item.resolved_title || item.given_title || 'Untitled';
    const url = item.resolved_url || item.given_url;
    const tags = item.tags ? Object.values(item.tags).map((t) => t.tag) : [];
    const authors = item.authors
      ? Object.values(item.authors).map((a) => a.name)
      : [];

    let content = item.excerpt || '';
    if (authors.length > 0) {
      content = `**By:** ${authors.join(', ')}\n\n${content}`;
    }
    content += `\n\n[Read full article](${url})`;

    return {
      sourceProvider: 'pocket',
      sourceId: item.item_id,
      sourceUrl: url,
      type: item.is_article === '1' ? 'article' : 'bookmark',
      title,
      content,
      summary: item.excerpt,
      metadata: {
        timestamp: new Date(parseInt(item.time_added) * 1000),
        updatedAt: new Date(parseInt(item.time_updated) * 1000),
        author: authors[0],
        tags,
        custom: {
          wordCount: parseInt(item.word_count) || 0,
          hasImage: item.has_image === '1',
          hasVideo: item.has_video === '1',
          isFavorite: item.favorite === '1',
          status: item.status,
          imageUrl: item.image?.src,
        },
      },
      processingHints: {
        extractMemories: item.favorite === '1',
      },
    };
  }
}

// Create and register the integration
const pocketIntegration = new PocketIntegration();
integrationRegistry.register(pocketIntegration);

export default pocketIntegration;
