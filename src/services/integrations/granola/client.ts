/**
 * Granola Integration Client
 *
 * Granola is an AI-powered meeting notes service. This integration
 * syncs meeting transcripts and notes from Granola.
 *
 * Auth: API Key based
 * Sync: Pull (polling every 5 minutes)
 */

import { ApiKeyIntegration, IntegrationContext } from '../base/BaseIntegration';
import type {
  IntegrationDefinition,
  StandardIngestItem,
  SyncOptions,
  IntegrationTokens,
} from '@/types/integrations';
import { getApiConfig } from '@/config/integrations';
import { integrationRegistry } from '../registry';

interface GranolaMeeting {
  id: string;
  title: string;
  date: string;
  duration: number;
  participants: string[];
  transcript?: string;
  summary?: string;
  notes?: string;
  action_items?: string[];
  tags?: string[];
  created_at: string;
  updated_at: string;
}

interface GranolaListResponse {
  meetings: GranolaMeeting[];
  has_more: boolean;
  cursor?: string;
}

export class GranolaIntegration extends ApiKeyIntegration {
  readonly definition: IntegrationDefinition = {
    id: 'granola',
    name: 'Granola',
    description: 'AI-powered meeting notes. Automatically capture and summarize your meetings.',
    icon: 'brain',
    category: 'meetings_notes',
    authMethod: 'api_key',
    syncMethod: 'pull',
    supportedTypes: ['meeting', 'note'],
    defaultSyncInterval: 5,
    features: {
      realtime: false,
      bidirectional: false,
      incrementalSync: true,
      webhooks: false,
    },
    isAvailable: true,
  };

  private baseUrl: string;

  constructor() {
    super();
    const config = getApiConfig('granola');
    this.baseUrl = config?.baseUrl || 'https://api.granola.so/v1';
  }

  /**
   * Validate API key by making a test request
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get account info for display
   */
  async getAccountInfo(tokens: IntegrationTokens): Promise<{
    accountName?: string;
    accountEmail?: string;
    [key: string]: unknown;
  }> {
    const response = await fetch(`${this.baseUrl}/user`, {
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Granola account info');
    }

    const data = await response.json();
    return {
      accountName: data.name,
      accountEmail: data.email,
      plan: data.plan,
    };
  }

  /**
   * Sync meetings from Granola
   */
  async sync(
    context: IntegrationContext,
    options?: SyncOptions
  ): Promise<StandardIngestItem[]> {
    const items: StandardIngestItem[] = [];
    let cursor: string | undefined;
    let hasMore = true;
    const limit = options?.limit || 50;

    while (hasMore && items.length < limit) {
      const meetings = await this.fetchMeetings(
        context.tokens.accessToken,
        cursor,
        Math.min(20, limit - items.length),
        options?.since
      );

      for (const meeting of meetings.meetings) {
        const ingestItem = this.normalizeMeeting(meeting);
        items.push(ingestItem);
      }

      hasMore = meetings.has_more;
      cursor = meetings.cursor;

      // Respect rate limits
      if (hasMore) {
        await this.sleep(100);
      }
    }

    return items;
  }

  /**
   * Fetch meetings from Granola API
   */
  private async fetchMeetings(
    apiKey: string,
    cursor?: string,
    limit = 20,
    since?: Date
  ): Promise<GranolaListResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    if (cursor) {
      params.append('cursor', cursor);
    }

    if (since) {
      params.append('since', since.toISOString());
    }

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/meetings?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Granola API error: ${error}`);
    }

    return response.json();
  }

  /**
   * Normalize Granola meeting to StandardIngestItem
   */
  private normalizeMeeting(meeting: GranolaMeeting): StandardIngestItem {
    // Build content from available fields
    const contentParts: string[] = [];

    if (meeting.summary) {
      contentParts.push(`## Summary\n${meeting.summary}`);
    }

    if (meeting.notes) {
      contentParts.push(`## Notes\n${meeting.notes}`);
    }

    if (meeting.action_items && meeting.action_items.length > 0) {
      contentParts.push(
        `## Action Items\n${meeting.action_items.map((item) => `- ${item}`).join('\n')}`
      );
    }

    if (meeting.transcript) {
      // Include a truncated transcript for context
      const truncatedTranscript = meeting.transcript.length > 2000
        ? meeting.transcript.substring(0, 2000) + '...'
        : meeting.transcript;
      contentParts.push(`## Transcript\n${truncatedTranscript}`);
    }

    const content = contentParts.join('\n\n');

    return {
      sourceProvider: 'granola',
      sourceId: meeting.id,
      type: 'meeting',
      title: meeting.title,
      content,
      summary: meeting.summary,
      rawContent: meeting.transcript,
      metadata: {
        timestamp: new Date(meeting.date),
        createdAt: new Date(meeting.created_at),
        updatedAt: new Date(meeting.updated_at),
        tags: meeting.tags,
        custom: {
          duration: meeting.duration,
          participants: meeting.participants,
          actionItems: meeting.action_items,
        },
      },
      processingHints: {
        extractTasks: (meeting.action_items?.length ?? 0) > 0,
        extractMemories: true,
      },
    };
  }
}

// Create and register the integration
const granolaIntegration = new GranolaIntegration();
integrationRegistry.register(granolaIntegration);

export default granolaIntegration;
