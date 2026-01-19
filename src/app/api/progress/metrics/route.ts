import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import {
  getTractionMetrics,
  createTractionMetrics,
  getLatestTractionMetrics,
  getProjectById,
} from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const latest = searchParams.get('latest') === 'true';
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Verify project belongs to user
    const project = await getProjectById(projectId);
    if (!project || project.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    if (latest) {
      const metrics = await getLatestTractionMetrics(projectId);
      return NextResponse.json({ success: true, data: metrics });
    }

    const metrics = await getTractionMetrics(projectId, Math.min(limit, 100));

    return NextResponse.json({ success: true, data: metrics });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET /api/progress/metrics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const {
      projectId,
      metricDate,
      customers,
      revenueCents,
      mrrCents,
      activeUsers,
      conversationsCount,
      npsScore,
      customMetrics,
    } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Verify project belongs to user
    const project = await getProjectById(projectId);
    if (!project || project.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Validate numeric fields
    const validateNumber = (val: unknown, min = 0): number | undefined => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = Number(val);
      if (isNaN(num) || num < min) return undefined;
      return num;
    };

    const metrics = await createTractionMetrics({
      projectId,
      metricDate: metricDate ? new Date(metricDate) : undefined,
      customers: validateNumber(customers),
      revenueCents: validateNumber(revenueCents),
      mrrCents: validateNumber(mrrCents),
      activeUsers: validateNumber(activeUsers),
      conversationsCount: validateNumber(conversationsCount),
      npsScore: validateNumber(npsScore, -100),
      customMetrics,
    });

    return NextResponse.json({ success: true, data: metrics }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('POST /api/progress/metrics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create metrics' },
      { status: 500 }
    );
  }
}
