import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import { getProjectsByUserId } from '@/lib/db/queries';
import { milestoneDetectionEngine } from '@/services/ai/MilestoneDetectionEngine';

/**
 * POST /api/progress/detect
 * Run milestone detection on recent content
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Parse options from body
    let projectId: string | undefined;
    let autoCreate = false;
    let daysBack = 7;
    let includeMetrics = true;

    try {
      const body = await request.json();
      projectId = body.projectId;
      autoCreate = body.autoCreate ?? false;
      daysBack = body.daysBack ?? 7;
      includeMetrics = body.includeMetrics ?? true;
    } catch {
      // Use defaults
    }

    // Get project ID if not provided
    if (!projectId) {
      const projects = await getProjectsByUserId(user.id);
      if (projects.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No projects found' },
          { status: 400 }
        );
      }
      projectId = projects[0].id;
    }

    // Run detection
    const result = await milestoneDetectionEngine.detectAndCreateMilestones(projectId, {
      autoCreate,
      daysBack,
      includeMetrics,
    });

    return NextResponse.json({
      success: true,
      data: {
        signals: result.signals.map((signal) => ({
          type: signal.type,
          confidence: Math.round(signal.confidence * 100),
          evidence: signal.evidence,
          sourceType: signal.source.type,
        })),
        milestonesCreated: result.milestonesCreated,
        signalsCount: result.signals.length,
        milestonesCreatedCount: result.milestonesCreated.length,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('POST /api/progress/detect error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run milestone detection' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/progress/detect
 * Analyze specific content for milestone signals
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const { content, projectId, sourceType = 'manual', sourceId, autoCreate = false } = body;

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    // Get project ID if not provided
    let targetProjectId = projectId;
    if (!targetProjectId) {
      const projects = await getProjectsByUserId(user.id);
      if (projects.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No projects found' },
          { status: 400 }
        );
      }
      targetProjectId = projects[0].id;
    }

    // Analyze content
    const result = await milestoneDetectionEngine.processContent(
      targetProjectId,
      content,
      sourceType,
      sourceId,
      autoCreate
    );

    return NextResponse.json({
      success: true,
      data: {
        signals: result.signals.map((signal) => ({
          type: signal.type,
          confidence: Math.round(signal.confidence * 100),
          evidence: signal.evidence,
        })),
        milestonesCreated: result.milestonesCreated,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('PUT /api/progress/detect error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze content' },
      { status: 500 }
    );
  }
}
