import {
  getRecentActivities,
  getUserStats,
  getStreakByType,
  getProjectsByUserId,
  getMilestonesByProjectId,
} from '@/lib/db/queries';
import { generatePredictions, getAiInsights } from '@/services/analytics/predictions';

interface WeeklyReportSection {
  title: string;
  content: string;
  highlights?: string[];
  metrics?: { label: string; value: string | number; change?: string }[];
}

interface WeeklyReport {
  userId: string;
  generatedAt: string;
  weekStart: string;
  weekEnd: string;
  sections: WeeklyReportSection[];
  overallScore: number;
  summary: string;
}

function getWeekDates(): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);
  start.setDate(start.getDate() - 7);
  return { start, end };
}

function calculateScore(data: {
  activitiesCount: number;
  milestonesCompleted: number;
  tasksCompleted: number;
  currentStreak: number;
}): number {
  let score = 0;

  // Activity score (max 30 points)
  score += Math.min(data.activitiesCount * 3, 30);

  // Milestone score (max 30 points)
  score += data.milestonesCompleted * 15;

  // Task score (max 20 points)
  score += Math.min(data.tasksCompleted * 4, 20);

  // Streak score (max 20 points)
  score += Math.min(data.currentStreak * 2, 20);

  return Math.min(score, 100);
}

export async function generateWeeklyReport(userId: string): Promise<WeeklyReport> {
  const { start, end } = getWeekDates();
  const sections: WeeklyReportSection[] = [];

  // Get activities from the past week
  const activities = await getRecentActivities(userId, undefined, 7);

  // Get stats
  const stats = await getUserStats(userId);

  // Get streak
  const streak = await getStreakByType(userId, 'daily_activity');

  // Get projects
  const projects = await getProjectsByUserId(userId);

  // Count activities by type
  const activityCounts = activities.reduce((acc, activity) => {
    acc[activity.type] = (acc[activity.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 1. Accomplishments Section
  const accomplishments: string[] = [];
  if (activityCounts['milestone_completed']) {
    accomplishments.push(`Completed ${activityCounts['milestone_completed']} milestone(s)`);
  }
  if (activityCounts['document_generated']) {
    accomplishments.push(`Generated ${activityCounts['document_generated']} document(s)`);
  }
  if (activityCounts['task_completed']) {
    accomplishments.push(`Finished ${activityCounts['task_completed']} task(s)`);
  }
  if (activityCounts['project_created']) {
    accomplishments.push(`Started ${activityCounts['project_created']} new project(s)`);
  }

  sections.push({
    title: 'Accomplishments',
    content:
      accomplishments.length > 0
        ? 'Great work this week! Here\'s what you achieved:'
        : 'No major accomplishments recorded this week. Consider setting smaller goals to track progress.',
    highlights: accomplishments,
  });

  // 2. Activity Metrics Section
  sections.push({
    title: 'Activity Metrics',
    content: 'Your engagement levels this week:',
    metrics: [
      { label: 'Total Activities', value: activities.length },
      { label: 'Active Days', value: new Set(activities.map((a) => a.createdAt.toDateString())).size },
      { label: 'Current Streak', value: `${streak?.currentStreak || 0} days` },
      { label: 'Total Points', value: streak?.totalPoints || 0 },
    ],
  });

  // 3. Project Progress Section
  const projectProgress: string[] = [];
  for (const project of projects.slice(0, 3)) {
    const milestones = await getMilestonesByProjectId(project.id);
    const completed = milestones.filter((m) => m.isCompleted).length;
    const total = milestones.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    projectProgress.push(`${project.name}: ${percentage}% complete (${completed}/${total} milestones)`);
  }

  sections.push({
    title: 'Project Progress',
    content: 'Overview of your active projects:',
    highlights: projectProgress.length > 0 ? projectProgress : ['No active projects'],
  });

  // 4. Predictions & Recommendations
  try {
    const predictions = await generatePredictions(userId);
    const insights = await getAiInsights(userId, predictions);

    sections.push({
      title: 'AI Insights',
      content: 'Based on your activity patterns:',
      highlights: insights,
    });

    if (predictions.focusAreas.length > 0) {
      sections.push({
        title: 'Recommended Focus Areas',
        content: 'Prioritize these areas for the coming week:',
        highlights: predictions.focusAreas,
      });
    }
  } catch (error) {
    console.error('Error generating predictions:', error);
  }

  // Calculate overall score
  const score = calculateScore({
    activitiesCount: activities.length,
    milestonesCompleted: activityCounts['milestone_completed'] || 0,
    tasksCompleted: activityCounts['task_completed'] || 0,
    currentStreak: streak?.currentStreak || 0,
  });

  // Generate summary
  let summary = '';
  if (score >= 80) {
    summary = 'Outstanding week! You\'re making excellent progress on your startup journey.';
  } else if (score >= 60) {
    summary = 'Good progress this week. Keep the momentum going!';
  } else if (score >= 40) {
    summary = 'Steady week. Consider setting specific goals for more focused progress.';
  } else {
    summary = 'This was a quiet week. Remember, every step forward counts!';
  }

  return {
    userId,
    generatedAt: new Date().toISOString(),
    weekStart: start.toISOString().split('T')[0],
    weekEnd: end.toISOString().split('T')[0],
    sections,
    overallScore: score,
    summary,
  };
}
