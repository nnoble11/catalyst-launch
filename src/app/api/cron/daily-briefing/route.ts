import { NextRequest, NextResponse } from 'next/server';
import {
  getUsersWithActiveProjects,
  createDailyBriefing,
  getTasksByUserId,
  getRecentActivities,
  getMilestonesByProjectId,
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

interface BriefingContent {
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
}

async function generateBriefingContent(
  userId: string,
  projectId: string,
  projectName: string
): Promise<BriefingContent> {
  // Get recent data
  const [tasks, activities, milestones] = await Promise.all([
    getTasksByUserId(userId, projectId),
    getRecentActivities(userId, projectId, 7),
    getMilestonesByProjectId(projectId),
  ]);

  // Calculate completed tasks in last 7 days
  const completedTasks = tasks.filter(
    (t) => t.status === 'done' && t.completedAt &&
    new Date(t.completedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );

  // Find recently completed milestones
  const recentMilestones = milestones.filter(
    (m) => m.isCompleted && m.completedAt &&
    new Date(m.completedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );

  // Find pending tasks that might be blockers (old, no progress)
  const oldPendingTasks = tasks.filter(
    (t) => t.status === 'in_progress' &&
    new Date(t.createdAt) < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  );

  // Find upcoming due dates
  const upcomingDue = tasks
    .filter((t) => t.dueDate && t.status !== 'done')
    .map((t) => ({
      item: t.title,
      due: t.dueDate!.toISOString().split('T')[0],
      daysUntil: Math.ceil((new Date(t.dueDate!).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
    }))
    .filter((t) => t.daysUntil >= 0 && t.daysUntil <= 7)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 3);

  // Calculate momentum score (0-100)
  const activityScore = Math.min(activities.length * 10, 40);
  const taskScore = Math.min(completedTasks.length * 15, 30);
  const milestoneScore = recentMilestones.length * 15;
  const blockerPenalty = Math.min(oldPendingTasks.length * 5, 20);
  const momentumScore = Math.max(0, Math.min(100, activityScore + taskScore + milestoneScore - blockerPenalty));

  // Generate summary based on activity
  let summary: string;
  if (momentumScore >= 70) {
    summary = `Great momentum on ${projectName}! You've been making solid progress this week.`;
  } else if (momentumScore >= 40) {
    summary = `Steady progress on ${projectName}. A few focused sessions could boost your momentum.`;
  } else {
    summary = `${projectName} needs some attention. Let's get back on track today.`;
  }

  // Generate blockers
  const blockers = oldPendingTasks.slice(0, 2).map((t) => ({
    description: `"${t.title}" has been in progress for a while`,
    suggestedAction: 'Break it down into smaller tasks or ask for help',
  }));

  // Generate insight
  let insight: BriefingContent['insight'];
  if (completedTasks.length > 0 && recentMilestones.length > 0) {
    insight = {
      observation: 'Your task completion is translating into milestone progress',
      recommendation: 'Keep this momentum going with consistent daily work',
    };
  } else if (completedTasks.length > 3) {
    insight = {
      observation: 'Lots of tasks completed, but not yet moving milestones',
      recommendation: 'Review if tasks are aligned with key milestones',
    };
  } else {
    insight = {
      observation: 'Activity has been lower than usual',
      recommendation: 'Start with a small win today to build momentum',
    };
  }

  // Generate focus suggestion
  const todayTasks = tasks.filter((t) => t.status === 'today');
  let focusSuggestion: string;
  if (todayTasks.length > 0) {
    focusSuggestion = `Focus on completing "${todayTasks[0].title}" today`;
  } else if (oldPendingTasks.length > 0) {
    focusSuggestion = `Unblock "${oldPendingTasks[0].title}" to regain momentum`;
  } else {
    focusSuggestion = 'Review your milestones and pick one task to move forward';
  }

  return {
    summary,
    progress: {
      completedTasks: completedTasks.length,
      milestonesHit: recentMilestones.map((m) => m.title),
    },
    blockers,
    upcoming: upcomingDue,
    insight,
    momentumScore,
    focusSuggestion,
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
      generated: 0,
      errors: 0,
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const user of users) {
      try {
        // Check if user has notifications enabled
        const notificationsEnabled = user.preferences?.notificationsEnabled !== false;

        if (!notificationsEnabled) {
          continue;
        }

        // Generate briefing for each active project
        for (const project of user.projects || []) {
          results.processed++;

          try {
            const content = await generateBriefingContent(user.id, project.id, project.name);

            await createDailyBriefing({
              projectId: project.id,
              userId: user.id,
              briefingDate: today,
              content,
            });

            results.generated++;
          } catch (error) {
            console.error(`Error generating briefing for project ${project.id}:`, error);
            results.errors++;
          }
        }
      } catch (error) {
        console.error(`Error processing briefings for user ${user.id}:`, error);
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Daily briefing cron completed',
        ...results,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('GET /api/cron/daily-briefing error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run daily briefing cron' },
      { status: 500 }
    );
  }
}
