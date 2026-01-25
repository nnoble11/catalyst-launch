import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const stageEnum = pgEnum('stage', ['ideation', 'mvp', 'gtm']);
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant', 'system']);
export const activityTypeEnum = pgEnum('activity_type', [
  'project_created',
  'milestone_completed',
  'document_generated',
  'chat_message',
  'login',
  'task_created',
  'task_completed',
  'idea_submitted',
  'capture_created',
  'streak_updated',
]);
export const documentTypeEnum = pgEnum('document_type', [
  'pitch-deck',
  'prd',
  'gtm-plan',
  'competitive-analysis',
  'user-persona',
  'financial-projections',
  'investor-update',
  'product-roadmap',
  'landing-page',
]);
export const notificationTypeEnum = pgEnum('notification_type', [
  'info',
  'success',
  'warning',
  'reminder',
  'suggestion',
  'stuck_alert',
  'streak_milestone',
  'weekly_report',
]);
export const integrationProviderEnum = pgEnum('integration_provider', [
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
]);

// Sync status enum for tracking sync progress
export const syncStatusEnum = pgEnum('sync_status', [
  'pending',
  'syncing',
  'completed',
  'failed',
  'paused',
]);

// Ingested item status enum
export const ingestedItemStatusEnum = pgEnum('ingested_item_status', [
  'pending',
  'processed',
  'skipped',
  'failed',
]);

// Ingest item type enum - what kind of content
export const ingestItemTypeEnum = pgEnum('ingest_item_type', [
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
]);

// New enums for tasks, captures, and streaks
export const taskStatusEnum = pgEnum('task_status', ['backlog', 'today', 'in_progress', 'done']);
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high', 'urgent']);
export const captureTypeEnum = pgEnum('capture_type', ['idea', 'note', 'task', 'question', 'resource']);
export const streakTypeEnum = pgEnum('streak_type', ['daily_activity', 'milestone_completion', 'document_generation']);

// Progress milestone types - meaningful achievements that matter
export const progressMilestoneTypeEnum = pgEnum('progress_milestone_type', [
  'first_customer',
  'ten_customers',
  'hundred_customers',
  'first_revenue',
  'mrr_1k',
  'mrr_10k',
  'mrr_100k',
  'first_investor_meeting',
  'term_sheet',
  'funding_closed',
  'mvp_launched',
  'product_hunt_launch',
  'first_employee',
  'yc_interview',
  'demo_day',
  'first_partnership',
  'custom',
]);

// Decision categories
export const decisionCategoryEnum = pgEnum('decision_category', [
  'product',
  'growth',
  'fundraising',
  'team',
  'operations',
  'legal',
  'finance',
]);

// Decision status
export const decisionStatusEnum = pgEnum('decision_status', [
  'pending',
  'decided',
  'deferred',
  'dismissed',
]);

// Decision trigger types
export const decisionTriggerTypeEnum = pgEnum('decision_trigger_type', [
  'stage_transition',
  'milestone_missed',
  'metric_threshold',
  'time_based',
  'blocker_detected',
  'external_event',
]);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: varchar('clerk_id', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  avatarUrl: text('avatar_url'),
  onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),
  preferences: jsonb('preferences').$type<{
    theme?: 'light' | 'dark' | 'system';
    defaultAiProvider?: 'openai' | 'anthropic';
    notificationsEnabled?: boolean;
    dailyCheckInTime?: string;
  }>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Projects table
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  stage: stageEnum('stage').notNull().default('ideation'),
  isActive: boolean('is_active').default(true).notNull(),
  metadata: jsonb('metadata').$type<{
    targetAudience?: string;
    problemStatement?: string;
    valueProposition?: string;
    competitors?: string[];
    goals?: string[];
  }>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Milestones table
export const milestones = pgTable('milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  isCompleted: boolean('is_completed').default(false).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  dueDate: timestamp('due_date', { withTimezone: true }),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Conversations table
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 255 }),
  summary: text('summary'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Messages table
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').$type<{
    model?: string;
    tokens?: {
      prompt: number;
      completion: number;
    };
    actionsTaken?: string[];
  }>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Activities table
