import { NextRequest, NextResponse } from 'next/server';
import {
  getUsersWithActiveProjects,
  getRecentActivities,
  getUserStats,
  getStreakByType,
  createNotification
} from '@/lib/db/queries';

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured');
    return process.env.NODE_ENV === 'development';
  }

  return authHeader === `Bearer ${cronSecret}`;
}

interface WeeklyReportData {
  activitiesCount: number;
  milestonesCompleted: number;
  documentsGenerated: number;
  tasksCompleted: number;
  currentStreak: number;
  topAccomplishments: string[];
  suggestedFocus: string[];
}

async function generateWeeklyReport(userId: string): Promise<WeeklyReportData> {
  // Get activities from the past week
  const activities = await getRecentActivities(userId, undefined, 7);

  // Get user stats
  const stats = await getUserStats(userId);

  // Get current streak
  const streak = await getStreakByType(userId, 'daily_activity');

  // Count activities by type
  const activityCounts = activities.reduce((acc, activity) => {
    acc[activity.type] = (acc[activity.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Generate accomplishments based on activities
  const topAccomplishments: string[] = [];
  if (activityCounts['milestone_completed']) {
    topAccomplishments.push(`Completed ${activityCounts['milestone_completed']} milestone(s)`);
  }
  if (activityCounts['document_generated']) {
    topAccomplishments.push(`Generated ${activityCounts['document_generated']} document(s)`);
  }
  if (activityCounts['task_completed']) {
    topAccomplishments.push(`Completed ${activityCounts['task_completed']} task(s)`);
  }
  if (activityCounts['project_created']) {
    topAccomplishments.push(`Started ${activityCounts['project_created']} new project(s)`);
  }

  // Generate suggested focus areas
  const suggestedFocus: string[] = [];
  if (!activityCounts['milestone_completed']) {
    suggestedFocus.push('Focus on completing a milestone this week');
  }
  if (!activityCounts['document_generated']) {
    suggestedFocus.push('Generate a key document for your project');
  }
  if (activities.length < 5) {
    suggestedFocus.push('Try to maintain daily engagement with your project');
  }

  return {
    activitiesCount: activities.length,
    milestonesCompleted: activityCounts['milestone_completed'] || 0,
    documentsGenerated: activityCounts['document_generated'] || 0,
    tasksCompleted: activityCounts['task_completed'] || 0,
    currentStreak: streak?.currentStreak || 0,
    topAccomplishments,
    suggestedFocus,
  };
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const users = await getUsersWithActiveProjects();
    const results = {
      processed: 0,
      reportsSent: 0,
      errors: 0,
    };

    for (const user of users) {
      try {
        // Skip if notifications are disabled
        if (user.preferences?.notificationsEnabled === false) {
          continue;
        }

        results.processed++;

        const report = await generateWeeklyReport(user.id);

        // Build notification message
        let message = 'Here\'s your weekly progress summary:\n\n';

        if (report.topAccomplishments.length > 0) {
          message += `Accomplishments: ${report.topAccomplishments.join(', ')}. `;
        } else {
          message += 'No major accomplishments this week. ';
        }

        if (report.currentStreak > 0) {
          message += `Current streak: ${report.currentStreak} days! `;
        }

        if (report.suggestedFocus.length > 0) {
          message += `\n\nFocus areas: ${report.suggestedFocus[0]}`;
        }

        await createNotification({
          userId: user.id,
          title: 'Your Weekly Progress Report',
          message,
          type: 'weekly_report',
          actionUrl: '/analytics',
        });

        results.reportsSent++;
      } catch (error) {
        console.error(`Error generating weekly report for user ${user.id}:`, error);
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Weekly report cron completed',
        ...results,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('GET /api/cron/weekly-report error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run weekly report cron' },
      { status: 500 }
    );
  }
}
