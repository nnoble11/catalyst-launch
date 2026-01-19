/**
 * Discord Integration Client
 *
 * Discord integration for capturing messages from servers.
 *
 * Auth: OAuth2 + Bot Token
 * Sync: Webhooks (bot listens for messages)
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

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
}

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

interface DiscordMessage {
  id: string;
  channel_id: string;
  guild_id?: string;
  author: {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
  };
  content: string;
  timestamp: string;
  edited_timestamp: string | null;
  attachments: {
    id: string;
    filename: string;
    url: string;
    size: number;
  }[];
  embeds: {
    title?: string;
    description?: string;
    url?: string;
  }[];
  mentions: DiscordUser[];
  mention_roles: string[];
  pinned: boolean;
  type: number;
}

export class DiscordIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: 'discord',
    name: 'Discord',
    description: 'Capture messages and threads from your Discord servers.',
    icon: 'message-circle',
    category: 'communication',
    authMethod: 'oauth2',
    scopes: ['identify', 'guilds', 'messages.read'],
    syncMethod: 'webhook',
    supportedTypes: ['message'],
    defaultSyncInterval: 0, // Real-time only
    features: {
      realtime: true,
      bidirectional: false,
      incrementalSync: false,
      webhooks: true,
    },
    isAvailable: true,
  };

  private baseUrl = 'https://discord.com/api/v10';

  getAuthorizationUrl(state: string): string {
    const config = getOAuthConfig('discord');
    if (!config) throw new Error('Discord OAuth not configured');

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
    });

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<IntegrationTokens> {
    const config = getOAuthConfig('discord');
    if (!config) throw new Error('Discord OAuth not configured');

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
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
    const config = getOAuthConfig('discord');
    if (!config) throw new Error('Discord OAuth not configured');

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
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
      const response = await fetch(`${this.baseUrl}/users/@me`, {
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
    const userResponse = await fetch(`${this.baseUrl}/users/@me`, {
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch Discord user info');
    }

    const user: DiscordUser = await userResponse.json();

    // Fetch guilds
    const guildsResponse = await fetch(`${this.baseUrl}/users/@me/guilds`, {
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
      },
    });

    const guilds: DiscordGuild[] = guildsResponse.ok
      ? await guildsResponse.json()
      : [];

    return {
      accountName: `${user.username}#${user.discriminator}`,
      accountEmail: user.email,
      userId: user.id,
      avatar: user.avatar,
      guildCount: guilds.length,
      guilds: guilds.map((g) => ({ id: g.id, name: g.name })),
    };
  }

  async sync(
    _context: IntegrationContext,
    _options?: SyncOptions
  ): Promise<StandardIngestItem[]> {
    // Discord sync is primarily webhook-based
    // Pull sync would require reading message history which needs bot permissions
    return [];
  }

  async handleWebhook(
    payload: unknown,
    _signature?: string
  ): Promise<StandardIngestItem[]> {
    const data = payload as {
      t: string; // Event type
      d: DiscordMessage; // Event data
    };

    if (data.t === 'MESSAGE_CREATE') {
      return [this.normalizeMessage(data.d)];
    }

    return [];
  }

  private normalizeMessage(message: DiscordMessage): StandardIngestItem {
    let content = message.content;

    // Add attachment info
    if (message.attachments.length > 0) {
      content += '\n\n**Attachments:**\n';
      for (const attachment of message.attachments) {
        content += `- [${attachment.filename}](${attachment.url})\n`;
      }
    }

    // Add embed info
    for (const embed of message.embeds) {
      if (embed.title || embed.description) {
        content += `\n\n**Embed:** ${embed.title || ''}\n${embed.description || ''}`;
        if (embed.url) {
          content += `\n[Link](${embed.url})`;
        }
      }
    }

    return {
      sourceProvider: 'discord',
      sourceId: message.id,
      type: 'message',
      title: `Message from ${message.author.username}`,
      content,
      metadata: {
        timestamp: new Date(message.timestamp),
        updatedAt: message.edited_timestamp
          ? new Date(message.edited_timestamp)
          : undefined,
        author: message.author.username,
        authorId: message.author.id,
        custom: {
          channelId: message.channel_id,
          guildId: message.guild_id,
          pinned: message.pinned,
          attachmentCount: message.attachments.length,
          mentionCount: message.mentions.length,
        },
      },
      processingHints: {
        extractMemories: message.pinned,
        extractTasks: content.toLowerCase().includes('todo') ||
                      content.toLowerCase().includes('action item'),
      },
    };
  }
}

// Create and register the integration
const discordIntegration = new DiscordIntegration();
integrationRegistry.register(discordIntegration);

export default discordIntegration;
