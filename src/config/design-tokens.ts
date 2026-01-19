/**
 * Catalyst Labs Design Tokens
 * Centralized design system tokens for consistent styling across the app.
 * Use these classes instead of hardcoded colors.
 */

import { type Stage, type TaskPriority, type CaptureType } from './constants';

// ============================================
// PRIORITY COLORS
// ============================================
export const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: 'bg-priority-low-bg text-priority-low',
  medium: 'bg-priority-medium-bg text-priority-medium',
  high: 'bg-priority-high-bg text-priority-high',
  urgent: 'bg-priority-urgent-bg text-priority-urgent',
};

export const PRIORITY_DOT_COLORS: Record<TaskPriority, string> = {
  low: 'bg-priority-low',
  medium: 'bg-priority-medium',
  high: 'bg-priority-high',
  urgent: 'bg-priority-urgent',
};

// ============================================
// STAGE COLORS
// ============================================
export const STAGE_STYLES: Record<Stage, string> = {
  ideation: 'bg-stage-ideation-bg text-stage-ideation',
  mvp: 'bg-stage-mvp-bg text-stage-mvp',
  gtm: 'bg-stage-gtm-bg text-stage-gtm',
};

export const STAGE_BORDER_STYLES: Record<Stage, string> = {
  ideation: 'border-stage-ideation',
  mvp: 'border-stage-mvp',
  gtm: 'border-stage-gtm',
};

// ============================================
// RISK COLORS
// ============================================
export type RiskLevel = 'low' | 'medium' | 'high';

export const RISK_STYLES: Record<RiskLevel, string> = {
  low: 'bg-risk-low-bg text-risk-low',
  medium: 'bg-risk-medium-bg text-risk-medium',
  high: 'bg-risk-high-bg text-risk-high',
};

// ============================================
// CAPTURE TYPE COLORS
// ============================================
export const CAPTURE_TYPE_STYLES: Record<CaptureType, { bg: string; icon: string; border: string }> = {
  idea: {
    bg: 'bg-stage-ideation-bg',
    icon: 'text-stage-ideation',
    border: 'border-stage-ideation/30',
  },
  note: {
    bg: 'bg-muted',
    icon: 'text-muted-foreground',
    border: 'border-border',
  },
  task: {
    bg: 'bg-priority-high-bg',
    icon: 'text-priority-high',
    border: 'border-priority-high/30',
  },
  question: {
    bg: 'bg-priority-medium-bg',
    icon: 'text-priority-medium',
    border: 'border-priority-medium/30',
  },
  resource: {
    bg: 'bg-success-muted',
    icon: 'text-success',
    border: 'border-success/30',
  },
};

// ============================================
// STATUS COLORS
// ============================================
export type StatusType = 'success' | 'warning' | 'error' | 'info';

export const STATUS_STYLES: Record<StatusType, string> = {
  success: 'bg-success-muted text-success',
  warning: 'bg-warning-muted text-warning',
  error: 'bg-destructive/10 text-destructive',
  info: 'bg-info-muted text-info',
};

// ============================================
// COMPONENT SPACING
// ============================================
export const SPACING = {
  // Page level
  page: 'p-4 sm:p-6 lg:p-8',
  pageX: 'px-4 sm:px-6 lg:px-8',
  pageY: 'py-4 sm:py-6 lg:py-8',

  // Section level
  section: 'space-y-6 sm:space-y-8',
  sectionHeader: 'space-y-1',

  // Card level
  card: 'p-4 sm:p-6',
  cardCompact: 'p-3 sm:p-4',

  // Form level
  formGroup: 'space-y-4',
  formField: 'space-y-2',

  // List level
  list: 'space-y-3',
  listCompact: 'space-y-2',

  // Grid gaps
  gridGap: 'gap-4 sm:gap-6',
  gridGapCompact: 'gap-3 sm:gap-4',
};

// ============================================
// TYPOGRAPHY
// ============================================
export const TYPOGRAPHY = {
  // Page titles
  pageTitle: 'text-xl sm:text-2xl font-bold text-foreground',
  pageSubtitle: 'text-sm text-muted-foreground',

  // Section titles
  sectionTitle: 'text-lg font-semibold text-foreground',
  sectionSubtitle: 'text-sm text-muted-foreground',

  // Card titles
  cardTitle: 'text-base font-semibold text-foreground',
  cardDescription: 'text-sm text-muted-foreground',

  // Body text
  body: 'text-sm text-foreground',
  bodyMuted: 'text-sm text-muted-foreground',
  bodySmall: 'text-xs text-muted-foreground',

  // Labels
  label: 'text-sm font-medium text-foreground',
  labelMuted: 'text-sm font-medium text-muted-foreground',
};

// ============================================
// LAYOUT PATTERNS
// ============================================
export const LAYOUT = {
  // Page header with title and action
  pageHeader: 'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4',

  // Card grid
  cardGrid: 'grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  cardGridWide: 'grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3',

  // Empty state
  emptyState: 'flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 sm:py-16 px-4',

  // Content container
  container: 'mx-auto max-w-7xl',
  containerNarrow: 'mx-auto max-w-3xl',
  containerWide: 'mx-auto max-w-screen-2xl',
};

// ============================================
// INTERACTIVE STATES
// ============================================
export const INTERACTIVE = {
  // Hover effects
  hoverCard: 'transition-all duration-200 hover:border-primary/50 hover:shadow-md',
  hoverSubtle: 'transition-colors duration-200 hover:bg-muted',

  // Focus ring
  focusRing: 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',

  // Active state
  activePress: 'active:scale-[0.98]',
};

// ============================================
// ANIMATION DURATIONS
// ============================================
export const ANIMATION = {
  fast: 'duration-150',
  normal: 'duration-200',
  slow: 'duration-300',
  verySlow: 'duration-500',
};
