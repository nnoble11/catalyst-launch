import { eq, desc, and, asc, sql, gte, lte, inArray } from 'drizzle-orm';
import { db } from './client';
import {
  users,
  projects,
  milestones,
  conversations,
  messages,
  activities,
  documents,
  notifications,
  integrations,
  ideas,
  tasks,
  captures,
  streaks,
  aiMemory,
  analyticsEvents,
  documentVersions,
  integrationSyncState,
  ingestedItems,
  webhookSubscriptions,
  progressMilestones,
  tractionMetrics,
  dailyBriefings,
  decisions,
  decisionTriggers,
} from './schema';
import type { IntegrationProvider, SyncStatus, IngestItemType } from '@/types/integrations';
import type { Stage, DocumentType, TaskStatus, TaskPriority, CaptureType, StreakType } from '@/config/constants';

// User queries
export async function getUserByClerkId(clerkId: string) {
  const result = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });
  return result;
}

export async function createUser(data: {
  clerkId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}) {
  const [user] = await db.insert(users).values(data).returning();
  return user;
}

export async function updateUser(
  userId: string,
  data: Partial<{
    name: string;
    avatarUrl: string;
    onboardingCompleted: boolean;
    preferences: typeof users.$inferSelect['preferences'];
  }>
) {
  const [user] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return user;
}

// Project queries
export async function getProjectsByUserId(userId: string) {
  return db.query.projects.findMany({
    where: eq(projects.userId, userId),
    orderBy: [desc(projects.updatedAt)],
    with: {
      milestones: {
        orderBy: [asc(milestones.order)],
      },
    },
  });
}

export async function getProjectById(projectId: string) {
  return db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: {
      milestones: {
        orderBy: [asc(milestones.order)],
      },
    },
  });
}

export async function createProject(data: {
  userId: string;
  name: string;
  description?: string;
  stage: Stage;
  metadata?: typeof projects.$inferSelect['metadata'];
}) {
  const [project] = await db.insert(projects).values(data).returning();
  return project;
}

export async function updateProject(
  projectId: string,
  data: Partial<{
    name: string;
    description: string;
    stage: Stage;
    isActive: boolean;
    metadata: typeof projects.$inferSelect['metadata'];
  }>
) {
  const [project] = await db
    .update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning();
  return project;
}

export async function deleteProject(projectId: string) {
  await db.delete(projects).where(eq(projects.id, projectId));
}

// Milestone queries
export async function getMilestonesByProjectId(projectId: string) {
  return db.query.milestones.findMany({
    where: eq(milestones.projectId, projectId),
    orderBy: [asc(milestones.order)],
  });
}

export async function createMilestone(data: {
  projectId: string;
  title: string;
  description?: string;
  dueDate?: Date;
  order?: number;
}) {
  const [milestone] = await db.insert(milestones).values(data).returning();
  return milestone;
}

export async function createMilestones(
  data: Array<{
    projectId: string;
    title: string;
    description?: string;
    order: number;
  }>
) {
  return db.insert(milestones).values(data).returning();
}

export async function updateMilestone(
  milestoneId: string,
  data: Partial<{
    title: string;
    description: string;
    isCompleted: boolean;
    completedAt: Date;
    dueDate: Date;
    order: number;
  }>
) {
  const [milestone] = await db
    .update(milestones)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(milestones.id, milestoneId))
    .returning();
  return milestone;
}

export async function deleteMilestone(milestoneId: string) {
  await db.delete(milestones).where(eq(milestones.id, milestoneId));
}

// Conversation queries
export async function getConversationsByUserId(userId: string, projectId?: string) {
  const conditions = [eq(conversations.userId, userId)];
  if (projectId) {
    conditions.push(eq(conversations.projectId, projectId));
  }

  return db.query.conversations.findMany({
    where: and(...conditions),
    orderBy: [desc(conversations.updatedAt)],
  });
}

export async function getConversationById(conversationId: string) {
  return db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
    with: {
      messages: {
        orderBy: [asc(messages.createdAt)],
      },
    },
  });
}

export async function createConversation(data: {
  userId: string;
  projectId?: string;
  title?: string;
}) {
  const [conversation] = await db.insert(conversations).values(data).returning();
  return conversation;
}

export async function updateConversation(
  conversationId: string,
  data: Partial<{
    title: string;
    summary: string;
  }>
) {
  const [conversation] = await db
    .update(conversations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(conversations.id, conversationId))
    .returning();
  return conversation;
}

export async function deleteConversation(conversationId: string) {
  // Messages will be cascade deleted due to FK constraint
  await db.delete(conversations).where(eq(conversations.id, conversationId));
}

