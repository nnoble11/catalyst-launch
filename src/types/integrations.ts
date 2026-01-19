/**
 * Integration Types for Second Brain Framework
 *
 * This file contains all type definitions for the integration system,
 * including providers, sync states, and the standardized ingest item format.
 */

// All supported integration providers
export const INTEGRATION_PROVIDERS = [
  // Existing
  'google_calendar',
  'notion',
  'slack',
  // Tier 1 - High Value
  'granola',
  'readwise',
  'todoist',
  'ticktick',
  'linear',
  'gmail',
  'github',
  // Tier 2 - Knowledge
  'obsidian',
  'roam',
  'mem_ai',
  'pocket',
  'instapaper',
  'raindrop',
  // Tier 3 - Communication
  'discord',
  'telegram',
  'microsoft_teams',
  'zoom',
  // Tier 4 - Extended
  'hubspot',
  'figma',
  'google_drive',
  'dropbox',
  'chatgpt',
  'perplexity',
  // Browser Extension
  'browser_extension',
  // Revenue & Metrics
  'stripe',
  'google_sheets',
  // Analytics
  'mixpanel',
  'posthog',
  'amplitude',
] as const;

export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

// Ingest item types - what kind of content is being captured
export const INGEST_ITEM_TYPES = [
  'note',
  'highlight',
  'meeting',
  'task',
  'message',
  'article',
  'bookmark',
  'document',
  'email',
  'comment',
  'issue',
  'clip',
] as const;

export type IngestItemType = (typeof INGEST_ITEM_TYPES)[number];

// Sync status for tracking sync progress
export const SYNC_STATUSES = ['pending', 'syncing', 'completed', 'failed', 'paused'] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

// Authentication methods supported by integrations
export const AUTH_METHODS = ['oauth2', 'api_key', 'bot_token', 'custom'] as const;
export type AuthMethod = (typeof AUTH_METHODS)[number];

// Sync methods - how data is retrieved
export const SYNC_METHODS = ['pull', 'push', 'webhook', 'hybrid'] as const;
export type SyncMethod = (typeof SYNC_METHODS)[number];

/**
 * StandardIngestItem - The normalized format for all ingested data
 * All integrations transform their data into this format before processing.
 */
export interface StandardIngestItem {
  // Source identification
  sourceProvider: IntegrationProvider;
  sourceId: string; // Unique ID from the source system
  sourceUrl?: string; // Direct link to the item in the source system

  // Content type and classification
  type: IngestItemType;

  // Content
  title?: string;
  content: string;
  summary?: string; // AI-generated or source-provided summary
  rawContent?: string; // Original unprocessed content

  // Metadata
  metadata: IngestItemMetadata;

  // Processing hints
  processingHints?: {
    extractTasks?: boolean;
    extractMemories?: boolean;
    linkToProject?: string;
    priority?: 'low' | 'medium' | 'high';
  };
}

export interface IngestItemMetadata {
  // Temporal
  timestamp: Date;
  createdAt?: Date;
  updatedAt?: Date;

  // Attribution
  author?: string;
  authorEmail?: string;
  authorId?: string;

  // Categorization
  tags?: string[];
  categories?: string[];
  labels?: string[];

  // Relationships
  parentId?: string;
  threadId?: string;
  projectId?: string;
  conversationId?: string;

  // Source-specific data
  custom?: Record<string, unknown>;
}

/**
 * Integration Definition - Configuration for each integration
 */
export interface IntegrationDefinition {
  id: IntegrationProvider;
  name: string;
  description: string;
  icon: string; // Lucide icon name or custom icon path
  category: IntegrationCategory;

  // Authentication
  authMethod: AuthMethod;
  scopes?: string[];

  // Sync configuration
  syncMethod: SyncMethod;
  supportedTypes: IngestItemType[];
  defaultSyncInterval?: number; // minutes

  // Feature flags
  features: {
    realtime?: boolean;
    bidirectional?: boolean;
    incrementalSync?: boolean;
    webhooks?: boolean;
  };

  // Status
  isAvailable: boolean;
  isComingSoon?: boolean;
}

