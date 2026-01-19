import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import { updateUser } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const { completed } = body;

    if (completed === undefined) {
      return NextResponse.json(
        { success: false, error: 'Completed status is required' },
        { status: 400 }
      );
    }

    const updatedUser = await updateUser(user.id, {
      onboardingCompleted: completed,
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('POST /api/user/onboarding error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update onboarding status' },
      { status: 500 }
    );
  }
}