// Message queries
export async function getMessagesByConversationId(conversationId: string, limit = 50) {
  return db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: [asc(messages.createdAt)],
    limit,
  });
}

export async function createMessage(data: {
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: typeof messages.$inferSelect['metadata'];
}) {
  const [message] = await db.insert(messages).values(data).returning();
  return message;
}

// Activity queries
export async function getActivitiesByUserId(userId: string, limit = 50) {
  return db.query.activities.findMany({
    where: eq(activities.userId, userId),
    orderBy: [desc(activities.createdAt)],
    limit,
  });
}

export async function getRecentActivities(userId: string, projectId?: string, days = 7) {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);

  const conditions = [
    eq(activities.userId, userId),
    gte(activities.createdAt, dateThreshold),
  ];

  if (projectId) {
    conditions.push(eq(activities.projectId, projectId));
  }

  return db.query.activities.findMany({
    where: and(...conditions),
    orderBy: [desc(activities.createdAt)],
  });
}

export async function createActivity(data: {
  userId: string;
  projectId?: string;
  type: typeof activities.$inferSelect['type'];
  data?: Record<string, unknown>;
}) {
  const [activity] = await db
    .insert(activities)
    .values({ ...data, data: data.data ?? {} })
    .returning();
  return activity;
}

// Document queries
export async function getDocumentsByProjectId(projectId: string) {
  return db.query.documents.findMany({
    where: eq(documents.projectId, projectId),
    orderBy: [desc(documents.updatedAt)],
  });
}

export async function getDocumentById(documentId: string) {
  return db.query.documents.findFirst({
    where: eq(documents.id, documentId),
  });
}

export async function createDocument(data: {
  userId: string;
  projectId: string;
  type: DocumentType;
  title: string;
  content: typeof documents.$inferSelect['content'];
}) {
  const [document] = await db.insert(documents).values(data).returning();
  return document;
}

export async function updateDocument(
  documentId: string,
  data: Partial<{
    title: string;
    content: typeof documents.$inferSelect['content'];
    version: number;
  }>
) {
  const [document] = await db
    .update(documents)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(documents.id, documentId))
    .returning();
  return document;
}

// Notification queries
export async function getNotificationsByUserId(userId: string, unreadOnly = false) {
  const conditions = [eq(notifications.userId, userId)];
  if (unreadOnly) {
    conditions.push(eq(notifications.isRead, false));
  }

  return db.query.notifications.findMany({
    where: and(...conditions),
    orderBy: [desc(notifications.createdAt)],
    limit: 50,
  });
}

export async function createNotification(data: {
  userId: string;
  title: string;
  message: string;
  type?: typeof notifications.$inferSelect['type'];
  actionUrl?: string;
}) {
  const [notification] = await db.insert(notifications).values(data).returning();
  return notification;
}

export async function markNotificationAsRead(notificationId: string) {
  const [notification] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, notificationId))
    .returning();
  return notification;
}

export async function markAllNotificationsAsRead(userId: string) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

// Integration queries
export async function getIntegrationsByUserId(userId: string) {
  return db.query.integrations.findMany({
    where: eq(integrations.userId, userId),
  });
}

export async function getIntegrationByProvider(
  userId: string,
  provider: typeof integrations.$inferSelect['provider']
) {
  return db.query.integrations.findFirst({
    where: and(eq(integrations.userId, userId), eq(integrations.provider, provider)),
  });
}

export async function upsertIntegration(data: {
  userId: string;
  provider: typeof integrations.$inferSelect['provider'];
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}) {
  const [integration] = await db
    .insert(integrations)
    .values(data)
    .onConflictDoUpdate({
      target: [integrations.userId, integrations.provider],
      set: { ...data, updatedAt: new Date() },
    })
    .returning();
  return integration;
}

export async function deleteIntegration(integrationId: string) {
  await db.delete(integrations).where(eq(integrations.id, integrationId));
}

// Idea queries
export async function getIdeasLeaderboard(limit = 50) {
  return db.query.ideas.findMany({
    orderBy: [desc(ideas.votes), desc(ideas.createdAt)],
    limit,
  });
}

export async function createIdea(data: {
  userId?: string;
  title: string;
  description: string;
}) {
  const [idea] = await db.insert(ideas).values(data).returning();
  return idea;
}

export async function upvoteIdea(ideaId: string) {
  const [idea] = await db
    .update(ideas)
    .set({ votes: sql`${ideas.votes} + 1` })
    .where(eq(ideas.id, ideaId))
    .returning();
  return idea;
}

