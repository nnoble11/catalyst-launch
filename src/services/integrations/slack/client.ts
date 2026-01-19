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

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const SLACK_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/integrations/slack/callback';

export interface SlackUser {
  id: string;
  teamId: string;
  name: string;
  realName?: string;
  email?: string;
}

export interface SlackMessage {
  channel: string;
  text: string;
  blocks?: object[];
}

export function getSlackAuthUrl(state: string): string {
  const scopes = [
    'chat:write',
    'commands',
    'users:read',
    'users:read.email',
    'channels:read',
    'im:write',
  ].join(',');

  return `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=${scopes}&redirect_uri=${encodeURIComponent(SLACK_REDIRECT_URI)}&state=${state}`;
}

export async function exchangeSlackCode(code: string): Promise<{
  accessToken: string;
  teamId: string;
  teamName: string;
  userId: string;
}> {
  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: SLACK_CLIENT_ID!,
      client_secret: SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: SLACK_REDIRECT_URI,
    }),
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Slack OAuth error: ${data.error}`);
  }

  return {
    accessToken: data.access_token,
    teamId: data.team.id,
    teamName: data.team.name,
    userId: data.authed_user.id,
  };
}

export async function getSlackClient(userId: string) {
  const integration = await getIntegrationByProvider(userId, 'slack');

  if (!integration) {
    throw new Error('Slack not connected');
  }

  return {
    accessToken: integration.accessToken,
    metadata: integration.metadata as { teamId?: string; teamName?: string; slackUserId?: string },
  };
}

export async function sendSlackMessage(
  userId: string,
  channel: string,
  text: string,
  blocks?: object[]
): Promise<void> {
  const { accessToken } = await getSlackClient(userId);

  const body: SlackMessage = { channel, text };
  if (blocks) {
    body.blocks = blocks;
  }

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }
}

export async function sendSlackDM(
  userId: string,
  slackUserId: string,
  text: string
): Promise<void> {
  const { accessToken } = await getSlackClient(userId);

  // Open DM channel
  const openResponse = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ users: slackUserId }),
  });

  const openData = await openResponse.json();
  if (!openData.ok) {
    throw new Error(`Failed to open DM: ${openData.error}`);
  }

  await sendSlackMessage(userId, openData.channel.id, text);
}

export async function saveSlackIntegration(
  userId: string,
  accessToken: string,
  metadata: { teamId: string; teamName: string; slackUserId: string }
): Promise<void> {
  await upsertIntegration({
    userId,
    provider: 'slack',
    accessToken,
    metadata,
  });
}

/**
 * Slack Integration - BaseIntegration implementation
 */
export class SlackIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: 'slack',
    name: 'Slack',
    description: 'Get notifications and capture important messages from Slack.',
    icon: 'message-square',
    category: 'communication',
    authMethod: 'oauth2',
    scopes: ['chat:write', 'commands', 'users:read'],
    syncMethod: 'webhook',
    supportedTypes: ['message'],
    defaultSyncInterval: 0,
    features: {
      realtime: true,
      bidirectional: true,
      incrementalSync: false,
      webhooks: true,
    },
    isAvailable: true,
  };

  getAuthorizationUrl(state: string): string {
    const config = getOAuthConfig('slack');
    if (!config) throw new Error('Slack OAuth not configured');

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(','),
      state,
    });

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<IntegrationTokens> {
    const config = getOAuthConfig('slack');
    if (!config) throw new Error('Slack OAuth not configured');

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Slack OAuth error: ${data.error}`);
    }

    // Note: metadata (teamId, teamName, slackUserId) is stored separately via getAccountInfo
    return {
      accessToken: data.access_token,
    };
  }

  async refreshAccessToken(_refreshToken: string): Promise<IntegrationTokens> {
    // Slack tokens don't expire
    throw new Error('Slack tokens do not require refresh');
  }

  async validateConnection(tokens: IntegrationTokens): Promise<boolean> {
    try {
      const response = await fetch('https://slack.com/api/auth.test', {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      });
      const data = await response.json();
      return data.ok === true;
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
    const response = await fetch('https://slack.com/api/auth.test', {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    const data = await response.json();

    if (!data.ok) {
      return {};
    }

    return {
      accountName: data.user,
      workspace: data.team,
      teamId: data.team_id,
      userId: data.user_id,
    };
  }

  async sync(
    _context: IntegrationContext,
    _options?: SyncOptions
  ): Promise<StandardIngestItem[]> {
    // Slack uses webhooks for real-time sync, not polling
    return [];
  }
}

// Create and register the integration
const slackIntegration = new SlackIntegration();
integrationRegistry.register(slackIntegration);

export default slackIntegration;