export const activities = pgTable('activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  type: activityTypeEnum('type').notNull(),
  data: jsonb('data').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Documents table
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  type: documentTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: jsonb('content')
    .$type<{
      sections: {
        id: string;
        title: string;
        content: string;
        order: number;
      }[];
      metadata?: Record<string, unknown>;
    }>()
    .notNull(),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Notifications table
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  type: notificationTypeEnum('type').notNull().default('info'),
  isRead: boolean('is_read').default(false).notNull(),
  actionUrl: text('action_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Integrations table
export const integrations = pgTable('integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: integrationProviderEnum('provider').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userProviderUnique: uniqueIndex('integrations_user_provider_unique').on(
    table.userId,
    table.provider
  ),
}));

// Integration Sync State table - Track sync progress, cursors, errors
export const integrationSyncState = pgTable('integration_sync_state', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  integrationId: uuid('integration_id')
    .notNull()
    .references(() => integrations.id, { onDelete: 'cascade' }),
  provider: integrationProviderEnum('provider').notNull(),

  // Sync progress
  status: syncStatusEnum('status').notNull().default('pending'),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  nextSyncAt: timestamp('next_sync_at', { withTimezone: true }),
  lastSuccessfulSyncAt: timestamp('last_successful_sync_at', { withTimezone: true }),

  // Cursor/pagination for incremental sync
  cursor: text('cursor'),
  lastItemId: text('last_item_id'),
  lastItemTimestamp: timestamp('last_item_timestamp', { withTimezone: true }),

  // Error tracking
  errorCount: integer('error_count').notNull().default(0),
  lastError: text('last_error'),
  lastErrorAt: timestamp('last_error_at', { withTimezone: true }),

  // Statistics
  totalItemsSynced: integer('total_items_synced').notNull().default(0),
  itemsSyncedThisRun: integer('items_synced_this_run').notNull().default(0),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Ingested Items table - Deduplicate external items, track what's been imported
export const ingestedItems = pgTable('ingested_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  integrationId: uuid('integration_id')
    .notNull()
    .references(() => integrations.id, { onDelete: 'cascade' }),
  provider: integrationProviderEnum('provider').notNull(),

  // Source identification
  sourceId: text('source_id').notNull(),
  sourceHash: text('source_hash'),
  sourceUrl: text('source_url'),

  // Content type
  itemType: ingestItemTypeEnum('item_type').notNull(),
  title: text('title'),
  content: text('content'),

  // Processing results
  captureId: uuid('capture_id').references(() => captures.id, { onDelete: 'set null' }),
  memoryIds: jsonb('memory_ids').$type<string[]>(),
  taskIds: jsonb('task_ids').$type<string[]>(),

  // Status
  status: ingestedItemStatusEnum('status').notNull().default('pending'),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  error: text('error'),

  // Original data for debugging/reprocessing
  rawData: jsonb('raw_data').$type<Record<string, unknown>>(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  integrationSourceUnique: uniqueIndex('ingested_items_integration_source_unique').on(
    table.integrationId,
    table.sourceId
  ),
}));