// Task queries
export async function getTasksByUserId(userId: string, projectId?: string, status?: TaskStatus) {
  const conditions = [eq(tasks.userId, userId)];
  if (projectId) {
    conditions.push(eq(tasks.projectId, projectId));
  }
  if (status) {
    conditions.push(eq(tasks.status, status));
  }

  return db.query.tasks.findMany({
    where: and(...conditions),
    orderBy: [asc(tasks.order), desc(tasks.createdAt)],
    with: {
      project: true,
    },
  });
}

export async function getTaskById(taskId: string) {
  return db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: {
      project: true,
    },
  });
}

export async function createTask(data: {
  userId: string;
  projectId?: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  aiSuggested?: boolean;
  aiRationale?: string;
  order?: number;
}) {
  const [task] = await db.insert(tasks).values(data).returning();
  return task;
}

export async function updateTask(
  taskId: string,
  data: Partial<{
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: Date;
    order: number;
    completedAt: Date;
  }>
) {
  const [task] = await db
    .update(tasks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tasks.id, taskId))
    .returning();
  return task;
}

export async function deleteTask(taskId: string) {
  await db.delete(tasks).where(eq(tasks.id, taskId));
}

export async function getAiSuggestedTasks(userId: string, projectId?: string) {
  const conditions = [eq(tasks.userId, userId), eq(tasks.aiSuggested, true)];
  if (projectId) {
    conditions.push(eq(tasks.projectId, projectId));
  }

  return db.query.tasks.findMany({
    where: and(...conditions),
    orderBy: [desc(tasks.createdAt)],
    limit: 10,
  });
}

// Capture queries
export async function getCapturesByUserId(userId: string, unprocessedOnly = false) {
  const conditions = [eq(captures.userId, userId)];
  if (unprocessedOnly) {
    conditions.push(sql`${captures.processedAt} IS NULL`);
  }

  return db.query.captures.findMany({
    where: and(...conditions),
    orderBy: [desc(captures.createdAt)],
    with: {
      project: true,
    },
  });
}

export async function createCapture(data: {
  userId: string;
  projectId?: string;
  content: string;
  type?: CaptureType;
}) {
  const [capture] = await db.insert(captures).values(data).returning();
  return capture;
}

export async function updateCapture(
  captureId: string,
  data: Partial<{
    type: CaptureType;
    projectId: string;
    processedAt: Date;
    processedInto: typeof captures.$inferSelect['processedInto'];
  }>
) {
  const [capture] = await db
    .update(captures)
    .set(data)
    .where(eq(captures.id, captureId))
    .returning();
  return capture;
}

export async function deleteCapture(captureId: string) {
  await db.delete(captures).where(eq(captures.id, captureId));
}

export async function getRecentCaptures(projectId: string, daysBack: number = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  return db.query.captures.findMany({
    where: and(
      eq(captures.projectId, projectId),
      gte(captures.createdAt, cutoffDate)
    ),
    orderBy: [desc(captures.createdAt)],
    limit: 100,
  });
}

// Streak queries
export async function getStreaksByUserId(userId: string) {
  return db.query.streaks.findMany({
    where: eq(streaks.userId, userId),
  });
}

export async function getStreakByType(userId: string, streakType: StreakType) {
  return db.query.streaks.findFirst({
    where: and(eq(streaks.userId, userId), eq(streaks.streakType, streakType)),
  });
}

export async function upsertStreak(data: {
  userId: string;
  streakType: StreakType;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date;
  totalPoints?: number;
  achievements?: typeof streaks.$inferSelect['achievements'];
}) {
  const existing = await getStreakByType(data.userId, data.streakType);

  if (existing) {
    const [streak] = await db
      .update(streaks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(streaks.id, existing.id))
      .returning();
    return streak;
  }

  const [streak] = await db.insert(streaks).values(data).returning();
  return streak;
}

export async function addAchievement(
  userId: string,
  streakType: StreakType,
  achievement: { badge: string; earnedAt: string; description: string }
) {
  const existing = await getStreakByType(userId, streakType);
  if (!existing) return null;

  const currentAchievements = existing.achievements || [];
  const [streak] = await db
    .update(streaks)
    .set({
      achievements: [...currentAchievements, achievement],
      updatedAt: new Date(),
    })
    .where(eq(streaks.id, existing.id))
    .returning();
  return streak;
}

// AI Memory queries
export async function getAiMemories(userId: string, projectId?: string, category?: string) {
  const conditions = [eq(aiMemory.userId, userId)];
  if (projectId) {
    conditions.push(eq(aiMemory.projectId, projectId));
  }
  if (category) {
    conditions.push(eq(aiMemory.category, category));
  }
  // Filter out expired memories
  conditions.push(sql`(${aiMemory.expiresAt} IS NULL OR ${aiMemory.expiresAt} > NOW())`);

  return db.query.aiMemory.findMany({
    where: and(...conditions),
    orderBy: [desc(aiMemory.confidence), desc(aiMemory.updatedAt)],
  });
}

