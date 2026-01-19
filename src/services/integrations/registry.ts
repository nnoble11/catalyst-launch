/**
 * Integration Registry - Central registry for all integration definitions
 *
 * This registry:
 * - Holds all integration definitions
 * - Provides lookup by provider ID
 * - Groups integrations by category for UI
 * - Tracks availability status
 */

import type {
  IntegrationProvider,
  IntegrationDefinition,
  IntegrationCategory,
} from '@/types/integrations';
import { BaseIntegration } from './base/BaseIntegration';

/**
 * All integration definitions
 */
export const INTEGRATION_DEFINITIONS: IntegrationDefinition[] = [
  // ============================================
  // Meetings & Notes
  // ============================================
  {
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
  },
  {
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
  },

  // ============================================
  // Knowledge & Reading
  // ============================================
  {
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
  },
  {
    id: 'pocket',
    name: 'Pocket',
    description: 'Import your saved articles and reading list from Pocket.',
    icon: 'bookmark',
    category: 'knowledge_reading',
    authMethod: 'oauth2',
    syncMethod: 'pull',
    supportedTypes: ['article', 'bookmark'],
    defaultSyncInterval: 30,
    features: {
      realtime: false,
      bidirectional: false,
      incrementalSync: true,
      webhooks: false,
    },
    isAvailable: true,
  },
  {
    id: 'raindrop',
    name: 'Raindrop.io',
    description: 'Sync your bookmarks and collections from Raindrop.',
    icon: 'cloud-rain',
    category: 'knowledge_reading',
    authMethod: 'oauth2',
    syncMethod: 'pull',
    supportedTypes: ['bookmark', 'article'],
    defaultSyncInterval: 30,
    features: {
      realtime: false,
      bidirectional: false,
      incrementalSync: true,
      webhooks: false,
    },
    isAvailable: true,
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    description: 'Connect your Obsidian vault via the REST API plugin.',
    icon: 'gem',
    category: 'knowledge_reading',
    authMethod: 'api_key',
    syncMethod: 'pull',
    supportedTypes: ['note', 'document'],
    defaultSyncInterval: 15,
    features: {
      realtime: false,
      bidirectional: true,
      incrementalSync: true,
      webhooks: false,
    },
    isAvailable: false,
    isComingSoon: true,
  },
  {
    id: 'roam',
    name: 'Roam Research',
    description: 'Sync your notes and daily pages from Roam Research.',
    icon: 'network',
    category: 'knowledge_reading',
    authMethod: 'api_key',
    syncMethod: 'pull',
    supportedTypes: ['note', 'document'],
    defaultSyncInterval: 30,
    features: {
      realtime: false,
      bidirectional: false,
      incrementalSync: true,
      webhooks: false,
    },
    isAvailable: false,
    isComingSoon: true,
  },
  {
    id: 'mem_ai',
    name: 'Mem.ai',
    description: 'Import your AI-organized notes from Mem.',
    icon: 'sparkles',
    category: 'knowledge_reading',
    authMethod: 'api_key',
    syncMethod: 'pull',
    supportedTypes: ['note'],
    defaultSyncInterval: 30,
    features: {
      realtime: false,
      bidirectional: false,
      incrementalSync: true,
      webhooks: false,
    },
    isAvailable: false,
    isComingSoon: true,
  },
  {
    id: 'instapaper',
    name: 'Instapaper',
    description: 'Sync saved articles and highlights from Instapaper.',
    icon: 'file-text',
    category: 'knowledge_reading',
    authMethod: 'oauth2',
    syncMethod: 'pull',
    supportedTypes: ['article', 'highlight'],
    defaultSyncInterval: 30,
    features: {
      realtime: false,
      bidirectional: false,
      incrementalSync: true,
      webhooks: false,
    },
    isAvailable: false,
    isComingSoon: true,
  },

  // ============================================
  // Tasks & Projects
  // ============================================
  {
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
  },
  {
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
  },
  {
    id: 'ticktick',
    name: 'TickTick',
    description: 'Sync tasks and habits from TickTick.',
    icon: 'list-checks',
    category: 'tasks_projects',
    authMethod: 'oauth2',
    syncMethod: 'pull',
    supportedTypes: ['task'],
    defaultSyncInterval: 15,
    features: {
      realtime: false,
      bidirectional: true,
      incrementalSync: true,
      webhooks: false,
    },
    isAvailable: false,
    isComingSoon: true,
  },
  {
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
  },

  // ============================================
  // Communication
  // ============================================
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get notifications and capture important messages from Slack.',
    icon: 'message-square',
    category: 'communication',
    authMethod: 'oauth2',
    scopes: ['chat:write', 'commands', 'users:read'],
    syncMethod: 'webhook',
    supportedTypes: ['message'],
    defaultSyncInterval: 0, // Real-time only
    features: {
      realtime: true,
      bidirectional: true,
      incrementalSync: false,
      webhooks: true,
    },
    isAvailable: true,
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Capture important emails and turn them into actionable items.',
    icon: 'mail',
    category: 'communication',
    authMethod: 'oauth2',
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    syncMethod: 'pull',
    supportedTypes: ['email', 'message'],
    defaultSyncInterval: 15,
    features: {
      realtime: false,
      bidirectional: false,
      incrementalSync: true,
      webhooks: true,
    },
    isAvailable: true,
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Capture messages and threads from your Discord servers.',
    icon: 'message-circle',
    category: 'communication',
    authMethod: 'oauth2',
    scopes: ['identify', 'guilds', 'messages.read'],
    syncMethod: 'webhook',
    supportedTypes: ['message'],
    defaultSyncInterval: 0,
    features: {
      realtime: true,
      bidirectional: false,
      incrementalSync: false,
      webhooks: true,
    },
    isAvailable: true,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    description: 'Save messages from Telegram via bot integration.',
    icon: 'send',
    category: 'communication',
    authMethod: 'bot_token',
    syncMethod: 'webhook',
    supportedTypes: ['message'],
    defaultSyncInterval: 0,
    features: {
      realtime: true,
      bidirectional: true,
      incrementalSync: false,
      webhooks: true,
    },
    isAvailable: false,
    isComingSoon: true,
  },
  {
    id: 'microsoft_teams',
    name: 'Microsoft Teams',
    description: 'Capture messages and meeting notes from Teams.',
    icon: 'users',
    category: 'communication',
    authMethod: 'oauth2',
    scopes: ['User.Read', 'Chat.Read', 'ChannelMessage.Read.All'],
    syncMethod: 'webhook',
    supportedTypes: ['message', 'meeting'],
    defaultSyncInterval: 15,
    features: {
      realtime: true,
      bidirectional: false,
      incrementalSync: true,
      webhooks: true,
    },
    isAvailable: false,
    isComingSoon: true,
  },

  // ============================================
  // Productivity
  // ============================================
  {
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
  },
  {
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
  },
  {
    id: 'google_drive',
    name: 'Google Drive',
    description: 'Import documents and files from Google Drive.',
    icon: 'hard-drive',
    category: 'productivity',
    authMethod: 'oauth2',
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    syncMethod: 'pull',
    supportedTypes: ['document'],
    defaultSyncInterval: 60,
    features: {
      realtime: false,
      bidirectional: false,
      incrementalSync: true,
      webhooks: true,
    },
    isAvailable: false,
    isComingSoon: true,
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    description: 'Import files and documents from Dropbox.',
    icon: 'box',
    category: 'productivity',
    authMethod: 'oauth2',
    syncMethod: 'pull',
    supportedTypes: ['document'],
    defaultSyncInterval: 60,
    features: {
      realtime: false,
      bidirectional: false,
      incrementalSync: true,
      webhooks: true,
    },
    isAvailable: false,
    isComingSoon: true,
  },
  {
    id: 'figma',
    name: 'Figma',
    description: 'Capture design comments and file updates from Figma.',
    icon: 'pen-tool',
    category: 'productivity',
    authMethod: 'oauth2',
    scopes: ['files:read'],
    syncMethod: 'webhook',
    supportedTypes: ['comment', 'document'],
    defaultSyncInterval: 30,
    features: {
      realtime: true,
      bidirectional: false,
      incrementalSync: true,
      webhooks: true,
    },
    isAvailable: false,
    isComingSoon: true,
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Sync contacts and deals from HubSpot CRM.',
    icon: 'briefcase',
    category: 'productivity',
    authMethod: 'oauth2',
    scopes: ['crm.objects.contacts.read', 'crm.objects.deals.read'],
    syncMethod: 'pull',
    supportedTypes: ['note', 'task'],
    defaultSyncInterval: 30,
    features: {
      realtime: false,
      bidirectional: false,
      incrementalSync: true,
      webhooks: true,
    },
    isAvailable: false,
    isComingSoon: true,
  },

  // ============================================
  // Capture Tools
  // ============================================
  {
    id: 'browser_extension',
    name: 'Browser Extension',
    description: 'Clip web pages, articles, and highlights directly from your browser.',
    icon: 'globe',
    category: 'capture_tools',
    authMethod: 'custom',
    syncMethod: 'push',
    supportedTypes: ['clip', 'highlight', 'bookmark', 'article'],
    defaultSyncInterval: 0, // Push-based
    features: {
      realtime: true,
      bidirectional: false,
      incrementalSync: false,
      webhooks: false,
    },
    isAvailable: true,
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    description: 'Import your ChatGPT conversation history.',
    icon: 'bot',
    category: 'capture_tools',
    authMethod: 'custom', // Manual export
    syncMethod: 'push',
    supportedTypes: ['message', 'note'],
    defaultSyncInterval: 0,
    features: {
      realtime: false,
      bidirectional: false,
      incrementalSync: false,
      webhooks: false,
    },
    isAvailable: false,
    isComingSoon: true,
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    description: 'Import research sessions from Perplexity AI.',
    icon: 'search',
    category: 'capture_tools',
    authMethod: 'api_key',
    syncMethod: 'pull',
    supportedTypes: ['note', 'article'],
    defaultSyncInterval: 60,
    features: {
      realtime: false,
      bidirectional: false,
      incrementalSync: true,
      webhooks: false,
    },
    isAvailable: false,
    isComingSoon: true,
  },

  // ============================================
  // Revenue & Metrics
  // ============================================
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Automatically track revenue, MRR, and customer milestones from Stripe.',
    icon: 'credit-card',
    category: 'productivity',
    authMethod: 'oauth2',
    scopes: ['read_only'],
    syncMethod: 'webhook',
    supportedTypes: ['note'],
    defaultSyncInterval: 60,
    features: {
      realtime: true,
      bidirectional: false,
      incrementalSync: true,
      webhooks: true,
    },
    isAvailable: true,
  },
  {
    id: 'google_sheets',
    name: 'Google Sheets',
    description: 'Import metrics and traction data from Google Sheets.',
    icon: 'table',
    category: 'productivity',
    authMethod: 'oauth2',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    syncMethod: 'pull',
    supportedTypes: ['note'],
    defaultSyncInterval: 60,
    features: {
      realtime: false,
      bidirectional: false,
      incrementalSync: true,
      webhooks: false,
    },
    isAvailable: false,
    isComingSoon: true,
  },
];

