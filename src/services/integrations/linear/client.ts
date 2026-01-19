/**
 * Linear Integration Client
 *
 * Linear is a modern issue tracking tool. This integration syncs
 * issues, projects, and comments.
 *
 * Auth: OAuth2
 * Sync: Webhooks + Pull
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

interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  priority: number;
  state: {
    id: string;
    name: string;
    type: string;
  };
  assignee: {
    id: string;
    name: string;
    email: string;
  } | null;
  creator: {
    id: string;
    name: string;
  };
  labels: {
    nodes: {
      id: string;
      name: string;
      color: string;
    }[];
  };
  project: {
    id: string;
    name: string;
  } | null;
  team: {
    id: string;
    name: string;
    key: string;
  };
  url: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  dueDate: string | null;
}

interface LinearComment {
  id: string;
  body: string;
  user: {
    id: string;
    name: string;
  };
  issue: {
    id: string;
    identifier: string;
    title: string;
  };
  createdAt: string;
  updatedAt: string;
}

export class LinearIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: 'linear',
    name: 'Linear',
    description: 'Sync issues and projects from Linear for seamless project tracking.',
    icon: 'layout-list',
    category: 'tasks_projects',
    authMethod: 'oauth2',
    scopes: ['read', 'write', 'issues:create'],
    syncMethod: 'webhook',
    supportedTypes: ['issue', 'task', 'comment'],
    defaultSyncInterval: 5,
    features: {
      realtime: true,
      bidirectional: true,
      incrementalSync: true,
      webhooks: true,
    },
    isAvailable: true,
  };

  private apiUrl = 'https://api.linear.app/graphql';

  getAuthorizationUrl(state: string): string {
    const config = getOAuthConfig('linear');
    if (!config) throw new Error('Linear OAuth not configured');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(','),
      state,
      prompt: 'consent',
    });

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<IntegrationTokens> {
    const config = getOAuthConfig('linear');
    if (!config) throw new Error('Linear OAuth not configured');

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
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
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
    const config = getOAuthConfig('linear');
    if (!config) throw new Error('Linear OAuth not configured');

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
      const response = await this.graphqlQuery<{ viewer: { id: string } }>(
        tokens.accessToken,
        `query { viewer { id } }`
      );
      return !!response.data?.viewer?.id;
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
    interface AccountResponse {
      viewer: { id: string; name: string; email: string };
      organization: { id: string; name: string };
    }

    const response = await this.graphqlQuery<AccountResponse>(
      tokens.accessToken,
      `query {
        viewer { id name email }
        organization { id name }
      }`
    );

    return {
      accountName: response.data?.viewer?.name,
      accountEmail: response.data?.viewer?.email,
      workspace: response.data?.organization?.name,
      organizationId: response.data?.organization?.id,
    };
  }

  async sync(
    context: IntegrationContext,
    options?: SyncOptions
  ): Promise<StandardIngestItem[]> {
    const items: StandardIngestItem[] = [];
    const limit = options?.limit || 50;

    // Fetch recent issues
    const issues = await this.fetchIssues(
      context.tokens.accessToken,
      limit,
      options?.since
    );

    for (const issue of issues) {
      items.push(this.normalizeIssue(issue));
    }

    return items;
  }

  private async graphqlQuery<T = Record<string, unknown>>(
    accessToken: string,
    query: string,
    variables?: Record<string, unknown>
  ): Promise<{ data: T }> {
    const response = await this.fetchWithRetry(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`Linear API error: ${response.status}`);
    }

    return response.json();
  }

  private async fetchIssues(
    accessToken: string,
    limit: number,
    since?: Date
  ): Promise<LinearIssue[]> {
    const filterClause = since
      ? `filter: { updatedAt: { gte: "${since.toISOString()}" } }`
      : '';

    const response = await this.graphqlQuery(accessToken, `
      query {
        issues(first: ${limit}, ${filterClause}, orderBy: updatedAt) {
          nodes {
            id
            identifier
            title
            description
            priority
            state {
              id
              name
              type
            }
            assignee {
              id
              name
              email
            }
            creator {
              id
              name
            }
            labels {
              nodes {
                id
                name
                color
              }
            }
            project {
              id
              name
            }
            team {
              id
              name
              key
            }
            url
            createdAt
            updatedAt
            completedAt
            dueDate
          }
        }
      }
    `);

    return (response.data?.issues as { nodes: LinearIssue[] })?.nodes || [];
  }

  private normalizeIssue(issue: LinearIssue): StandardIngestItem {
    let content = `**${issue.identifier}**: ${issue.title}\n\n`;

    if (issue.description) {
      content += issue.description;
    }

    content += `\n\n**Status:** ${issue.state.name}`;
    if (issue.assignee) {
      content += `\n**Assignee:** ${issue.assignee.name}`;
    }
    if (issue.project) {
      content += `\n**Project:** ${issue.project.name}`;
    }

    return {
      sourceProvider: 'linear',
      sourceId: issue.id,
      sourceUrl: issue.url,
      type: 'issue',
      title: `${issue.identifier}: ${issue.title}`,
      content,
      metadata: {
        timestamp: new Date(issue.updatedAt),
        createdAt: new Date(issue.createdAt),
        updatedAt: new Date(issue.updatedAt),
        author: issue.creator.name,
        tags: issue.labels.nodes.map((l) => l.name),
        custom: {
          identifier: issue.identifier,
          priority: issue.priority,
          status: issue.state.name,
          statusType: issue.state.type,
          team: issue.team.name,
          teamKey: issue.team.key,
          assignee: issue.assignee?.name,
          assigneeEmail: issue.assignee?.email,
          project: issue.project?.name,
          completedAt: issue.completedAt,
          dueDate: issue.dueDate,
        },
      },
      processingHints: {
        extractTasks: issue.state.type !== 'completed',
        priority: issue.priority <= 1 ? 'high' : issue.priority <= 2 ? 'medium' : 'low',
      },
    };
  }

  async handleWebhook(
    payload: unknown,
    _signature?: string
  ): Promise<StandardIngestItem[]> {
    const data = payload as {
      action: string;
      type: string;
      data: LinearIssue | LinearComment;
    };

    if (data.type === 'Issue') {
      return [this.normalizeIssue(data.data as LinearIssue)];
    }

    if (data.type === 'Comment') {
      const comment = data.data as LinearComment;
      return [{
        sourceProvider: 'linear',
        sourceId: comment.id,
        type: 'comment',
        title: `Comment on ${comment.issue.identifier}`,
        content: comment.body,
        metadata: {
          timestamp: new Date(comment.createdAt),
          author: comment.user.name,
          custom: {
            issueId: comment.issue.id,
            issueIdentifier: comment.issue.identifier,
            issueTitle: comment.issue.title,
          },
        },
      }];
    }

    return [];
  }
}

// Create and register the integration
const linearIntegration = new LinearIntegration();
integrationRegistry.register(linearIntegration);

export default linearIntegration;