export async function getAiMemoryByKey(userId: string, key: string, projectId?: string) {
  const conditions = [eq(aiMemory.userId, userId), eq(aiMemory.key, key)];
  if (projectId) {
    conditions.push(eq(aiMemory.projectId, projectId));
  }

  return db.query.aiMemory.findFirst({
    where: and(...conditions),
  });
}

export async function upsertAiMemory(data: {
  userId: string;
  projectId?: string;
  key: string;
  value: string;
  category?: string;
  confidence?: number;
  source?: string;
  expiresAt?: Date;
}) {
  const existing = await getAiMemoryByKey(data.userId, data.key, data.projectId);

  if (existing) {
    const [memory] = await db
      .update(aiMemory)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(aiMemory.id, existing.id))
      .returning();
    return memory;
  }

  const [memory] = await db.insert(aiMemory).values(data).returning();
  return memory;
}

export async function deleteAiMemory(memoryId: string) {
  await db.delete(aiMemory).where(eq(aiMemory.id, memoryId));
}

// Analytics Events queries
export async function createAnalyticsEvent(data: {
  userId: string;
  projectId?: string;
  eventType: string;
  eventData?: Record<string, unknown>;
  sessionId?: string;
}) {
  const [event] = await db
    .insert(analyticsEvents)
    .values({ ...data, eventData: data.eventData ?? {} })
    .returning();
  return event;
}

