import type { Stage, DocumentType } from '@/config/constants';

// Re-export integration types from dedicated file
export type { IntegrationProvider } from './integrations';
export * from './integrations';

import type { IntegrationProvider } from './integrations';

// User types
export interface User {
  id: string;
  clerkId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  onboardingCompleted: boolean;
  preferences: UserPreferences | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  defaultAiProvider?: 'openai' | 'anthropic';
  notificationsEnabled?: boolean;
  dailyCheckInTime?: string;
}

// Project types
export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  stage: Stage;
  isActive: boolean;
  metadata: ProjectMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMetadata {
  targetAudience?: string;
  problemStatement?: string;
  valueProposition?: string;
  competitors?: string[];
  goals?: string[];
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  stage: Stage;
  metadata?: ProjectMetadata;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  stage?: Stage;
  isActive?: boolean;
  metadata?: ProjectMetadata;
}

// Milestone types
export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  isCompleted: boolean;
  completedAt: Date | null;
  dueDate: Date | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMilestoneInput {
  title: string;
  description?: string;
  dueDate?: Date;
  order?: number;
}

// Conversation types
export interface Conversation {
  id: string;
  userId: string;
  projectId: string | null;
  title: string | null;
  summary: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: MessageMetadata | null;
  createdAt: Date;
}

export interface MessageMetadata {
  model?: string;
  tokens?: {
    prompt: number;
    completion: number;
  };
  actionsTaken?: string[];
}

// Activity types
export interface Activity {
  id: string;
  userId: string;
  projectId: string | null;
  type: ActivityType;
  data: Record<string, unknown>;
  createdAt: Date;
}

export type ActivityType =
  | 'project_created'
  | 'milestone_completed'
  | 'document_generated'
  | 'chat_message'
  | 'login'
  | 'task_created'
  | 'task_completed'
  | 'idea_submitted'
  | 'capture_created'
  | 'streak_updated';

// Document types
export interface Document {
  id: string;
  userId: string;
  projectId: string;
  type: DocumentType;
  title: string;
  content: DocumentContent;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentContent {
  sections: DocumentSection[];
  metadata?: Record<string, unknown>;
}

export interface DocumentSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  actionUrl: string | null;
  createdAt: Date;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'reminder' | 'suggestion' | 'stuck_alert' | 'streak_milestone' | 'weekly_report';

// Integration types
export interface Integration {
  id: string;
  userId: string;
  provider: IntegrationProvider;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

// Idea types (for leaderboard)
export interface Idea {
  id: string;
  userId: string | null;
  title: string;
  description: string;
  votes: number;
  createdAt: Date;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// AI context types
export interface UserContext {
  recentActivity: Activity[];
  currentProject: Project | null;
  projectMilestones: Milestone[];
  conversationHistory: Message[];
  patterns: ContextPattern[];
}

export interface ContextPattern {
  type: 'stall' | 'momentum' | 'milestone_near' | 'inactive';
  description: string;
  confidence: number;
  suggestedAction?: string;
}

// Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface StreamChunk {
  type: 'text' | 'done' | 'error';
  content?: string;
  error?: string;
}

// Task types
export interface Task {
  id: string;
  userId: string;
  projectId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  aiSuggested: boolean;
  aiRationale: string | null;
  order: number;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskStatus = 'backlog' | 'today' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// Capture types
export interface Capture {
  id: string;
  userId: string;
  projectId: string | null;
  content: string;
  type: CaptureType;
  processedAt: Date | null;
  processedInto: {
    taskId?: string;
    noteId?: string;
    actionTaken?: string;
  } | null;
  createdAt: Date;
}

export type CaptureType = 'idea' | 'note' | 'task' | 'question' | 'resource';

// Streak types
export interface Streak {
  id: string;
  userId: string;
  streakType: StreakTypeValue;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date | null;
  totalPoints: number;
  achievements: Achievement[];
  createdAt: Date;
  updatedAt: Date;
}

export type StreakTypeValue = 'daily_activity' | 'milestone_completion' | 'document_generation';

export interface Achievement {
  badge: string;
  earnedAt: string;
  description: string;
}

// AI Memory types
export interface AiMemory {
  id: string;
  userId: string;
  projectId: string | null;
  key: string;
  value: string;
  category: string | null;
  confidence: number;
  source: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Analytics types
export interface AnalyticsEvent {
  id: string;
  userId: string;
  projectId: string | null;
  eventType: string;
  eventData: Record<string, unknown>;
  sessionId: string | null;
  createdAt: Date;
}

export interface HeatmapData {
  date: string;
  count: number;
}

// Stuck Detection types
export interface StuckIndicator {
  type: 'no_activity' | 'stuck_milestone' | 'declining_activity' | 'repeated_failures';
  severity: 'low' | 'medium' | 'high';
  description: string;
  daysSinceActivity?: number;
  affectedItems?: string[];
  suggestedActions: string[];
}

export interface StuckAnalysis {
  isStuck: boolean;
  overallSeverity: 'none' | 'low' | 'medium' | 'high';
  indicators: StuckIndicator[];
  encouragement: string;
  nextSteps: string[];
  resources: {
    title: string;
    description: string;
    type: 'template' | 'guide' | 'exercise';
  }[];
}

// Proactive Coach types
export interface CoachSuggestion {
  id: string;
  type: 'task' | 'resource' | 'reflection' | 'breakthrough';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionUrl?: string;
  dismissed: boolean;
}

export interface BreakthroughSession {
  projectId: string;
  stuckIndicators: StuckIndicator[];
  questions: string[];
  exercises: {
    title: string;
    description: string;
    duration: string;
  }[];
  resources: string[];
}
