import { getIntegrationByProvider, upsertIntegration } from '@/lib/db/queries';
import { BaseIntegration, IntegrationContext } from '../base/BaseIntegration';
import type {
  IntegrationDefinition,
  StandardIngestItem,
  SyncOptions,
  IntegrationTokens,
} from '@/types/integrations';
import { getOAuthConfig } from '@/config/integrations';
import { integrationRegistry } from '../registry';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/integrations/google-calendar/callback';

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  colorId?: string;
}

export function getGoogleAuthUrl(state: string): string {
  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
  ].join(' ');

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID!,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: GOOGLE_REDIRECT_URI,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`Google OAuth error: ${data.error_description || data.error}`);
  }

  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
  };
}

async function refreshGoogleToken(userId: string, refreshToken: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`Google token refresh error: ${data.error}`);
  }

  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);

  await upsertIntegration({
    userId,
    provider: 'google_calendar',
    accessToken: data.access_token,
    refreshToken,
    expiresAt,
  });

  return data.access_token;
}

export async function getGoogleClient(userId: string) {
  const integration = await getIntegrationByProvider(userId, 'google_calendar');

  if (!integration) {
    throw new Error('Google Calendar not connected');
  }

  // Check if token is expired
  let accessToken = integration.accessToken;
  if (integration.expiresAt && new Date() >= integration.expiresAt) {
    if (integration.refreshToken) {
      accessToken = await refreshGoogleToken(userId, integration.refreshToken);
    } else {
      throw new Error('Google Calendar token expired');
    }
  }

  return { accessToken };
}

export async function listCalendarEvents(
  userId: string,
  options?: {
    timeMin?: Date;
    timeMax?: Date;
    maxResults?: number;
  }
): Promise<CalendarEvent[]> {
  const { accessToken } = await getGoogleClient(userId);

  const params = new URLSearchParams({
    orderBy: 'startTime',
    singleEvents: 'true',
    maxResults: String(options?.maxResults || 10),
  });

  if (options?.timeMin) {
    params.set('timeMin', options.timeMin.toISOString());
  }
  if (options?.timeMax) {
    params.set('timeMax', options.timeMax.toISOString());
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data = await response.json();

  if (data.error) {
    throw new Error(`Google Calendar API error: ${data.error.message}`);
  }

  return data.items || [];
}

export async function createCalendarEvent(
  userId: string,
  event: CalendarEvent
): Promise<CalendarEvent> {
  const { accessToken } = await getGoogleClient(userId);

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  const data = await response.json();

  if (data.error) {
    throw new Error(`Google Calendar API error: ${data.error.message}`);
  }

  return data;
}

export async function createFocusTimeBlock(
  userId: string,
  title: string,
  startTime: Date,
  durationMinutes: number,
  description?: string
): Promise<CalendarEvent> {
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + durationMinutes);

  return createCalendarEvent(userId, {
    summary: `Focus Time: ${title}`,
    description: description || 'Focus time blocked by Catalyst Launch',
    start: {
      dateTime: startTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    colorId: '7', // Peacock blue in Google Calendar
  });
}

export async function createMilestoneReminder(
  userId: string,
  milestoneName: string,
  dueDate: Date,
  projectName?: string
): Promise<CalendarEvent> {
  // Create an all-day event for the milestone
  const startOfDay = new Date(dueDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(dueDate);
  endOfDay.setHours(23, 59, 59, 999);

  return createCalendarEvent(userId, {
    summary: `Milestone Due: ${milestoneName}`,
    description: projectName
      ? `Milestone for ${projectName} - Created by Catalyst Launch`
      : 'Milestone reminder from Catalyst Launch',
    start: {
      dateTime: startOfDay.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endOfDay.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    colorId: '11', // Red in Google Calendar
  });
}

export async function saveGoogleCalendarIntegration(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: Date
): Promise<void> {
  await upsertIntegration({
    userId,
    provider: 'google_calendar',
    accessToken,
    refreshToken,
    expiresAt,
  });
}

/**
 * Google Calendar Integration - BaseIntegration implementation
 */
export class GoogleCalendarIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sync milestones and deadlines with Google Calendar.',
    icon: 'calendar',
    category: 'productivity',
    authMethod: 'oauth2',
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
    syncMethod: 'hybrid',
    supportedTypes: ['meeting'],
    defaultSyncInterval: 15,
    features: {
      realtime: false,
      bidirectional: true,
      incrementalSync: true,
      webhooks: true,
    },
    isAvailable: true,
  };

  getAuthorizationUrl(state: string): string {
    const config = getOAuthConfig('google_calendar');
    if (!config) throw new Error('Google Calendar OAuth not configured');

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<IntegrationTokens> {
    const config = getOAuthConfig('google_calendar');
    if (!config) throw new Error('Google Calendar OAuth not configured');

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

    const data = await response.json();

    if (data.error) {
      throw new Error(`Google OAuth error: ${data.error_description || data.error}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<IntegrationTokens> {
    const config = getOAuthConfig('google_calendar');
    if (!config) throw new Error('Google Calendar OAuth not configured');

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

    const data = await response.json();

    if (data.error) {
      throw new Error(`Google token refresh error: ${data.error}`);
    }

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
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1',
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }
      );
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
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return {};
    }

    const data = await response.json();
    return {
      accountName: data.name,
      accountEmail: data.email,
    };
  }

  async sync(
    context: IntegrationContext,
    options?: SyncOptions
  ): Promise<StandardIngestItem[]> {
    const items: StandardIngestItem[] = [];

    const timeMin = options?.since || new Date();
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 1);

    const params = new URLSearchParams({
      orderBy: 'startTime',
      singleEvents: 'true',
      maxResults: String(options?.limit || 50),
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
    });

    const response = await this.fetchWithRetry(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      {
        headers: {
          Authorization: `Bearer ${context.tokens.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.status}`);
    }

    const data = await response.json();
    const events = data.items || [];

    for (const event of events) {
      items.push({
        sourceProvider: 'google_calendar',
        sourceId: event.id,
        sourceUrl: event.htmlLink,
        type: 'meeting',
        title: event.summary || 'Untitled Event',
        content: event.description || '',
        metadata: {
          timestamp: new Date(event.start?.dateTime || event.start?.date),
          createdAt: new Date(event.created),
          updatedAt: new Date(event.updated),
          custom: {
            start: event.start,
            end: event.end,
            location: event.location,
            attendees: event.attendees?.map((a: { email: string }) => a.email),
          },
        },
      });
    }

    return items;
  }
}

// Create and register the integration
const googleCalendarIntegration = new GoogleCalendarIntegration();
integrationRegistry.register(googleCalendarIntegration);

export default googleCalendarIntegration;
