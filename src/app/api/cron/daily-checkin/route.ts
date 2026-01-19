import { NextRequest, NextResponse } from 'next/server';
import { getUsersWithActiveProjects } from '@/lib/db/queries';
import { sendDailyCheckInReminder } from '@/services/notifications/sender';
import { buildUserContext } from '@/services/context/engine';
import { generateDailyCheckIn } from '@/services/context/analyzer';

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

    const users = await getUsersWithActiveProjects();
    const results = {
      processed: 0,
      notified: 0,
      errors: 0,
    };

    for (const user of users) {
      try {
        // Check if user has daily check-in notifications enabled
        const notificationsEnabled = user.preferences?.notificationsEnabled !== false;

        if (!notificationsEnabled) {
          continue;
        }

        // Get user's preferred check-in time (default to 8 AM)
        const checkInTime = user.preferences?.dailyCheckInTime ?? '08:00';
        const now = new Date();

        // Only send if within the check-in window (within the same hour as preferred time)
        const [preferredHour] = checkInTime.split(':').map(Number);
        const currentHourNum = now.getHours();

        if (Math.abs(currentHourNum - preferredHour) > 0) {
          continue;
        }

        results.processed++;

        // Get the user's most active project
        const activeProject = user.projects?.[0];

        if (activeProject) {
          // Generate personalized check-in content
          const context = await buildUserContext(user.id, activeProject.id);
          const checkIn = await generateDailyCheckIn(context);

          // Build personalized message from check-in response
          const personalizedMessage = `${checkIn.greeting} ${checkIn.reflection} Today's focus: ${checkIn.todaysFocus.join(', ')}. ${checkIn.motivationalNote}`;

          // Send notification with personalized message
          await sendDailyCheckInReminder(user.id, personalizedMessage);
          results.notified++;
        } else {
          // Send generic reminder
          await sendDailyCheckInReminder(user.id);
          results.notified++;
        }
      } catch (error) {
        console.error(`Error processing daily check-in for user ${user.id}:`, error);
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Daily check-in cron completed',
        ...results,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('GET /api/cron/daily-checkin error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run daily check-in cron' },
      { status: 500 }
    );
  }
}