// Integration categories for UI organization
export const INTEGRATION_CATEGORIES = [
  'meetings_notes',
  'knowledge_reading',
  'tasks_projects',
  'communication',
  'productivity',
  'capture_tools',
] as const;

export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number];

export const INTEGRATION_CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  meetings_notes: 'Meetings & Notes',
  knowledge_reading: 'Knowledge & Reading',
  tasks_projects: 'Tasks & Projects',
  communication: 'Communication',
  productivity: 'Productivity',
  capture_tools: 'Capture Tools',
};

/**
 * Sync State - Tracks the progress of syncing for each integration
 */
export interface IntegrationSyncState {
  id: string;
  userId: string;
  integrationId: string;
  provider: IntegrationProvider;

  // Sync progress
  status: SyncStatus;
  lastSyncAt?: Date;
  nextSyncAt?: Date;
  lastSuccessfulSyncAt?: Date;

  // Cursor/pagination for incremental sync
  cursor?: string;
  lastItemId?: string;
  lastItemTimestamp?: Date;

  // Error tracking
  errorCount: number;
  lastError?: string;
  lastErrorAt?: Date;

  // Statistics
  totalItemsSynced: number;
  itemsSyncedThisRun: number;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Ingested Item - Tracks what has been imported to prevent duplicates
 */
export interface IngestedItem {
  id: string;
  userId: string;
  integrationId: string;
  provider: IntegrationProvider;

  // Source identification
  sourceId: string;
  sourceHash?: string; // Hash of content for change detection

  // Processing results
  captureId?: string; // Link to capture if one was created
  memoryIds?: string[]; // Link to AI memories extracted
  taskIds?: string[]; // Link to tasks extracted

  // Status
  status: 'pending' | 'processed' | 'skipped' | 'failed';
  processedAt?: Date;
  error?: string;

  // Original data
  rawData?: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Webhook Subscription - Manages webhook registrations
 */
export interface WebhookSubscription {
  id: string;
  userId: string;
  integrationId: string;
  provider: IntegrationProvider;

  // Webhook details
  webhookId?: string; // ID from the external service
  webhookUrl: string;
  secret?: string;
  events: string[];

  // Status
  isActive: boolean;
  verifiedAt?: Date;
  lastReceivedAt?: Date;

  // Error tracking
  errorCount: number;
  lastError?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Integration tokens - Extended from base
 */
export interface IntegrationTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
  scope?: string;
}

/**
 * Integration Connection Status - Enhanced status for UI
 */
export interface IntegrationConnectionStatus {
  provider: IntegrationProvider;
  connected: boolean;
  syncState?: {
    status: SyncStatus;
    lastSyncAt?: Date;
    itemsSynced: number;
    error?: string;
  };
  metadata?: {
    accountName?: string;
    accountEmail?: string;
    workspace?: string;
    [key: string]: unknown;
  };
}

/**
 * Sync Options - Configuration for sync operations
 */
export interface SyncOptions {
  fullSync?: boolean; // Ignore cursor, sync everything
  limit?: number; // Max items per sync
  since?: Date; // Only sync items after this date
  types?: IngestItemType[]; // Only sync certain types
  dryRun?: boolean; // Don't actually save, just return items
}

/**
 * Sync Result - Result of a sync operation
 */
export interface SyncResult {
  success: boolean;
  provider: IntegrationProvider;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  itemsFailed: number;
  errors: SyncError[];
  cursor?: string;
  hasMore: boolean;
  nextSyncAt?: Date;
}

export interface SyncError {
  itemId?: string;
  message: string;
  code?: string;
  recoverable: boolean;
}

/**
 * API Client Config - Configuration for integration API clients
 */
export interface ApiClientConfig {
  baseUrl: string;
  accessToken: string;
  refreshToken?: string;
  timeout?: number;
  retries?: number;
}

/**
 * Webhook Event - Incoming webhook payload wrapper
 */
export interface WebhookEvent {
  provider: IntegrationProvider;
  eventType: string;
  timestamp: Date;
  payload: unknown;
  signature?: string;
}
