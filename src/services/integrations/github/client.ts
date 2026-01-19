/**
 * GitHub Integration Client
 *
 * GitHub integration for monitoring repository activity including
 * commits, pull requests, issues, and releases.
 *
 * Auth: OAuth2 (tokens don't expire)
 * Sync: Webhooks + Pull-based fallback
 */

import { BaseIntegration, IntegrationContext } from '../base/BaseIntegration';
import type {
  IntegrationDefinition,
  StandardIngestItem,
  SyncOptions,
  IntegrationTokens,
} from '@/types/integrations';
import { getOAuthConfig, WEBHOOK_SECRETS } from '@/config/integrations';
import { integrationRegistry } from '../registry';
import crypto from 'crypto';

// GitHub API Types
interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  owner: {
    login: string;
    id: number;
  };
}

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  html_url: string;
  author: GitHubUser | null;
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
  }>;
}

interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
  user: GitHubUser;
  labels: Array<{
    id: number;
    name: string;
    color: string;
  }>;
  merged: boolean;
  merged_at: string | null;
  created_at: string;
  updated_at: string;
  additions: number;
  deletions: number;
  changed_files: number;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
}

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
  user: GitHubUser;
  labels: Array<{
    id: number;
    name: string;
    color: string;
  }>;
  assignees: GitHubUser[];
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  author: GitHubUser;
  created_at: string;
  published_at: string;
  prerelease: boolean;
  draft: boolean;
}

interface GitHubComment {
  id: number;
  body: string;
  html_url: string;
  user: GitHubUser;
  created_at: string;
  updated_at: string;
}

// Webhook payload types
interface GitHubWebhookPayload {
  action?: string;
  sender: GitHubUser;
  repository: GitHubRepository;
}

interface GitHubPushPayload extends GitHubWebhookPayload {
  ref: string;
  commits: Array<{
    id: string;
    message: string;
    timestamp: string;
    author: {
      name: string;
      email: string;
      username: string;
    };
    url: string;
    added: string[];
    removed: string[];
    modified: string[];
  }>;
  head_commit: {
    id: string;
    message: string;
    timestamp: string;
    author: {
      name: string;
      email: string;
      username: string;
    };
  } | null;
}

interface GitHubPRPayload extends GitHubWebhookPayload {
  action: string;
  pull_request: GitHubPullRequest;
}

interface GitHubIssuePayload extends GitHubWebhookPayload {
  action: string;
  issue: GitHubIssue;
}

interface GitHubReleasePayload extends GitHubWebhookPayload {
  action: string;
  release: GitHubRelease;
}

interface GitHubCommentPayload extends GitHubWebhookPayload {
  action: string;
  comment: GitHubComment;
  issue?: GitHubIssue;
  pull_request?: GitHubPullRequest;
}

