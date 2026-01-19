/**
 * Todoist Integration Client
 *
 * Todoist is a popular task management app. This integration enables
 * two-way sync of tasks.
 *
 * Auth: OAuth2
 * Sync: Pull + Webhooks
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

interface TodoistTask {
  id: string;
  content: string;
  description: string;
  is_completed: boolean;
  labels: string[];
  priority: number; // 1-4, where 4 is highest
  due: {
    date: string;
    datetime?: string;
    string: string;
    timezone?: string;
    is_recurring: boolean;
  } | null;
  project_id: string;
  section_id: string | null;
  parent_id: string | null;
  order: number;
  created_at: string;
  creator_id: string;
  assignee_id: string | null;
  assigner_id: string | null;
  comment_count: number;
  url: string;
}

interface TodoistProject {
  id: string;
  name: string;
  color: string;
  parent_id: string | null;
  order: number;
  comment_count: number;
  is_shared: boolean;
  is_favorite: boolean;
  is_inbox_project: boolean;
  is_team_inbox: boolean;
  view_style: string;
  url: string;
}

export class TodoistIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: 'todoist',
    name: 'Todoist',
    description: 'Two-way sync with your Todoist tasks and projects.',
    icon: 'check-square',
    category: 'tasks_projects',
    authMethod: 'oauth2',
    scopes: ['data:read_write'],
    syncMethod: 'hybrid',
    supportedTypes: ['task'],
    defaultSyncInterval: 5,
    features: {
      realtime: true,
      bidirectional: true,
      incrementalSync: true,
      webhooks: true,
    },
    isAvailable: true,
  };

  private baseUrl = 'https://api.todoist.com/rest/v2';

  getAuthorizationUrl(state: string): string {
    const config = getOAuthConfig('todoist');
    if (!config) throw new Error('Todoist OAuth not configured');

    const params = new URLSearchParams({
      client_id: config.clientId,
      scope: config.scopes.join(','),
      state,
    });

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<IntegrationTokens> {
    const config = getOAuthConfig('todoist');
    if (!config) throw new Error('Todoist OAuth not configured');

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
      }),
    });

    if (!response.ok) {
      throw new Error('Token exchange failed');
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
    };
  }

  async refreshAccessToken(_refreshToken: string): Promise<IntegrationTokens> {
    // Todoist tokens don't expire, but we can re-auth if needed
    throw new Error('Todoist tokens do not require refresh');
  }

  async validateConnection(tokens: IntegrationTokens): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/projects`, {
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
    // Todoist REST API v2 doesn't have a direct user endpoint
    // We can infer from the sync API or just return minimal info
    const projects = await this.fetchProjects(tokens.accessToken);
    const inboxProject = projects.find((p) => p.is_inbox_project);

    return {
      accountName: 'Todoist User',
      projectCount: projects.length,
      inboxProjectId: inboxProject?.id,
    };
  }

  async sync(
    context: IntegrationContext,
    options?: SyncOptions
  ): Promise<StandardIngestItem[]> {
    const items: StandardIngestItem[] = [];

    // Fetch projects for context
    const projects = await this.fetchProjects(context.tokens.accessToken);
    const projectMap = new Map(projects.map((p) => [p.id, p]));

    // Fetch active tasks
    const tasks = await this.fetchTasks(context.tokens.accessToken);

    for (const task of tasks) {
      const project = projectMap.get(task.project_id);
      items.push(this.normalizeTask(task, project));
    }

    return items;
  }

  private async fetchProjects(accessToken: string): Promise<TodoistProject[]> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/projects`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Todoist API error: ${response.status}`);
    }

    return response.json();
  }

  private async fetchTasks(accessToken: string): Promise<TodoistTask[]> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/tasks`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Todoist API error: ${response.status}`);
    }

    return response.json();
  }

  private normalizeTask(
    task: TodoistTask,
    project?: TodoistProject
  ): StandardIngestItem {
    let content = task.content;
    if (task.description) {
      content += `\n\n${task.description}`;
    }

    // Map Todoist priority (1=normal, 4=urgent) to our priority
    const priorityMap: Record<number, 'low' | 'medium' | 'high'> = {
      1: 'low',
      2: 'medium',
      3: 'medium',
      4: 'high',
    };

    return {
      sourceProvider: 'todoist',
      sourceId: task.id,
      sourceUrl: task.url,
      type: 'task',
      title: task.content,
      content,
      metadata: {
        timestamp: new Date(task.created_at),
        createdAt: new Date(task.created_at),
        tags: task.labels,
        custom: {
          projectId: task.project_id,
          projectName: project?.name,
          sectionId: task.section_id,
          parentId: task.parent_id,
          priority: task.priority,
          isCompleted: task.is_completed,
          dueDate: task.due?.date,
          dueString: task.due?.string,
          isRecurring: task.due?.is_recurring,
          commentCount: task.comment_count,
        },
      },
      processingHints: {
        extractTasks: !task.is_completed,
        priority: priorityMap[task.priority] || 'medium',
      },
    };
  }

  async handleWebhook(
    payload: unknown,
    _signature?: string
  ): Promise<StandardIngestItem[]> {
    const data = payload as {
      event_name: string;
      event_data: TodoistTask;
    };

    if (data.event_name.startsWith('item:')) {
      return [this.normalizeTask(data.event_data)];
    }

    return [];
  }
}

// Create and register the integration
const todoistIntegration = new TodoistIntegration();
integrationRegistry.register(todoistIntegration);

export default todoistIntegration;