export async function getAnalyticsEvents(
  userId: string,
  options?: {
    projectId?: string;
    eventType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
) {
  const conditions = [eq(analyticsEvents.userId, userId)];

  if (options?.projectId) {
    conditions.push(eq(analyticsEvents.projectId, options.projectId));
  }
  if (options?.eventType) {
    conditions.push(eq(analyticsEvents.eventType, options.eventType));
  }
  if (options?.startDate) {
    conditions.push(gte(analyticsEvents.createdAt, options.startDate));
  }
  if (options?.endDate) {
    conditions.push(lte(analyticsEvents.createdAt, options.endDate));
  }

  return db.query.analyticsEvents.findMany({
    where: and(...conditions),
    orderBy: [desc(analyticsEvents.createdAt)],
    limit: options?.limit ?? 100,
  });
}

export async function getActivityHeatmap(userId: string, days = 365) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = await db
    .select({
      date: sql<string>`DATE(${analyticsEvents.createdAt})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.userId, userId), gte(analyticsEvents.createdAt, startDate)))
    .groupBy(sql`DATE(${analyticsEvents.createdAt})`)
    .orderBy(sql`DATE(${analyticsEvents.createdAt})`);

  return result;
}

// Document Version queries
export async function getDocumentVersions(documentId: string) {
  return db.query.documentVersions.findMany({
    where: eq(documentVersions.documentId, documentId),
    orderBy: [desc(documentVersions.version)],
  });
}

export async function createDocumentVersion(data: {
  documentId: string;
  version: number;
  content: typeof documentVersions.$inferSelect['content'];
  changeDescription?: string;
}) {
  const [version] = await db.insert(documentVersions).values(data).returning();
  return version;
}

export async function getDocumentVersion(documentId: string, version: number) {
  return db.query.documentVersions.findFirst({
    where: and(eq(documentVersions.documentId, documentId), eq(documentVersions.version, version)),
  });
}

// Aggregate queries for analytics
export async function getUserStats(userId: string) {
  const [projectCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(projects)
    .where(eq(projects.userId, userId));

  const [completedMilestones] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(milestones)
    .innerJoin(projects, eq(milestones.projectId, projects.id))
    .where(and(eq(projects.userId, userId), eq(milestones.isCompleted, true)));

  const [documentCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(documents)
    .where(eq(documents.userId, userId));

  const [taskCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.status, 'done')));

  return {
    projects: projectCount?.count ?? 0,
    completedMilestones: completedMilestones?.count ?? 0,
    documents: documentCount?.count ?? 0,
    completedTasks: taskCount?.count ?? 0,
  };
}

// Get users with active projects for cron jobs
export async function getUsersWithActiveProjects() {
  return db.query.users.findMany({
    with: {
      projects: {
        where: eq(projects.isActive, true),
      },
    },
  });
}

// Get stalled projects (no activity in X days)
export async function getStalledProjects(days = 2) {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);

  const result = await db
    .select({
      projectId: projects.id,
      projectName: projects.name,
      userId: projects.userId,
      lastActivity: sql<Date>`MAX(${activities.createdAt})`,
    })
    .from(projects)
    .leftJoin(activities, eq(projects.id, activities.projectId))
    .where(eq(projects.isActive, true))
    .groupBy(projects.id, projects.name, projects.userId)
    .having(sql`MAX(${activities.createdAt}) < ${dateThreshold.toISOString()} OR MAX(${activities.createdAt}) IS NULL`);

  return result;
}

// Get stuck milestones (same milestone for X days)
export async function getStuckMilestones(days = 7) {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);

  return db.query.milestones.findMany({
    where: and(
      eq(milestones.isCompleted, false),
      lte(milestones.createdAt, dateThreshold)
    ),
    with: {
      project: {
        with: {
          user: true,
        },
      },
    },
  });
}

// ===========================================
// Integration Sync State queries
// ===========================================

export async function getIntegrationSyncState(integrationId: string) {
  return db.query.integrationSyncState.findFirst({
    where: eq(integrationSyncState.integrationId, integrationId),
  });
}

export async function getSyncStatesByUserId(userId: string) {
  return db.query.integrationSyncState.findMany({
    where: eq(integrationSyncState.userId, userId),
    with: {
      integration: true,
    },
  });
}

export async function getSyncStateByProvider(userId: string, provider: IntegrationProvider) {
  return db.query.integrationSyncState.findFirst({
    where: and(
      eq(integrationSyncState.userId, userId),
      eq(integrationSyncState.provider, provider)
    ),
    with: {
      integration: true,
    },
  });
}

export async function upsertSyncState(data: {
  userId: string;
  integrationId: string;
  provider: IntegrationProvider;
  status?: SyncStatus;
  lastSyncAt?: Date;
  nextSyncAt?: Date;
  lastSuccessfulSyncAt?: Date;
  cursor?: string;
  lastItemId?: string;
  lastItemTimestamp?: Date;
  errorCount?: number;
  lastError?: string;
  lastErrorAt?: Date;
  totalItemsSynced?: number;
  itemsSyncedThisRun?: number;
}) {
  const existing = await getIntegrationSyncState(data.integrationId);

  if (existing) {
    const [syncState] = await db
      .update(integrationSyncState)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(integrationSyncState.id, existing.id))
      .returning();
    return syncState;
  }

  const [syncState] = await db.insert(integrationSyncState).values(data).returning();
  return syncState;
}

export async function updateSyncStateStatus(
  integrationId: string,
  status: SyncStatus,
  error?: string
) {
  const updates: Partial<typeof integrationSyncState.$inferSelect> = {
    status,
    updatedAt: new Date(),
  };

  if (status === 'completed') {
    updates.lastSuccessfulSyncAt = new Date();
    updates.lastSyncAt = new Date();
    updates.errorCount = 0;
    updates.lastError = undefined;
  } else if (status === 'failed' && error) {
    updates.lastError = error;
    updates.lastErrorAt = new Date();
    updates.lastSyncAt = new Date();
  }

  const [syncState] = await db
    .update(integrationSyncState)
    .set(updates)
    .where(eq(integrationSyncState.integrationId, integrationId))
    .returning();
  return syncState;
}

export async function startSyncIfNotRunning(integrationId: string) {
  const [syncState] = await db
    .update(integrationSyncState)
    .set({
      status: 'syncing',
      lastSyncAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(
      eq(integrationSyncState.integrationId, integrationId),
      inArray(integrationSyncState.status, ['pending', 'completed', 'failed'])
    ))
    .returning();
  return syncState ?? null;
}

export async function incrementSyncErrorCount(integrationId: string, error: string) {
  const existing = await getIntegrationSyncState(integrationId);
  const currentCount = existing?.errorCount ?? 0;

  const [syncState] = await db
    .update(integrationSyncState)
    .set({
      errorCount: currentCount + 1,
      lastError: error,
      lastErrorAt: new Date(),
      status: currentCount + 1 >= 5 ? 'paused' : 'failed',
      updatedAt: new Date(),
    })
    .where(eq(integrationSyncState.integrationId, integrationId))
    .returning();
  return syncState;
}

export async function getPendingSyncs(limit = 10) {
  const now = new Date();
  return db.query.integrationSyncState.findMany({
    where: and(
      eq(integrationSyncState.status, 'pending'),
      lte(integrationSyncState.nextSyncAt, now)
    ),
    orderBy: [asc(integrationSyncState.nextSyncAt)],
    limit,
    with: {
      integration: true,
    },
  });
}

// ===========================================
// Ingested Items queries
// ===========================================

export async function getIngestedItemBySourceId(
  integrationId: string,
  sourceId: string
) {
  return db.query.ingestedItems.findFirst({
    where: and(
      eq(ingestedItems.integrationId, integrationId),
      eq(ingestedItems.sourceId, sourceId)
    ),
  });
}

export async function getIngestedItemsByIntegration(
  integrationId: string,
  options?: {
    status?: 'pending' | 'processed' | 'skipped' | 'failed';
    limit?: number;
    offset?: number;
  }
) {
  const conditions = [eq(ingestedItems.integrationId, integrationId)];
  if (options?.status) {
    conditions.push(eq(ingestedItems.status, options.status));
  }

  return db.query.ingestedItems.findMany({
    where: and(...conditions),
    orderBy: [desc(ingestedItems.createdAt)],
    limit: options?.limit ?? 100,
    offset: options?.offset ?? 0,
  });
}

export async function getIngestedItemsByUserId(
  userId: string,
  options?: {
    provider?: IntegrationProvider;
    itemType?: IngestItemType;
    status?: 'pending' | 'processed' | 'skipped' | 'failed';
    limit?: number;
  }
) {
  const conditions = [eq(ingestedItems.userId, userId)];
  if (options?.provider) {
    conditions.push(eq(ingestedItems.provider, options.provider));
  }
  if (options?.itemType) {
    conditions.push(eq(ingestedItems.itemType, options.itemType));
  }
  if (options?.status) {
    conditions.push(eq(ingestedItems.status, options.status));
  }

  return db.query.ingestedItems.findMany({
    where: and(...conditions),
    orderBy: [desc(ingestedItems.createdAt)],
    limit: options?.limit ?? 100,
    with: {
      integration: true,
      capture: true,
    },
  });
}

export async function createIngestedItem(data: {
  userId: string;
  integrationId: string;
  provider: IntegrationProvider;
  sourceId: string;
  sourceHash?: string;
  sourceUrl?: string;
  itemType: IngestItemType;
  title?: string;
  content?: string;
  rawData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  status?: 'pending' | 'processed' | 'skipped' | 'failed';
}) {
  const [inserted] = await db
    .insert(ingestedItems)
    .values(data)
    .onConflictDoNothing({
      target: [ingestedItems.integrationId, ingestedItems.sourceId],
    })
    .returning();

  if (inserted) {
    return { item: inserted, isNew: true, updated: false };
  }

  const existing = await getIngestedItemBySourceId(data.integrationId, data.sourceId);
  if (!existing) {
    const [fallback] = await db.insert(ingestedItems).values(data).returning();
    return { item: fallback, isNew: true, updated: false };
  }

  if (data.sourceHash && data.sourceHash !== existing.sourceHash) {
    const [item] = await db
      .update(ingestedItems)
      .set({
        ...data,
        status: 'pending',
        updatedAt: new Date(),
      })
      .where(eq(ingestedItems.id, existing.id))
      .returning();
    return { item, isNew: false, updated: true };
  }

  return { item: existing, isNew: false, updated: false };
}

export async function updateIngestedItem(
  itemId: string,
  data: Partial<{
    status: 'pending' | 'processed' | 'skipped' | 'failed';
    captureId: string;
    memoryIds: string[];
    taskIds: string[];
    processedAt: Date;
    error: string;
  }>
) {
  const [item] = await db
    .update(ingestedItems)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(ingestedItems.id, itemId))
    .returning();
  return item;
}

export async function markIngestedItemProcessed(
  itemId: string,
  results: {
    captureId?: string;
    memoryIds?: string[];
    taskIds?: string[];
  }
) {
  return updateIngestedItem(itemId, {
    status: 'processed',
    processedAt: new Date(),
    ...results,
  });
}

export async function getPendingIngestedItems(userId: string, limit = 50) {
  return db.query.ingestedItems.findMany({
    where: and(
      eq(ingestedItems.userId, userId),
      eq(ingestedItems.status, 'pending')
    ),
    orderBy: [asc(ingestedItems.createdAt)],
    limit,
    with: {
      integration: true,
    },
  });
}

// ===========================================
// Webhook Subscription queries
// ===========================================

export async function getWebhookSubscription(integrationId: string) {
  return db.query.webhookSubscriptions.findFirst({
    where: eq(webhookSubscriptions.integrationId, integrationId),
  });
}

export async function getWebhookSubscriptionsByUserId(userId: string) {
  return db.query.webhookSubscriptions.findMany({
    where: eq(webhookSubscriptions.userId, userId),
    with: {
      integration: true,
    },
  });
}

export async function getActiveWebhookByProvider(userId: string, provider: IntegrationProvider) {
  return db.query.webhookSubscriptions.findFirst({
    where: and(
      eq(webhookSubscriptions.userId, userId),
      eq(webhookSubscriptions.provider, provider),
      eq(webhookSubscriptions.isActive, true)
    ),
  });
}

export async function createWebhookSubscription(data: {
  userId: string;
  integrationId: string;
  provider: IntegrationProvider;
  webhookId?: string;
  webhookUrl: string;
  secret?: string;
  events: string[];
}) {
  const [subscription] = await db.insert(webhookSubscriptions).values(data).returning();
  return subscription;
}

export async function updateWebhookSubscription(
  subscriptionId: string,
  data: Partial<{
    webhookId: string;
    webhookUrl: string;
    secret: string;
    events: string[];
    isActive: boolean;
    verifiedAt: Date;
    lastReceivedAt: Date;
    errorCount: number;
    lastError: string;
    lastErrorAt: Date;
  }>
) {
  const [subscription] = await db
    .update(webhookSubscriptions)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(webhookSubscriptions.id, subscriptionId))
    .returning();
  return subscription;
}

export async function deleteWebhookSubscription(subscriptionId: string) {
  await db.delete(webhookSubscriptions).where(eq(webhookSubscriptions.id, subscriptionId));
}

export async function recordWebhookReceived(subscriptionId: string) {
  const [subscription] = await db
    .update(webhookSubscriptions)
    .set({
      lastReceivedAt: new Date(),
      errorCount: 0,
      updatedAt: new Date(),
    })
    .where(eq(webhookSubscriptions.id, subscriptionId))
    .returning();
  return subscription;
}

export async function recordWebhookError(subscriptionId: string, error: string) {
  const existing = await db.query.webhookSubscriptions.findFirst({
    where: eq(webhookSubscriptions.id, subscriptionId),
  });
  const currentCount = existing?.errorCount ?? 0;

  const [subscription] = await db
    .update(webhookSubscriptions)
    .set({
      errorCount: currentCount + 1,
      lastError: error,
      lastErrorAt: new Date(),
      isActive: currentCount + 1 < 10, // Disable after 10 consecutive errors
      updatedAt: new Date(),
    })
    .where(eq(webhookSubscriptions.id, subscriptionId))
    .returning();
  return subscription;
}

// ===========================================
// Integration Statistics queries
// ===========================================

export async function getIntegrationStats(userId: string, provider?: IntegrationProvider) {
  const conditions = [eq(ingestedItems.userId, userId)];
  if (provider) {
    conditions.push(eq(ingestedItems.provider, provider));
  }

  const result = await db
    .select({
      provider: ingestedItems.provider,
      total: sql<number>`COUNT(*)`,
      processed: sql<number>`COUNT(*) FILTER (WHERE ${ingestedItems.status} = 'processed')`,
      pending: sql<number>`COUNT(*) FILTER (WHERE ${ingestedItems.status} = 'pending')`,
      failed: sql<number>`COUNT(*) FILTER (WHERE ${ingestedItems.status} = 'failed')`,
    })
    .from(ingestedItems)
    .where(and(...conditions))
    .groupBy(ingestedItems.provider);

  return result;
}

// ===========================================
// Progress Milestones queries
// ===========================================

export async function getProgressMilestonesByProject(projectId: string) {
  return db.query.progressMilestones.findMany({
    where: eq(progressMilestones.projectId, projectId),
    orderBy: [desc(progressMilestones.achievedAt)],
  });
}

export async function createProgressMilestone(data: {
  projectId: string;
  milestoneType: typeof progressMilestones.$inferSelect['milestoneType'];
  customTitle?: string;
  evidence?: typeof progressMilestones.$inferSelect['evidence'];
  visibility?: string;
}) {
  const [milestone] = await db.insert(progressMilestones).values(data).returning();
  return milestone;
}

export async function updateProgressMilestone(
  milestoneId: string,
  data: Partial<{
    celebrated: boolean;
    visibility: string;
  }>
) {
  const [milestone] = await db
    .update(progressMilestones)
    .set(data)
    .where(eq(progressMilestones.id, milestoneId))
    .returning();
  return milestone;
}

export async function getProgressFeed(limit = 50) {
  // Get public/cohort visible milestones with project and user info
  const result = await db
    .select({
      id: progressMilestones.id,
      projectId: progressMilestones.projectId,
      milestoneType: progressMilestones.milestoneType,
      customTitle: progressMilestones.customTitle,
      achievedAt: progressMilestones.achievedAt,
      evidence: progressMilestones.evidence,
      celebrated: progressMilestones.celebrated,
      visibility: progressMilestones.visibility,
      createdAt: progressMilestones.createdAt,
      projectName: projects.name,
      userId: users.id,
      userName: users.name,
      userAvatarUrl: users.avatarUrl,
    })
    .from(progressMilestones)
    .innerJoin(projects, eq(progressMilestones.projectId, projects.id))
    .innerJoin(users, eq(projects.userId, users.id))
    .where(sql`${progressMilestones.visibility} IN ('cohort', 'public')`)
    .orderBy(desc(progressMilestones.achievedAt))
    .limit(limit);

  // Transform to expected format
  return result.map((row) => ({
    id: row.id,
    milestone: {
      id: row.id,
      projectId: row.projectId,
      milestoneType: row.milestoneType,
      customTitle: row.customTitle,
      achievedAt: row.achievedAt,
      evidence: row.evidence,
      celebrated: row.celebrated,
      visibility: row.visibility,
      createdAt: row.createdAt,
    },
    project: {
      id: row.projectId,
      name: row.projectName,
    },
    user: {
      id: row.userId,
      name: row.userName,
      avatarUrl: row.userAvatarUrl,
    },
  }));
}

// ===========================================
// Traction Metrics queries
// ===========================================

export async function getTractionMetrics(projectId: string, limit = 30) {
  return db.query.tractionMetrics.findMany({
    where: eq(tractionMetrics.projectId, projectId),
    orderBy: [desc(tractionMetrics.metricDate)],
    limit,
  });
}

export async function createTractionMetrics(data: {
  projectId: string;
  metricDate?: Date;
  customers?: number;
  revenueCents?: number;
  mrrCents?: number;
  activeUsers?: number;
  conversationsCount?: number;
  npsScore?: number;
  customMetrics?: Record<string, number | string>;
}) {
  const [metrics] = await db
    .insert(tractionMetrics)
    .values({ ...data, metricDate: data.metricDate ?? new Date() })
    .returning();
  return metrics;
}

export async function getLatestTractionMetrics(projectId: string) {
  return db.query.tractionMetrics.findFirst({
    where: eq(tractionMetrics.projectId, projectId),
    orderBy: [desc(tractionMetrics.metricDate)],
  });
}

// ===========================================
// Daily Briefings queries
// ===========================================

export async function getDailyBriefings(userId: string, projectId?: string, limit = 7) {
  const conditions = [eq(dailyBriefings.userId, userId)];
  if (projectId) {
    conditions.push(eq(dailyBriefings.projectId, projectId));
  }

  return db.query.dailyBriefings.findMany({
    where: and(...conditions),
    orderBy: [desc(dailyBriefings.briefingDate)],
    limit,
  });
}

export async function createDailyBriefing(data: {
  projectId: string;
  userId: string;
  briefingDate: Date;
  content: typeof dailyBriefings.$inferSelect['content'];
  audioUrl?: string;
}) {
  const [briefing] = await db.insert(dailyBriefings).values(data).returning();
  return briefing;
}

export async function markBriefingAsRead(briefingId: string) {
  const [briefing] = await db
    .update(dailyBriefings)
    .set({ readAt: new Date() })
    .where(eq(dailyBriefings.id, briefingId))
    .returning();
  return briefing;
}

export async function getLatestBriefing(userId: string, projectId: string) {
  return db.query.dailyBriefings.findFirst({
    where: and(
      eq(dailyBriefings.userId, userId),
      eq(dailyBriefings.projectId, projectId)
    ),
    orderBy: [desc(dailyBriefings.briefingDate)],
  });
}

// ===========================================
// Decisions queries
// ===========================================

export async function getDecisionsByProject(projectId: string, status?: typeof decisions.$inferSelect['status']) {
  const conditions = [eq(decisions.projectId, projectId)];
  if (status) {
    conditions.push(eq(decisions.status, status));
  }

  return db.query.decisions.findMany({
    where: and(...conditions),
    orderBy: [desc(decisions.urgencyScore), desc(decisions.createdAt)],
    with: {
      triggers: true,
    },
  });
}

export async function getPendingDecisions(projectId: string) {
  return getDecisionsByProject(projectId, 'pending');
}

export async function createDecision(data: {
  projectId: string;
  title: string;
  context: string;
  tradeoffs: typeof decisions.$inferSelect['tradeoffs'];
  recommendedAction?: string;
  urgencyScore: number;
  impactScore: number;
  category: typeof decisions.$inferSelect['category'];
  dueDate?: Date;
}) {
  const [decision] = await db.insert(decisions).values(data).returning();
  return decision;
}

export async function updateDecision(
  decisionId: string,
  data: Partial<{
    status: typeof decisions.$inferSelect['status'];
    decisionMade: string;
    decidedAt: Date;
  }>
) {
  const [decision] = await db
    .update(decisions)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(decisions.id, decisionId))
    .returning();
  return decision;
}

export async function createDecisionTrigger(data: {
  decisionId: string;
  triggerType: typeof decisionTriggers.$inferSelect['triggerType'];
  triggerData?: Record<string, unknown>;
}) {
  const [trigger] = await db.insert(decisionTriggers).values(data).returning();
  return trigger;
}
