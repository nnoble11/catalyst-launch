import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import {
  getDailyBriefings,
  getLatestBriefing,
  markBriefingAsRead,
  getProjectById,
} from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const latest = searchParams.get('latest') === 'true';
    const limit = parseInt(searchParams.get('limit') || '7', 10);

    if (latest && projectId) {
      // Verify project belongs to user
      const project = await getProjectById(projectId);
      if (!project || project.userId !== user.id) {
        return NextResponse.json(
          { success: false, error: 'Project not found' },
          { status: 404 }
        );
      }

      const briefing = await getLatestBriefing(user.id, projectId);
      return NextResponse.json({ success: true, data: briefing });
    }

    // Get all briefings for user (optionally filtered by project)
    const briefings = await getDailyBriefings(
      user.id,
      projectId || undefined,
      Math.min(limit, 30)
    );

    return NextResponse.json({ success: true, data: briefings });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET /api/briefings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch briefings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { briefingId } = body;

    if (!briefingId) {
      return NextResponse.json(
        { success: false, error: 'Briefing ID is required' },
        { status: 400 }
      );
    }

    // Mark briefing as read
    const briefing = await markBriefingAsRead(briefingId);

    if (!briefing) {
      return NextResponse.json(
        { success: false, error: 'Briefing not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: briefing });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('PATCH /api/briefings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update briefing' },
      { status: 500 }
    );
  }
}
