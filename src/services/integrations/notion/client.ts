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

const NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID;
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET;
const NOTION_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/integrations/notion/callback';

export interface NotionPage {
  id: string;
  title: string;
  url: string;
  icon?: string;
}

export function getNotionAuthUrl(state: string): string {
  return `https://api.notion.com/v1/oauth/authorize?client_id=${NOTION_CLIENT_ID}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(NOTION_REDIRECT_URI)}&state=${state}`;
}

export async function exchangeNotionCode(code: string): Promise<{
  accessToken: string;
  workspaceId: string;
  workspaceName: string;
  workspaceIcon?: string;
}> {
  const credentials = Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString('base64');

  const response = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: NOTION_REDIRECT_URI,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`Notion OAuth error: ${data.error}`);
  }

  return {
    accessToken: data.access_token,
    workspaceId: data.workspace_id,
    workspaceName: data.workspace_name,
    workspaceIcon: data.workspace_icon,
  };
}

export async function getNotionClient(userId: string) {
  const integration = await getIntegrationByProvider(userId, 'notion');

  if (!integration) {
    throw new Error('Notion not connected');
  }

  return {
    accessToken: integration.accessToken,
    metadata: integration.metadata as { workspaceId?: string; workspaceName?: string },
  };
}

export async function searchNotionPages(
  userId: string,
  query?: string
): Promise<NotionPage[]> {
  const { accessToken } = await getNotionClient(userId);

  const response = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      query: query || '',
      filter: { property: 'object', value: 'page' },
      page_size: 20,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`Notion API error: ${data.message}`);
  }

  return data.results.map((page: {
    id: string;
    url: string;
    icon?: { type: string; emoji?: string };
    properties: { title?: { title?: { plain_text: string }[] } };
  }) => ({
    id: page.id,
    url: page.url,
    icon: page.icon?.type === 'emoji' ? page.icon.emoji : undefined,
    title: page.properties?.title?.title?.[0]?.plain_text || 'Untitled',
  }));
}

export async function createNotionPage(
  userId: string,
  parentPageId: string,
  title: string,
  content: string
): Promise<NotionPage> {
  const { accessToken } = await getNotionClient(userId);

  // Convert content to Notion blocks
  const blocks = content.split('\n\n').map((paragraph) => ({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [{ type: 'text', text: { content: paragraph } }],
    },
  }));

  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      parent: { page_id: parentPageId },
      properties: {
        title: {
          title: [{ text: { content: title } }],
        },
      },
      children: blocks,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`Notion API error: ${data.message}`);
  }

  return {
    id: data.id,
    url: data.url,
    title,
  };
}

export async function exportDocumentToNotion(
  userId: string,
  parentPageId: string,
  documentTitle: string,
  sections: { title: string; content: string }[]
): Promise<NotionPage> {
  const { accessToken } = await getNotionClient(userId);

  // Build blocks from sections
  const blocks: object[] = [];

  for (const section of sections) {
    // Add section header
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: section.title } }],
      },
    });

    // Add section content as paragraphs
    const paragraphs = section.content.split('\n\n');
    for (const paragraph of paragraphs) {
      if (paragraph.trim()) {
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: paragraph.trim() } }],
          },
        });
      }
    }

    // Add divider between sections
    blocks.push({ object: 'block', type: 'divider', divider: {} });
  }

  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      parent: { page_id: parentPageId },
      properties: {
        title: {
          title: [{ text: { content: documentTitle } }],
        },
      },
      children: blocks.slice(0, 100), // Notion has a 100 block limit per request
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`Notion API error: ${data.message}`);
  }

  return {
    id: data.id,
    url: data.url,
    title: documentTitle,
  };
}

export async function saveNotionIntegration(
  userId: string,
  accessToken: string,
  metadata: { workspaceId: string; workspaceName: string; workspaceIcon?: string }
): Promise<void> {
  await upsertIntegration({
    userId,
    provider: 'notion',
    accessToken,
    metadata,
  });
}

/**
 * Notion Integration - BaseIntegration implementation
 */
export class NotionIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: 'notion',
    name: 'Notion',
    description: 'Export documents and sync databases with Notion.',
    icon: 'file-text',
    category: 'productivity',
    authMethod: 'oauth2',
    scopes: ['read_content', 'update_content'],
    syncMethod: 'pull',
    supportedTypes: ['note', 'document', 'task'],
    defaultSyncInterval: 30,
    features: {
      realtime: false,
      bidirectional: true,
      incrementalSync: true,
      webhooks: false,
    },
    isAvailable: true,
  };

  getAuthorizationUrl(state: string): string {
    const config = getOAuthConfig('notion');
    if (!config) throw new Error('Notion OAuth not configured');

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      owner: 'user',
      state,
    });

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<IntegrationTokens> {
    const config = getOAuthConfig('notion');
    if (!config) throw new Error('Notion OAuth not configured');

    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirectUri,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`Notion OAuth error: ${data.error}`);
    }

    // Note: metadata (workspaceId, workspaceName, etc.) is stored separately via getAccountInfo
    return {
      accessToken: data.access_token,
    };
  }

  async refreshAccessToken(_refreshToken: string): Promise<IntegrationTokens> {
    // Notion tokens don't expire
    throw new Error('Notion tokens do not require refresh');
  }

  async validateConnection(tokens: IntegrationTokens): Promise<boolean> {
    try {
      const response = await fetch('https://api.notion.com/v1/users/me', {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Notion-Version': '2022-06-28',
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
    workspace?: string;
    [key: string]: unknown;
  }> {
    const response = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'Notion-Version': '2022-06-28',
      },
    });

    if (!response.ok) {
      return {};
    }

    const data = await response.json();

    return {
      accountName: data.name,
      botId: data.id,
      type: data.type,
    };
  }

  async sync(
    context: IntegrationContext,
    options?: SyncOptions
  ): Promise<StandardIngestItem[]> {
    const items: StandardIngestItem[] = [];

    const response = await this.fetchWithRetry(
      'https://api.notion.com/v1/search',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${context.tokens.accessToken}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({
          filter: { property: 'object', value: 'page' },
          page_size: options?.limit || 50,
          sort: {
            direction: 'descending',
            timestamp: 'last_edited_time',
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.status}`);
    }

    const data = await response.json();
    const pages = data.results || [];

    for (const page of pages) {
      const title = page.properties?.title?.title?.[0]?.plain_text ||
                    page.properties?.Name?.title?.[0]?.plain_text ||
                    'Untitled';

      items.push({
        sourceProvider: 'notion',
        sourceId: page.id,
        sourceUrl: page.url,
        type: 'document',
        title,
        content: '',
        metadata: {
          timestamp: new Date(page.last_edited_time),
          createdAt: new Date(page.created_time),
          updatedAt: new Date(page.last_edited_time),
          custom: {
            icon: page.icon?.emoji || page.icon?.external?.url,
            cover: page.cover?.external?.url,
          },
        },
      });
    }

    return items;
  }
}

// Create and register the integration
const notionIntegration = new NotionIntegration();
integrationRegistry.register(notionIntegration);

export default notionIntegration;
