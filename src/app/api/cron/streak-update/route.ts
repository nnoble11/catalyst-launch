import { NextRequest, NextResponse } from 'next/server';
import {
  getUsersWithActiveProjects,
  getRecentActivities,
  upsertStreak,
  addAchievement,
  createNotification
} from '@/lib/db/queries';
import { ACHIEVEMENT_BADGES, STREAK_MILESTONES } from '@/config/constants';

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

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
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
      streaksUpdated: 0,
      streaksReset: 0,
      achievementsAwarded: 0,
      errors: 0,
    };

    for (const user of users) {
      try {
        results.processed++;

        // Get activities from the last 2 days to determine streak status
        const recentActivities = await getRecentActivities(user.id, undefined, 2);

        // Check if user had activity today
        const hadActivityToday = recentActivities.some(a => isToday(a.createdAt));
        const hadActivityYesterday = recentActivities.some(a => isYesterday(a.createdAt));

        // Calculate points based on activities
        const activityPoints: Record<string, number> = {
          'project_created': 10,
          'milestone_completed': 25,
          'document_generated': 15,
          'chat_message': 2,
          'task_completed': 5,
          'capture_created': 3,
        };

        const todaysActivities = recentActivities.filter(a => isToday(a.createdAt));
        const pointsEarned = todaysActivities.reduce((sum, activity) => {
          return sum + (activityPoints[activity.type] || 1);
        }, 0);

        // Get or create streak
        const existingStreakData = await import('@/lib/db/queries').then(m =>
          m.getStreakByType(user.id, 'daily_activity')
        );

        let currentStreak = existingStreakData?.currentStreak || 0;
        let longestStreak = existingStreakData?.longestStreak || 0;
        let totalPoints = existingStreakData?.totalPoints || 0;

        if (hadActivityToday) {
          // Check if this is a continuation of streak
          const lastActivityDate = existingStreakData?.lastActivityDate;

          if (lastActivityDate) {
            if (isYesterday(lastActivityDate) || isToday(lastActivityDate)) {
              // Continue streak
              if (!isToday(lastActivityDate)) {
                currentStreak++;
              }
            } else {
              // Streak was broken, start fresh
              currentStreak = 1;
              results.streaksReset++;
            }
          } else {
            // First activity ever
            currentStreak = 1;
          }

          // Update longest streak if needed
          if (currentStreak > longestStreak) {
            longestStreak = currentStreak;
          }

          // Add today's points
          totalPoints += pointsEarned;

          results.streaksUpdated++;
        } else if (!hadActivityYesterday && currentStreak > 0) {
          // No activity yesterday or today - streak is broken
          currentStreak = 0;
          results.streaksReset++;
        }

        // Update streak in database
        await upsertStreak({
          userId: user.id,
          streakType: 'daily_activity',
          currentStreak,
          longestStreak,
          lastActivityDate: hadActivityToday ? new Date() : (existingStreakData?.lastActivityDate || new Date()),
          totalPoints,
        });

        // Check for streak milestones and award achievements
        for (const milestone of STREAK_MILESTONES) {
          if (currentStreak === milestone) {
            const badgeKey = `streak_${milestone}` as keyof typeof ACHIEVEMENT_BADGES;
            const badge = ACHIEVEMENT_BADGES[badgeKey];

            if (badge) {
              // Check if user already has this achievement
              const existingAchievements = existingStreakData?.achievements || [];
              const alreadyHas = existingAchievements.some(a => a.badge === badgeKey);

              if (!alreadyHas) {
                await addAchievement(user.id, 'daily_activity', {
                  badge: badgeKey,
                  earnedAt: new Date().toISOString(),
                  description: badge.description,
                });

                // Send notification about achievement
                await createNotification({
                  userId: user.id,
                  title: `Achievement Unlocked: ${badge.name}!`,
                  message: `Congratulations! You've earned the "${badge.name}" badge for ${badge.description.toLowerCase()}.`,
                  type: 'streak_milestone',
                  actionUrl: '/analytics',
                });

                results.achievementsAwarded++;
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error updating streak for user ${user.id}:`, error);
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Streak update cron completed',
        ...results,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('GET /api/cron/streak-update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run streak update cron' },
      { status: 500 }
    );
  }
}
