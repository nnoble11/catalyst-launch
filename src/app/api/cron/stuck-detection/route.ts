import { NextRequest, NextResponse } from 'next/server';
import { getStalledProjects, getStuckMilestones, createNotification } from '@/lib/db/queries';

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

export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const results = {
      stalledProjects: 0,
      stuckMilestones: 0,
      notificationsSent: 0,
      errors: 0,
    };

    // Check for stalled projects (no activity in 48+ hours)
    const stalledProjects = await getStalledProjects(2);
    results.stalledProjects = stalledProjects.length;

    for (const project of stalledProjects) {
      try {
        await createNotification({
          userId: project.userId,
          title: 'Project Needs Attention',
          message: `Your project "${project.projectName}" hasn't had any activity in the last 48 hours. Would you like to chat about what's blocking you?`,
          type: 'stuck_alert',
          actionUrl: `/projects/${project.projectId}`,
        });
        results.notificationsSent++;
      } catch (error) {
        console.error(`Error sending stalled project notification:`, error);
        results.errors++;
      }
    }

    // Check for stuck milestones (same milestone for 7+ days)
    const stuckMilestones = await getStuckMilestones(7);
    results.stuckMilestones = stuckMilestones.length;

    // Group stuck milestones by user to avoid notification spam
    const userMilestones = new Map<string, typeof stuckMilestones>();
    for (const milestone of stuckMilestones) {
      const userId = milestone.project?.user?.id;
      if (!userId) continue;

      if (!userMilestones.has(userId)) {
        userMilestones.set(userId, []);
      }
      userMilestones.get(userId)!.push(milestone);
    }

    for (const [userId, milestones] of userMilestones) {
      try {
        const milestoneNames = milestones.slice(0, 3).map(m => m.title).join(', ');
        const moreCount = milestones.length > 3 ? ` and ${milestones.length - 3} more` : '';

        await createNotification({
          userId,
          title: 'Milestones Need Attention',
          message: `Some milestones have been pending for over a week: ${milestoneNames}${moreCount}. Would you like help breaking them down into smaller tasks?`,
          type: 'stuck_alert',
          actionUrl: `/tasks`,
        });
        results.notificationsSent++;
      } catch (error) {
        console.error(`Error sending stuck milestone notification:`, error);
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Stuck detection cron completed',
        ...results,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('GET /api/cron/stuck-detection error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run stuck detection cron' },
      { status: 500 }
    );
  }
}