// Webhook Subscriptions table - Manage webhook registrations
export const webhookSubscriptions = pgTable('webhook_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  integrationId: uuid('integration_id')
    .notNull()
    .references(() => integrations.id, { onDelete: 'cascade' }),
  provider: integrationProviderEnum('provider').notNull(),

  // Webhook details
  webhookId: text('webhook_id'), // ID from the external service
  webhookUrl: text('webhook_url').notNull(),
  secret: text('secret'),
  events: jsonb('events').$type<string[]>().notNull().default([]),

  // Status
  isActive: boolean('is_active').default(true).notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  lastReceivedAt: timestamp('last_received_at', { withTimezone: true }),

  // Error tracking
  errorCount: integer('error_count').notNull().default(0),
  lastError: text('last_error'),
  lastErrorAt: timestamp('last_error_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Ideas table (for leaderboard)
export const ideas = pgTable('ideas', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  votes: integer('votes').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Tasks table (Task Board)
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: taskStatusEnum('status').notNull().default('backlog'),
  priority: taskPriorityEnum('priority').notNull().default('medium'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  aiSuggested: boolean('ai_suggested').default(false).notNull(),
  aiRationale: text('ai_rationale'),
  order: integer('order').notNull().default(0),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Captures table (Quick Capture)
export const captures = pgTable('captures', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  content: text('content').notNull(),
  type: captureTypeEnum('type').notNull().default('note'),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  processedInto: jsonb('processed_into').$type<{
    taskId?: string;
    noteId?: string;
    actionTaken?: string;
  }>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Streaks table (Progress Streaks & Gamification) - DEPRECATED: Being replaced by progress milestones
export const streaks = pgTable('streaks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  streakType: streakTypeEnum('streak_type').notNull().default('daily_activity'),
  currentStreak: integer('current_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  lastActivityDate: timestamp('last_activity_date', { withTimezone: true }),
  totalPoints: integer('total_points').notNull().default(0),
  achievements: jsonb('achievements').$type<{
    badge: string;
    earnedAt: string;
    description: string;
  }[]>().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Progress Milestones table - Meaningful achievements that matter (replaces gamification)
export const progressMilestones = pgTable('progress_milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  milestoneType: progressMilestoneTypeEnum('milestone_type').notNull(),
  customTitle: varchar('custom_title', { length: 255 }), // For 'custom' type
  achievedAt: timestamp('achieved_at', { withTimezone: true }).defaultNow().notNull(),
  evidence: jsonb('evidence').$type<{
    metric?: string;
    value?: number | string;
    notes?: string;
    sourceUrl?: string;
  }>(),
  celebrated: boolean('celebrated').default(false).notNull(),
  visibility: varchar('visibility', { length: 20 }).default('cohort').notNull(), // 'private', 'cohort', 'public'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Traction Metrics table - Track key business metrics over time
export const tractionMetrics = pgTable('traction_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  metricDate: timestamp('metric_date', { withTimezone: true }).notNull(),
  customers: integer('customers'),
  revenueCents: integer('revenue_cents'), // Store in cents to avoid floating point issues
  mrrCents: integer('mrr_cents'),
  activeUsers: integer('active_users'),
  conversationsCount: integer('conversations_count'), // Customer conversations
  npsScore: integer('nps_score'),
  customMetrics: jsonb('custom_metrics').$type<Record<string, number | string>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Daily Briefings table
export const dailyBriefings = pgTable('daily_briefings', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  briefingDate: timestamp('briefing_date', { withTimezone: true }).notNull(),
  content: jsonb('content').$type<{
    summary: string;
    progress: {
      completedTasks: number;
      milestonesHit: string[];
    };
    blockers: Array<{
      description: string;
      suggestedAction: string;
    }>;
    upcoming: Array<{
      item: string;
      due: string;
      daysUntil: number;
    }>;
    insight: {
      observation: string;
      recommendation: string;
    };
    momentumScore: number;
    focusSuggestion: string;
  }>().notNull(),
  audioUrl: text('audio_url'),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Decisions table - Weekly decision queue
export const decisions = pgTable('decisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  context: text('context').notNull(), // AI-generated context explaining why this matters now
  tradeoffs: jsonb('tradeoffs').$type<Array<{
    option: string;
    pros: string[];
    cons: string[];
    recommended: boolean;
  }>>().notNull(),
  recommendedAction: text('recommended_action'),
  urgencyScore: integer('urgency_score').notNull(), // 1-10
  impactScore: integer('impact_score').notNull(), // 1-10
  category: decisionCategoryEnum('category').notNull(),
  status: decisionStatusEnum('status').default('pending').notNull(),
  decisionMade: text('decision_made'), // What the founder actually decided
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  dueDate: timestamp('due_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Decision Triggers table - What prompted a decision to surface
export const decisionTriggers = pgTable('decision_triggers', {
  id: uuid('id').primaryKey().defaultRandom(),
  decisionId: uuid('decision_id')
    .notNull()
    .references(() => decisions.id, { onDelete: 'cascade' }),
  triggerType: decisionTriggerTypeEnum('trigger_type').notNull(),
  triggerData: jsonb('trigger_data').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// AI Memory table (Persistent AI Memory)
export const aiMemory = pgTable('ai_memory', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  key: varchar('key', { length: 255 }).notNull(),
  value: text('value').notNull(),
  category: varchar('category', { length: 100 }),
  confidence: integer('confidence').notNull().default(80),
  source: varchar('source', { length: 100 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Analytics Events table
export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  eventData: jsonb('event_data').$type<Record<string, unknown>>().notNull().default({}),
  sessionId: varchar('session_id', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Document Versions table (for version history)
export const documentVersions = pgTable('document_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  content: jsonb('content')
    .$type<{
      sections: {
        id: string;
        title: string;
        content: string;
        order: number;
      }[];
      metadata?: Record<string, unknown>;
    }>()
    .notNull(),
  changeDescription: text('change_description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  conversations: many(conversations),
  activities: many(activities),
  documents: many(documents),
  notifications: many(notifications),
  integrations: many(integrations),
  ideas: many(ideas),
  tasks: many(tasks),
  captures: many(captures),
  streaks: many(streaks),
  aiMemories: many(aiMemory),
  analyticsEvents: many(analyticsEvents),
  integrationSyncStates: many(integrationSyncState),
  ingestedItems: many(ingestedItems),
  webhookSubscriptions: many(webhookSubscriptions),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  milestones: many(milestones),
  conversations: many(conversations),
  activities: many(activities),
  documents: many(documents),
  tasks: many(tasks),
  captures: many(captures),
  aiMemories: many(aiMemory),
  analyticsEvents: many(analyticsEvents),
  progressMilestones: many(progressMilestones),
  tractionMetrics: many(tractionMetrics),
  dailyBriefings: many(dailyBriefings),
  decisions: many(decisions),
}));

export const milestonesRelations = relations(milestones, ({ one }) => ({
  project: one(projects, {
    fields: [milestones.projectId],
    references: [projects.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [conversations.projectId],
    references: [projects.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [activities.projectId],
    references: [projects.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
  }),
  versions: many(documentVersions),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const integrationsRelations = relations(integrations, ({ one, many }) => ({
  user: one(users, {
    fields: [integrations.userId],
    references: [users.id],
  }),
  syncStates: many(integrationSyncState),
  ingestedItems: many(ingestedItems),
  webhookSubscriptions: many(webhookSubscriptions),
}));

export const integrationSyncStateRelations = relations(integrationSyncState, ({ one }) => ({
  user: one(users, {
    fields: [integrationSyncState.userId],
    references: [users.id],
  }),
  integration: one(integrations, {
    fields: [integrationSyncState.integrationId],
    references: [integrations.id],
  }),
}));

export const ingestedItemsRelations = relations(ingestedItems, ({ one }) => ({
  user: one(users, {
    fields: [ingestedItems.userId],
    references: [users.id],
  }),
  integration: one(integrations, {
    fields: [ingestedItems.integrationId],
    references: [integrations.id],
  }),
  capture: one(captures, {
    fields: [ingestedItems.captureId],
    references: [captures.id],
  }),
}));

export const webhookSubscriptionsRelations = relations(webhookSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [webhookSubscriptions.userId],
    references: [users.id],
  }),
  integration: one(integrations, {
    fields: [webhookSubscriptions.integrationId],
    references: [integrations.id],
  }),
}));

export const ideasRelations = relations(ideas, ({ one }) => ({
  user: one(users, {
    fields: [ideas.userId],
    references: [users.id],
  }),
}));

// New relations for Phase 1 tables
export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
}));

export const capturesRelations = relations(captures, ({ one }) => ({
  user: one(users, {
    fields: [captures.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [captures.projectId],
    references: [projects.id],
  }),
}));

export const streaksRelations = relations(streaks, ({ one }) => ({
  user: one(users, {
    fields: [streaks.userId],
    references: [users.id],
  }),
}));

export const aiMemoryRelations = relations(aiMemory, ({ one }) => ({
  user: one(users, {
    fields: [aiMemory.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [aiMemory.projectId],
    references: [projects.id],
  }),
}));

export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  user: one(users, {
    fields: [analyticsEvents.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [analyticsEvents.projectId],
    references: [projects.id],
  }),
}));

export const documentVersionsRelations = relations(documentVersions, ({ one }) => ({
  document: one(documents, {
    fields: [documentVersions.documentId],
    references: [documents.id],
  }),
}));

// Progress Milestones relations
export const progressMilestonesRelations = relations(progressMilestones, ({ one }) => ({
  project: one(projects, {
    fields: [progressMilestones.projectId],
    references: [projects.id],
  }),
}));

// Traction Metrics relations
export const tractionMetricsRelations = relations(tractionMetrics, ({ one }) => ({
  project: one(projects, {
    fields: [tractionMetrics.projectId],
    references: [projects.id],
  }),
}));

// Daily Briefings relations
export const dailyBriefingsRelations = relations(dailyBriefings, ({ one }) => ({
  project: one(projects, {
    fields: [dailyBriefings.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [dailyBriefings.userId],
    references: [users.id],
  }),
}));

// Decisions relations
export const decisionsRelations = relations(decisions, ({ one, many }) => ({
  project: one(projects, {
    fields: [decisions.projectId],
    references: [projects.id],
  }),
  triggers: many(decisionTriggers),
}));

// Decision Triggers relations
export const decisionTriggersRelations = relations(decisionTriggers, ({ one }) => ({
  decision: one(decisions, {
    fields: [decisionTriggers.decisionId],
    references: [decisions.id],
  }),
}));