export class GitHubIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: 'github',
    name: 'GitHub',
    description: 'Monitor repository activity, commits, PRs, and releases.',
    icon: 'github',
    category: 'tasks_projects',
    authMethod: 'oauth2',
    scopes: ['repo', 'read:user'],
    syncMethod: 'webhook',
    supportedTypes: ['issue', 'note', 'comment', 'document'],
    defaultSyncInterval: 15,
    features: {
      realtime: true,
      bidirectional: false,
      incrementalSync: true,
      webhooks: true,
    },
    isAvailable: true,
  };

  private apiUrl = 'https://api.github.com';

  getAuthorizationUrl(state: string): string {
    const config = getOAuthConfig('github');
    if (!config) throw new Error('GitHub OAuth not configured');

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(' '),
      state,
    });

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<IntegrationTokens> {
    const config = getOAuthConfig('github');
    if (!config) throw new Error('GitHub OAuth not configured');

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
    }

    // GitHub tokens don't expire by default
    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  async refreshAccessToken(_refreshToken: string): Promise<IntegrationTokens> {
    // GitHub OAuth tokens don't expire and can't be refreshed
    throw new Error('GitHub OAuth tokens do not expire and cannot be refreshed');
  }

  async validateConnection(tokens: IntegrationTokens): Promise<boolean> {
    try {
      const response = await this.fetchWithRetry(`${this.apiUrl}/user`, {
        headers: this.getHeaders(tokens.accessToken),
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
    const response = await this.fetchWithRetry(`${this.apiUrl}/user`, {
      headers: this.getHeaders(tokens.accessToken),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch GitHub user info');
    }

    const user: GitHubUser = await response.json();

    return {
      accountName: user.name || user.login,
      accountEmail: user.email || undefined,
      avatarUrl: user.avatar_url,
      login: user.login,
      userId: user.id,
    };
  }

  /**
   * Fetch user's repositories for selection
   */
  async getRepositories(tokens: IntegrationTokens): Promise<GitHubRepository[]> {
    const repos: GitHubRepository[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await this.fetchWithRetry(
        `${this.apiUrl}/user/repos?per_page=${perPage}&page=${page}&sort=updated`,
        { headers: this.getHeaders(tokens.accessToken) }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch repositories');
      }

      const pageRepos: GitHubRepository[] = await response.json();
      repos.push(...pageRepos);

      if (pageRepos.length < perPage) {
        break;
      }
      page++;
    }

    return repos;
  }

  async sync(
    context: IntegrationContext,
    options?: SyncOptions
  ): Promise<StandardIngestItem[]> {
    const items: StandardIngestItem[] = [];
    const selectedRepos = (context.metadata?.selectedRepositories as string[]) || [];

    if (selectedRepos.length === 0) {
      console.log('[GitHub] No repositories selected for sync');
      return items;
    }

    const limit = options?.limit || 20;

    for (const repoFullName of selectedRepos) {
      try {
        // Fetch commits
        const commits = await this.fetchCommits(
          context.tokens.accessToken,
          repoFullName,
          limit,
          options?.since
        );
        for (const commit of commits) {
          items.push(this.normalizeCommit(commit, repoFullName));
        }

        // Fetch open PRs
        const prs = await this.fetchPullRequests(
          context.tokens.accessToken,
          repoFullName,
          limit
        );
        for (const pr of prs) {
          items.push(this.normalizePullRequest(pr, repoFullName));
        }

        // Fetch open issues
        const issues = await this.fetchIssues(
          context.tokens.accessToken,
          repoFullName,
          limit
        );
        for (const issue of issues) {
          items.push(this.normalizeIssue(issue, repoFullName));
        }

        // Fetch recent releases
        const releases = await this.fetchReleases(
          context.tokens.accessToken,
          repoFullName,
          5
        );
        for (const release of releases) {
          items.push(this.normalizeRelease(release, repoFullName));
        }
      } catch (error) {
        console.error(`[GitHub] Failed to sync repo ${repoFullName}:`, error);
      }
    }

    return items;
  }

  /**
   * Handle incoming webhook events
   */
  async handleWebhook(
    payload: unknown,
    signature?: string
  ): Promise<StandardIngestItem[]> {
    // Verify signature if provided
    if (signature) {
      const webhookSecret = WEBHOOK_SECRETS.github;
      if (webhookSecret && !this.verifyWebhookSignature(payload, signature, webhookSecret)) {
        throw new Error('Invalid webhook signature');
      }
    }

    const data = payload as GitHubWebhookPayload;
    const items: StandardIngestItem[] = [];

    // Determine event type from payload structure
    if ('commits' in data) {
      // Push event
      const pushPayload = data as unknown as GitHubPushPayload;
      for (const commit of pushPayload.commits) {
        items.push({
          sourceProvider: 'github',
          sourceId: commit.id,
          sourceUrl: commit.url,
          type: 'note',
          title: `Commit: ${commit.message.split('\n')[0]}`,
          content: this.formatCommitContent(commit, pushPayload.repository.full_name),
          metadata: {
            timestamp: new Date(commit.timestamp),
            author: commit.author.name,
            authorEmail: commit.author.email,
            custom: {
              sha: commit.id,
              repository: pushPayload.repository.full_name,
              branch: pushPayload.ref.replace('refs/heads/', ''),
              filesAdded: commit.added.length,
              filesRemoved: commit.removed.length,
              filesModified: commit.modified.length,
            },
          },
        });
      }
    } else if ('pull_request' in data) {
      // Pull request event
      const prPayload = data as GitHubPRPayload;
      if (['opened', 'closed', 'reopened', 'edited'].includes(prPayload.action)) {
        items.push(this.normalizePullRequest(prPayload.pull_request, prPayload.repository.full_name));
      }
    } else if ('issue' in data && !('pull_request' in (data as GitHubIssuePayload).issue)) {
      // Issue event (not a PR)
      const issuePayload = data as GitHubIssuePayload;
      if (['opened', 'closed', 'reopened', 'edited'].includes(issuePayload.action)) {
        items.push(this.normalizeIssue(issuePayload.issue, issuePayload.repository.full_name));
      }
    } else if ('release' in data) {
      // Release event
      const releasePayload = data as GitHubReleasePayload;
      if (releasePayload.action === 'published') {
        items.push(this.normalizeRelease(releasePayload.release, releasePayload.repository.full_name));
      }
    } else if ('comment' in data) {
      // Comment event (issue or PR comment)
      const commentPayload = data as GitHubCommentPayload;
      if (['created', 'edited'].includes(commentPayload.action)) {
        items.push(this.normalizeComment(commentPayload));
      }
    }

    return items;
  }

  /**
   * Register webhook for a repository
   */
  async registerWebhook(
    context: IntegrationContext,
    webhookUrl: string
  ): Promise<{ webhookId: string; secret?: string }> {
    const selectedRepos = (context.metadata?.selectedRepositories as string[]) || [];
    const webhookSecret = WEBHOOK_SECRETS.github || crypto.randomBytes(32).toString('hex');
    const webhookIds: string[] = [];

    for (const repoFullName of selectedRepos) {
      try {
        const response = await this.fetchWithRetry(
          `${this.apiUrl}/repos/${repoFullName}/hooks`,
          {
            method: 'POST',
            headers: this.getHeaders(context.tokens.accessToken),
            body: JSON.stringify({
              name: 'web',
              active: true,
              events: ['push', 'pull_request', 'issues', 'release', 'issue_comment', 'pull_request_review_comment'],
              config: {
                url: webhookUrl,
                content_type: 'json',
                secret: webhookSecret,
                insecure_ssl: '0',
              },
            }),
          }
        );

        if (response.ok) {
          const webhook = await response.json();
          webhookIds.push(`${repoFullName}:${webhook.id}`);
        } else {
          console.error(`[GitHub] Failed to register webhook for ${repoFullName}`);
        }
      } catch (error) {
        console.error(`[GitHub] Error registering webhook for ${repoFullName}:`, error);
      }
    }

    return {
      webhookId: webhookIds.join(','),
      secret: webhookSecret,
    };
  }

  /**
   * Unregister webhook from a repository
   */
  async unregisterWebhook(
    context: IntegrationContext,
    webhookId: string
  ): Promise<void> {
    const webhookMappings = webhookId.split(',');

    for (const mapping of webhookMappings) {
      const [repoFullName, hookId] = mapping.split(':');
      if (!repoFullName || !hookId) continue;

      try {
        await this.fetchWithRetry(
          `${this.apiUrl}/repos/${repoFullName}/hooks/${hookId}`,
          {
            method: 'DELETE',
            headers: this.getHeaders(context.tokens.accessToken),
          }
        );
      } catch (error) {
        console.error(`[GitHub] Error unregistering webhook ${hookId} from ${repoFullName}:`, error);
      }
    }
  }

  // Private helper methods

  private getHeaders(accessToken: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  private verifyWebhookSignature(payload: unknown, signature: string, secret: string): boolean {
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  private async fetchCommits(
    accessToken: string,
    repoFullName: string,
    limit: number,
    since?: Date
  ): Promise<GitHubCommit[]> {
    let url = `${this.apiUrl}/repos/${repoFullName}/commits?per_page=${limit}`;
    if (since) {
      url += `&since=${since.toISOString()}`;
    }

    const response = await this.fetchWithRetry(url, {
      headers: this.getHeaders(accessToken),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch commits: ${response.status}`);
    }

    return response.json();
  }

  private async fetchPullRequests(
    accessToken: string,
    repoFullName: string,
    limit: number
  ): Promise<GitHubPullRequest[]> {
    const response = await this.fetchWithRetry(
      `${this.apiUrl}/repos/${repoFullName}/pulls?state=open&per_page=${limit}`,
      { headers: this.getHeaders(accessToken) }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch PRs: ${response.status}`);
    }

    return response.json();
  }

  private async fetchIssues(
    accessToken: string,
    repoFullName: string,
    limit: number
  ): Promise<GitHubIssue[]> {
    const response = await this.fetchWithRetry(
      `${this.apiUrl}/repos/${repoFullName}/issues?state=open&per_page=${limit}`,
      { headers: this.getHeaders(accessToken) }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch issues: ${response.status}`);
    }

    // Filter out PRs (GitHub returns PRs as issues too)
    const issues: GitHubIssue[] = await response.json();
    return issues.filter((issue) => !('pull_request' in issue));
  }

  private async fetchReleases(
    accessToken: string,
    repoFullName: string,
    limit: number
  ): Promise<GitHubRelease[]> {
    const response = await this.fetchWithRetry(
      `${this.apiUrl}/repos/${repoFullName}/releases?per_page=${limit}`,
      { headers: this.getHeaders(accessToken) }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch releases: ${response.status}`);
    }

    return response.json();
  }

  private formatCommitContent(
    commit: GitHubPushPayload['commits'][0],
    repository: string
  ): string {
    let content = `**Repository:** ${repository}\n\n`;
    content += `${commit.message}\n\n`;

    if (commit.added.length > 0) {
      content += `**Added:** ${commit.added.length} files\n`;
    }
    if (commit.modified.length > 0) {
      content += `**Modified:** ${commit.modified.length} files\n`;
    }
    if (commit.removed.length > 0) {
      content += `**Removed:** ${commit.removed.length} files\n`;
    }

    return content;
  }

  private normalizeCommit(commit: GitHubCommit, repository: string): StandardIngestItem {
    const firstLine = commit.commit.message.split('\n')[0];

    let content = `**Repository:** ${repository}\n\n`;
    content += commit.commit.message;

    if (commit.stats) {
      content += `\n\n**Changes:** +${commit.stats.additions} -${commit.stats.deletions}`;
    }

    return {
      sourceProvider: 'github',
      sourceId: commit.sha,
      sourceUrl: commit.html_url,
      type: 'note',
      title: `Commit: ${firstLine.substring(0, 72)}${firstLine.length > 72 ? '...' : ''}`,
      content,
      metadata: {
        timestamp: new Date(commit.commit.author.date),
        author: commit.commit.author.name,
        authorEmail: commit.commit.author.email,
        custom: {
          sha: commit.sha,
          shortSha: commit.sha.substring(0, 7),
          repository,
          additions: commit.stats?.additions,
          deletions: commit.stats?.deletions,
          filesChanged: commit.files?.length,
        },
      },
    };
  }

  private normalizePullRequest(pr: GitHubPullRequest, repository: string): StandardIngestItem {
    let content = `**${pr.title}**\n\n`;

    if (pr.body) {
      content += `${pr.body}\n\n`;
    }

    content += `**Status:** ${pr.state}`;
    if (pr.merged) {
      content += ' (merged)';
    }
    content += `\n**Branch:** ${pr.head.ref} -> ${pr.base.ref}`;
    content += `\n**Changes:** +${pr.additions} -${pr.deletions} (${pr.changed_files} files)`;

    return {
      sourceProvider: 'github',
      sourceId: String(pr.id),
      sourceUrl: pr.html_url,
      type: 'issue',
      title: `PR #${pr.number}: ${pr.title}`,
      content,
      metadata: {
        timestamp: new Date(pr.updated_at),
        createdAt: new Date(pr.created_at),
        updatedAt: new Date(pr.updated_at),
        author: pr.user.login,
        tags: pr.labels.map((l) => l.name),
        custom: {
          number: pr.number,
          state: pr.state,
          merged: pr.merged,
          mergedAt: pr.merged_at,
          additions: pr.additions,
          deletions: pr.deletions,
          changedFiles: pr.changed_files,
          repository,
          headBranch: pr.head.ref,
          baseBranch: pr.base.ref,
        },
      },
      processingHints: {
        extractTasks: !pr.merged && pr.state === 'open',
        priority: 'medium',
      },
    };
  }

  private normalizeIssue(issue: GitHubIssue, repository: string): StandardIngestItem {
    let content = `**${issue.title}**\n\n`;

    if (issue.body) {
      content += `${issue.body}\n\n`;
    }

    content += `**Status:** ${issue.state}`;

    if (issue.assignees.length > 0) {
      content += `\n**Assignees:** ${issue.assignees.map((a) => a.login).join(', ')}`;
    }

    return {
      sourceProvider: 'github',
      sourceId: String(issue.id),
      sourceUrl: issue.html_url,
      type: 'issue',
      title: `Issue #${issue.number}: ${issue.title}`,
      content,
      metadata: {
        timestamp: new Date(issue.updated_at),
        createdAt: new Date(issue.created_at),
        updatedAt: new Date(issue.updated_at),
        author: issue.user.login,
        tags: issue.labels.map((l) => l.name),
        custom: {
          number: issue.number,
          state: issue.state,
          repository,
          assignees: issue.assignees.map((a) => a.login),
          closedAt: issue.closed_at,
        },
      },
      processingHints: {
        extractTasks: issue.state === 'open',
        priority: 'medium',
      },
    };
  }

  private normalizeRelease(release: GitHubRelease, repository: string): StandardIngestItem {
    let content = `**${release.name || release.tag_name}**\n\n`;

    if (release.body) {
      content += release.body;
    }

    if (release.prerelease) {
      content += '\n\n*Pre-release*';
    }

    return {
      sourceProvider: 'github',
      sourceId: String(release.id),
      sourceUrl: release.html_url,
      type: 'document',
      title: `Release: ${release.name || release.tag_name}`,
      content,
      metadata: {
        timestamp: new Date(release.published_at),
        createdAt: new Date(release.created_at),
        author: release.author.login,
        custom: {
          tagName: release.tag_name,
          repository,
          prerelease: release.prerelease,
          draft: release.draft,
        },
      },
    };
  }

  private normalizeComment(payload: GitHubCommentPayload): StandardIngestItem {
    const comment = payload.comment;
    const isIssueComment = !!payload.issue;
    const isPRComment = !!payload.pull_request;

    let title: string;
    let parentType: string;
    let parentNumber: number;

    if (isPRComment) {
      title = `Comment on PR #${payload.pull_request!.number}`;
      parentType = 'pull_request';
      parentNumber = payload.pull_request!.number;
    } else if (isIssueComment) {
      title = `Comment on Issue #${payload.issue!.number}`;
      parentType = 'issue';
      parentNumber = payload.issue!.number;
    } else {
      title = 'GitHub Comment';
      parentType = 'unknown';
      parentNumber = 0;
    }

    return {
      sourceProvider: 'github',
      sourceId: String(comment.id),
      sourceUrl: comment.html_url,
      type: 'comment',
      title,
      content: comment.body,
      metadata: {
        timestamp: new Date(comment.updated_at),
        createdAt: new Date(comment.created_at),
        author: comment.user.login,
        custom: {
          repository: payload.repository.full_name,
          parentType,
          parentNumber,
        },
      },
    };
  }
}

// Create and register the integration
const githubIntegration = new GitHubIntegration();
integrationRegistry.register(githubIntegration);

export default githubIntegration;
