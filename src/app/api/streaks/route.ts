import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import { getStreaksByUserId, getStreakByType, getUserStats } from '@/lib/db/queries';
import type { StreakType } from '@/config/constants';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const streakType = searchParams.get('type') as StreakType | null;

    if (streakType) {
      const streak = await getStreakByType(user.id, streakType);
      return NextResponse.json({ success: true, data: streak });
    }

    const streaks = await getStreaksByUserId(user.id);
    const stats = await getUserStats(user.id);

    // Calculate total achievements
    const totalAchievements = streaks.reduce(
      (sum, streak) => sum + (streak.achievements?.length || 0),
      0
    );

    // Calculate total points
    const totalPoints = streaks.reduce((sum, streak) => sum + streak.totalPoints, 0);

    // Find the primary streak (daily activity)
    const primaryStreak = streaks.find((s) => s.streakType === 'daily_activity');

    return NextResponse.json({
      success: true,
      data: {
        streaks,
        summary: {
          currentStreak: primaryStreak?.currentStreak || 0,
          longestStreak: primaryStreak?.longestStreak || 0,
          totalPoints,
          totalAchievements,
          lastActivityDate: primaryStreak?.lastActivityDate,
        },
        stats,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET /api/streaks error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch streaks' },
      { status: 500 }
    );
  }
}
