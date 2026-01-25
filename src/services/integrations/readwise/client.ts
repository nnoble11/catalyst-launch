/**
 * Readwise Integration Client
 *
 * Readwise syncs reading highlights from Kindle, web articles, and more.
 *
 * Auth: OAuth2 / Access Token
 * Sync: Webhooks + Pull
 */

import { BaseIntegration, IntegrationContext } from '../base/BaseIntegration';
import type {
  IntegrationDefinition,
  StandardIngestItem,
  SyncOptions,
  IntegrationTokens,
} from '@/types/integrations';
import { getOAuthConfig, getApiConfig } from '@/config/integrations';
import { integrationRegistry } from '../registry';

interface ReadwiseHighlight {
  id: number;
  text: string;
  note: string;
  location: number;
  location_type: string;
  highlighted_at: string;
  url: string | null;
  color: string;
  updated: string;
  book_id: number;
  tags: { id: number; name: string }[];
}

interface ReadwiseBook {
  id: number;
  title: string;
  author: string;
  category: string;
  source: string;
  num_highlights: number;
  last_highlight_at: string;
  updated: string;
  cover_image_url: string;
  highlights_url: string;
  source_url: string | null;
  asin: string;
  tags: { id: number; name: string }[];
}

interface ReadwiseExportResponse {
  count: number;
  nextPageCursor: string | null;
  results: {
    user_book_id: number;
    title: string;
    author: string;
    readable_title: string;
    source: string;
    cover_image_url: string;
    unique_url: string;
    book_tags: { id: number; name: string }[];
    category: string;
    document_note: string;
    readwise_url: string;
    source_url: string;
    asin: string;
    highlights: ReadwiseHighlight[];
  }[];
}

export class ReadwiseIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: 'readwise',
    name: 'Readwise',
    description: 'Sync your reading highlights from Kindle, web articles, and more.',
    icon: 'book-open',
    category: 'knowledge_reading',
    authMethod: 'oauth2',
    syncMethod: 'webhook',
    supportedTypes: ['highlight', 'note', 'article'],
    defaultSyncInterval: 60,
    features: {
      realtime: true,
      bidirectional: false,
      incrementalSync: true,
      webhooks: true,
    },
    isAvailable: true,
  };

  private baseUrl = 'https://readwise.io/api/v2';

  getAuthorizationUrl(state: string): string {
    const config = getOAuthConfig('readwise');
    if (!config) throw new Error('Readwise OAuth not configured');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      state,
    });

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<IntegrationTokens> {
    const config = getOAuthConfig('readwise');
    if (!config) throw new Error('Readwise OAuth not configured');

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
      throw new Error('Failed to exchange code for tokens');
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
    const config = getOAuthConfig('readwise');
    if (!config) throw new Error('Readwise OAuth not configured');

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
      throw new Error('Failed to refresh token');
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

  async validateConnection(tokens: IntegrationTokens): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/auth`, {
        headers: {
          'Authorization': `Token ${tokens.accessToken}`,
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
    const response = await fetch(`${this.baseUrl}/auth`, {
      headers: {
        'Authorization': `Token ${tokens.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Readwise account info');
    }

    const data = await response.json();
    return {
      accountEmail: data.email,
    };
  }

  async sync(
    context: IntegrationContext,
    options?: SyncOptions
  ): Promise<StandardIngestItem[]> {
    const items: StandardIngestItem[] = [];
    let cursor: string | null = options?.cursor ?? null;
    const limit = options?.limit || 100;

    do {
      const response = await this.fetchExport(
        context.tokens.accessToken,
        cursor,
        options?.since
      );

      for (const book of response.results) {
        // Create an item for each book/article
        const articleItem = this.normalizeBook(book);
        items.push(articleItem);

        // Create items for each highlight
        for (const highlight of book.highlights) {
          const highlightItem = this.normalizeHighlight(highlight, book);
          items.push(highlightItem);
        }

        if (items.length >= limit) break;
      }

      cursor = response.nextPageCursor;

      // Respect rate limits
      if (cursor) {
        await this.sleep(100);
      }
    } while (cursor && items.length < limit);

    if (options) {
      options.cursor = cursor ?? undefined;
    }

    return items;
  }

  private async fetchExport(
    accessToken: string,
    cursor: string | null,
    updatedAfter?: Date
  ): Promise<ReadwiseExportResponse> {
    const params = new URLSearchParams();
    if (cursor) {
      params.append('pageCursor', cursor);
    }
    if (updatedAfter) {
      params.append('updatedAfter', updatedAfter.toISOString());
    }

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/export/?${params.toString()}`,
      {
        headers: {
          'Authorization': `Token ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Readwise API error: ${response.status}`);
    }

    return response.json();
  }

  private normalizeBook(book: ReadwiseExportResponse['results'][0]): StandardIngestItem {
    return {
      sourceProvider: 'readwise',
      sourceId: `book_${book.user_book_id}`,
      sourceUrl: book.readwise_url || book.source_url,
      type: 'article',
      title: book.readable_title || book.title,
      content: book.document_note || `${book.title} by ${book.author}`,
      summary: book.document_note,
      metadata: {
        timestamp: new Date(),
        author: book.author,
        tags: book.book_tags.map((t) => t.name),
        custom: {
          source: book.source,
          category: book.category,
          coverImageUrl: book.cover_image_url,
          highlightCount: book.highlights.length,
        },
      },
    };
  }

  private normalizeHighlight(
    highlight: ReadwiseHighlight,
    book: ReadwiseExportResponse['results'][0]
  ): StandardIngestItem {
    let content = highlight.text;
    if (highlight.note) {
      content += `\n\n**Note:** ${highlight.note}`;
    }

    return {
      sourceProvider: 'readwise',
      sourceId: `highlight_${highlight.id}`,
      sourceUrl: highlight.url || book.readwise_url,
      type: 'highlight',
      title: `Highlight from "${book.title}"`,
      content,
      metadata: {
        timestamp: new Date(highlight.highlighted_at),
        updatedAt: new Date(highlight.updated),
        author: book.author,
        tags: highlight.tags.map((t) => t.name),
        custom: {
          bookId: book.user_book_id,
          bookTitle: book.title,
          location: highlight.location,
          locationType: highlight.location_type,
          color: highlight.color,
        },
      },
      processingHints: {
        extractMemories: true,
      },
    };
  }

  async handleWebhook(
    payload: unknown,
    _signature?: string
  ): Promise<StandardIngestItem[]> {
    // Readwise webhook payload contains highlights
    const data = payload as { highlights?: ReadwiseHighlight[] };
    if (!data.highlights) {
      return [];
    }

    return data.highlights.map((highlight) => ({
      sourceProvider: 'readwise',
      sourceId: `highlight_${highlight.id}`,
      sourceUrl: highlight.url || undefined,
      type: 'highlight' as const,
      title: 'New Readwise Highlight',
      content: highlight.text + (highlight.note ? `\n\n**Note:** ${highlight.note}` : ''),
      metadata: {
        timestamp: new Date(highlight.highlighted_at),
        tags: highlight.tags.map((t) => t.name),
      },
      processingHints: {
        extractMemories: true,
      },
    }));
  }
}

// Create and register the integration
const readwiseIntegration = new ReadwiseIntegration();
integrationRegistry.register(readwiseIntegration);

export default readwiseIntegration;
