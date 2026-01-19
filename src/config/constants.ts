export const APP_NAME = 'Catalyst Launch';
export const APP_DESCRIPTION = 'Your AI-powered cofounder for building startups';

export const STAGES = ['ideation', 'mvp', 'gtm'] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  ideation: 'Ideation',
  mvp: 'MVP Development',
  gtm: 'Go-to-Market',
};

export const DEFAULT_MILESTONES: Record<Stage, string[]> = {
  ideation: [
    'Define problem statement',
    'Identify target audience',
    'Validate market opportunity',
    'Create initial value proposition',
    'Outline MVP scope',
  ],
  mvp: [
    'Define core features',
    'Create technical architecture',
    'Build MVP prototype',
    'Conduct user testing',
    'Iterate based on feedback',
  ],
  gtm: [
    'Finalize pricing strategy',
    'Create marketing materials',
    'Identify launch channels',
    'Build waitlist/early access',
    'Execute launch plan',
  ],
};

export const AI_MODELS = {
  openai: {
    default: 'gpt-4o',
    fast: 'gpt-4o-mini',
  },
  anthropic: {
    default: 'claude-sonnet-4-20250514',
    fast: 'claude-3-haiku-20240307',
  },
} as const;

export const DOCUMENT_TYPES = [
  'pitch-deck',
  'prd',
  'gtm-plan',
  'competitive-analysis',
  'user-persona',
  'financial-projections',
  'investor-update',
  'product-roadmap',
  'landing-page',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  'pitch-deck': 'Pitch Deck',
  prd: 'Product Requirements Document',
  'gtm-plan': 'Go-to-Market Plan',
  'competitive-analysis': 'Competitive Analysis',
  'user-persona': 'User Persona',
  'financial-projections': 'Financial Projections',
  'investor-update': 'Investor Update',
  'product-roadmap': 'Product Roadmap',
  'landing-page': 'Landing Page Copy',
};

// Task Board Constants
export const TASK_STATUSES = ['backlog', 'today', 'in_progress', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  today: 'Today',
  in_progress: 'In Progress',
  done: 'Done',
};

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

// Quick Capture Constants
export const CAPTURE_TYPES = ['idea', 'note', 'task', 'question', 'resource'] as const;
export type CaptureType = (typeof CAPTURE_TYPES)[number];

export const CAPTURE_TYPE_LABELS: Record<CaptureType, string> = {
  idea: 'Idea',
  note: 'Note',
  task: 'Task',
  question: 'Question',
  resource: 'Resource',
};

// Streak Constants
export const STREAK_TYPES = ['daily_activity', 'milestone_completion', 'document_generation'] as const;
export type StreakType = (typeof STREAK_TYPES)[number];

export const STREAK_MILESTONES = [7, 14, 30, 60, 100, 365] as const;

export const ACHIEVEMENT_BADGES = {
  first_project: { name: 'Pioneer', description: 'Created your first project' },
  first_milestone: { name: 'Milestone Master', description: 'Completed your first milestone' },
  first_document: { name: 'Wordsmith', description: 'Generated your first document' },
  streak_7: { name: 'Week Warrior', description: '7-day activity streak' },
  streak_30: { name: 'Monthly Maven', description: '30-day activity streak' },
  streak_100: { name: 'Century Club', description: '100-day activity streak' },
  all_milestones: { name: 'Completionist', description: 'Completed all milestones in a project' },
  power_user: { name: 'Power User', description: 'Used all main features' },
} as const;

// Analytics Event Types
export const ANALYTICS_EVENT_TYPES = [
  'page_view',
  'feature_use',
  'ai_interaction',
  'document_action',
  'task_action',
  'milestone_action',
  'session_start',
  'session_end',
] as const;
export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];
