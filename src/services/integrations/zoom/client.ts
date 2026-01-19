/**
 * Zoom Integration Client
 *
 * Zoom integration for importing meeting recordings and transcripts.
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

interface ZoomMeeting {
  uuid: string;
  id: number;
  host_id: string;
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  timezone: string;
  total_size: number;
  recording_count: number;
  share_url?: string;
  recording_files: {
    id: string;
    meeting_id: string;
    recording_start: string;
    recording_end: string;
    file_type: string;
    file_extension: string;
    file_size: number;
    play_url?: string;
    download_url?: string;
    status: string;
    recording_type: string;
  }[];
  participant_audio_files?: {
    id: string;
    recording_start: string;
    recording_end: string;
    file_name: string;
    file_type: string;
    file_extension: string;
    file_size: number;
    download_url: string;
    status: string;
  }[];
}

interface ZoomRecordingsResponse {
  from: string;
  to: string;
  page_size: number;
  total_records: number;
  next_page_token: string;
  meetings: ZoomMeeting[];
}

interface ZoomUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  type: number;
  role_name: string;
  pmi: number;
  timezone: string;
  account_id: string;
  account_number: number;
}

export class ZoomIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: 'zoom',
    name: 'Zoom',
    description: 'Import meeting recordings and transcripts from Zoom.',
    icon: 'video',
    category: 'meetings_notes',
    authMethod: 'oauth2',
    scopes: ['recording:read', 'user:read'],
    syncMethod: 'pull',
    supportedTypes: ['meeting'],
    defaultSyncInterval: 30,
    features: {
      realtime: false,
      bidirectional: false,
      incrementalSync: true,
      webhooks: true,
    },
    isAvailable: true,
  };

  private baseUrl = 'https://api.zoom.us/v2';

  getAuthorizationUrl(state: string): string {
    const config = getOAuthConfig('zoom');
    if (!config) throw new Error('Zoom OAuth not configured');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      state,
    });

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<IntegrationTokens> {
    const config = getOAuthConfig('zoom');
    if (!config) throw new Error('Zoom OAuth not configured');

    const credentials = Buffer.from(
      `${config.clientId}:${config.clientSecret}`
    ).toString('base64');

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
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
    const config = getOAuthConfig('zoom');
    if (!config) throw new Error('Zoom OAuth not configured');

    const credentials = Buffer.from(
      `${config.clientId}:${config.clientSecret}`
    ).toString('base64');

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
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
      const response = await fetch(`${this.baseUrl}/users/me`, {
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
    const response = await fetch(`${this.baseUrl}/users/me`, {
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Zoom user info');
    }

    const user: ZoomUser = await response.json();
    return {
      accountName: `${user.first_name} ${user.last_name}`,
      accountEmail: user.email,
      userId: user.id,
      accountId: user.account_id,
      timezone: user.timezone,
    };
  }

  async sync(
    context: IntegrationContext,
    options?: SyncOptions
  ): Promise<StandardIngestItem[]> {
    const items: StandardIngestItem[] = [];
    const limit = options?.limit || 30;

    // Get date range (last 30 days by default)
    const to = new Date();
    const from = options?.since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const recordings = await this.fetchRecordings(
      context.tokens.accessToken,
      from,
      to,
      limit
    );

    for (const meeting of recordings) {
      items.push(this.normalizeMeeting(meeting));
    }

    return items;
  }

  private async fetchRecordings(
    accessToken: string,
    from: Date,
    to: Date,
    pageSize: number
  ): Promise<ZoomMeeting[]> {
    const params = new URLSearchParams({
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
      page_size: pageSize.toString(),
    });

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/users/me/recordings?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Zoom API error: ${response.status}`);
    }

    const data: ZoomRecordingsResponse = await response.json();
    return data.meetings || [];
  }

  private normalizeMeeting(meeting: ZoomMeeting): StandardIngestItem {
    // Build content from available information
    const contentParts: string[] = [];

    contentParts.push(`**Meeting:** ${meeting.topic}`);
    contentParts.push(`**Duration:** ${meeting.duration} minutes`);
    contentParts.push(`**Date:** ${new Date(meeting.start_time).toLocaleString()}`);

    // List recordings
    if (meeting.recording_files.length > 0) {
      contentParts.push('\n**Recordings:**');
      for (const file of meeting.recording_files) {
        const typeLabel = this.getRecordingTypeLabel(file.recording_type);
        contentParts.push(`- ${typeLabel} (${file.file_extension})`);
      }
    }

    // Add share URL if available
    if (meeting.share_url) {
      contentParts.push(`\n[View Recording](${meeting.share_url})`);
    }

    const content = contentParts.join('\n');

    // Find transcript file if available
    const transcriptFile = meeting.recording_files.find(
      (f) => f.recording_type === 'audio_transcript' || f.file_type === 'TRANSCRIPT'
    );

    return {
      sourceProvider: 'zoom',
      sourceId: meeting.uuid,
      sourceUrl: meeting.share_url,
      type: 'meeting',
      title: meeting.topic,
      content,
      metadata: {
        timestamp: new Date(meeting.start_time),
        custom: {
          meetingId: meeting.id,
          hostId: meeting.host_id,
          duration: meeting.duration,
          timezone: meeting.timezone,
          recordingCount: meeting.recording_count,
          totalSize: meeting.total_size,
          hasTranscript: !!transcriptFile,
          recordingTypes: meeting.recording_files.map((f) => f.recording_type),
        },
      },
      processingHints: {
        extractMemories: true,
        extractTasks: true,
      },
    };
  }

  private getRecordingTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      shared_screen_with_speaker_view: 'Shared Screen with Speaker',
      shared_screen_with_gallery_view: 'Shared Screen with Gallery',
      shared_screen: 'Shared Screen',
      speaker_view: 'Speaker View',
      gallery_view: 'Gallery View',
      audio_only: 'Audio Only',
      audio_transcript: 'Transcript',
      chat_file: 'Chat',
      timeline: 'Timeline',
    };
    return labels[type] || type;
  }

  async handleWebhook(
    payload: unknown,
    _signature?: string
  ): Promise<StandardIngestItem[]> {
    const data = payload as {
      event: string;
      payload: {
        object: ZoomMeeting;
      };
    };

    if (data.event === 'recording.completed') {
      return [this.normalizeMeeting(data.payload.object)];
    }

    return [];
  }
}

// Create and register the integration
const zoomIntegration = new ZoomIntegration();
integrationRegistry.register(zoomIntegration);

export default zoomIntegration;
