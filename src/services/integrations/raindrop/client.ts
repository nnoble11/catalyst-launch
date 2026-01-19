/**
 * Raindrop.io Integration Client
 *
 * Raindrop is a bookmark manager. This integration syncs bookmarks and collections.
 *
 * Auth: OAuth2
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

interface RaindropItem {
  _id: number;
  link: string;
  title: string;
  excerpt: string;
  note: string;
  type: string;
  cover: string;
  tags: string[];
  important: boolean;
  created: string;
  lastUpdate: string;
  domain: string;
  collection: {
    $id: number;
  };
  highlights: {
    _id: string;
    text: string;
    note: string;
    color: string;
    created: string;
  }[];
}

interface RaindropCollection {
  _id: number;
  title: string;
  count: number;
  parent: { $id: number } | null;
  cover: string[];
  created: string;
  lastUpdate: string;
}

interface RaindropListResponse {
  result: boolean;
  items: RaindropItem[];
  count: number;
}

export class RaindropIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: 'raindrop',
    name: 'Raindrop.io',
    description: 'Sync your bookmarks and collections from Raindrop.',
    icon: 'cloud-rain',
    category: 'knowledge_reading',
    authMethod: 'oauth2',
    syncMethod: 'pull',
    supportedTypes: ['bookmark', 'article'],
    defaultSyncInterval: 30,
    features: {
      realtime: false,
      bidirectional: false,
      incrementalSync: true,
      webhooks: false,
    },
    isAvailable: true,
  };

  private baseUrl = 'https://api.raindrop.io/rest/v1';

  getAuthorizationUrl(state: string): string {
    const config = getOAuthConfig('raindrop');
    if (!config) throw new Error('Raindrop OAuth not configured');

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      state,
    });

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<IntegrationTokens> {
    const config = getOAuthConfig('raindrop');
    if (!config) throw new Error('Raindrop OAuth not configured');

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
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
    const config = getOAuthConfig('raindrop');
    if (!config) throw new Error('Raindrop OAuth not configured');

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
      const response = await fetch(`${this.baseUrl}/user`, {
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
    const response = await fetch(`${this.baseUrl}/user`, {
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Raindrop user info');
    }

    const data = await response.json();
    return {
      accountName: data.user?.fullName,
      accountEmail: data.user?.email,
      pro: data.user?.pro,
    };
  }

  async sync(
    context: IntegrationContext,
    options?: SyncOptions
  ): Promise<StandardIngestItem[]> {
    const items: StandardIngestItem[] = [];
    const limit = options?.limit || 50;

    // Fetch collections for context
    const collections = await this.fetchCollections(context.tokens.accessToken);
    const collectionMap = new Map(collections.map((c) => [c._id, c]));

    // Fetch all bookmarks (collectionId 0 means all)
    const bookmarks = await this.fetchRaindrops(
      context.tokens.accessToken,
      0,
      limit
    );

    for (const bookmark of bookmarks) {
      const collection = collectionMap.get(bookmark.collection.$id);
      items.push(this.normalizeRaindrop(bookmark, collection));

      // Also add highlights as separate items
      for (const highlight of bookmark.highlights || []) {
        items.push(this.normalizeHighlight(highlight, bookmark));
      }
    }

    return items;
  }

  private async fetchCollections(
    accessToken: string
  ): Promise<RaindropCollection[]> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/collections`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Raindrop API error: ${response.status}`);
    }

    const data = await response.json();
    return data.items || [];
  }

  private async fetchRaindrops(
    accessToken: string,
    collectionId: number,
    limit: number
  ): Promise<RaindropItem[]> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/raindrops/${collectionId}?perpage=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Raindrop API error: ${response.status}`);
    }

    const data: RaindropListResponse = await response.json();
    return data.items || [];
  }

  private normalizeRaindrop(
    item: RaindropItem,
    collection?: RaindropCollection
  ): StandardIngestItem {
    let content = item.excerpt || '';
    if (item.note) {
      content = `**Note:** ${item.note}\n\n${content}`;
    }
    content += `\n\n[View bookmark](${item.link})`;

    return {
      sourceProvider: 'raindrop',
      sourceId: item._id.toString(),
      sourceUrl: item.link,
      type: item.type === 'article' ? 'article' : 'bookmark',
      title: item.title,
      content,
      summary: item.excerpt,
      metadata: {
        timestamp: new Date(item.created),
        updatedAt: new Date(item.lastUpdate),
        tags: item.tags,
        custom: {
          domain: item.domain,
          type: item.type,
          important: item.important,
          collectionId: item.collection.$id,
          collectionName: collection?.title,
          coverImage: item.cover,
          highlightCount: item.highlights?.length || 0,
        },
      },
      processingHints: {
        extractMemories: item.important,
      },
    };
  }

  private normalizeHighlight(
    highlight: RaindropItem['highlights'][0],
    bookmark: RaindropItem
  ): StandardIngestItem {
    let content = highlight.text;
    if (highlight.note) {
      content += `\n\n**Note:** ${highlight.note}`;
    }

    return {
      sourceProvider: 'raindrop',
      sourceId: `highlight_${highlight._id}`,
      sourceUrl: bookmark.link,
      type: 'highlight',
      title: `Highlight from "${bookmark.title}"`,
      content,
      metadata: {
        timestamp: new Date(highlight.created),
        custom: {
          bookmarkId: bookmark._id,
          bookmarkTitle: bookmark.title,
          color: highlight.color,
        },
      },
      processingHints: {
        extractMemories: true,
      },
    };
  }
}

// Create and register the integration
const raindropIntegration = new RaindropIntegration();
integrationRegistry.register(raindropIntegration);

export default raindropIntegration;
