import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import { buildUserContext } from '@/services/context/engine';
import { generateDailyCheckIn } from '@/services/context/analyzer';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { projectId } = body;

    const context = await buildUserContext(user.id, projectId);
    const checkIn = await generateDailyCheckIn(context);

    return NextResponse.json({ success: true, data: checkIn });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('POST /api/ai/daily-checkin error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate daily check-in' },
      { status: 500 }
    );
  }
}