/**
 * Integration Registry Class
 */
class IntegrationRegistry {
  private definitions: Map<IntegrationProvider, IntegrationDefinition>;
  private instances: Map<IntegrationProvider, BaseIntegration>;

  constructor() {
    this.definitions = new Map();
    this.instances = new Map();

    // Load all definitions
    for (const def of INTEGRATION_DEFINITIONS) {
      this.definitions.set(def.id, def);
    }
  }

  /**
   * Get integration definition by provider ID
   */
  getDefinition(provider: IntegrationProvider): IntegrationDefinition | undefined {
    return this.definitions.get(provider);
  }

  /**
   * Get all integration definitions
   */
  getAllDefinitions(): IntegrationDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * Get integrations by category
   */
  getByCategory(category: IntegrationCategory): IntegrationDefinition[] {
    return Array.from(this.definitions.values()).filter(
      (def) => def.category === category
    );
  }

  /**
   * Get all available integrations
   */
  getAvailable(): IntegrationDefinition[] {
    return Array.from(this.definitions.values()).filter(
      (def) => def.isAvailable
    );
  }

  /**
   * Get integrations grouped by category
   */
  getGroupedByCategory(): Record<IntegrationCategory, IntegrationDefinition[]> {
    const grouped: Record<string, IntegrationDefinition[]> = {};

    for (const def of this.definitions.values()) {
      if (!grouped[def.category]) {
        grouped[def.category] = [];
      }
      grouped[def.category].push(def);
    }

    return grouped as Record<IntegrationCategory, IntegrationDefinition[]>;
  }

  /**
   * Register an integration instance
   */
  register(integration: BaseIntegration): void {
    this.instances.set(integration.provider, integration);
  }

  /**
   * Get registered integration instance
   */
  get(provider: IntegrationProvider): BaseIntegration | undefined {
    return this.instances.get(provider);
  }

  /**
   * Check if a provider is registered
   */
  has(provider: IntegrationProvider): boolean {
    return this.instances.has(provider);
  }

  /**
   * Get all registered instances
   */
  getAllInstances(): BaseIntegration[] {
    return Array.from(this.instances.values());
  }
}

// Export singleton instance
export const integrationRegistry = new IntegrationRegistry();

// Export helper to get definition
export function getIntegrationDefinition(
  provider: IntegrationProvider
): IntegrationDefinition | undefined {
  return integrationRegistry.getDefinition(provider);
}
