import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import {
  getProgressMilestonesByProject,
  createProgressMilestone,
  getProjectById,
  createActivity,
} from '@/lib/db/queries';
import type { ProgressMilestoneType } from '@/types';

const VALID_MILESTONE_TYPES: ProgressMilestoneType[] = [
  'first_customer',
  'ten_customers',
  'hundred_customers',
  'first_revenue',
  'mrr_1k',
  'mrr_10k',
  'mrr_100k',
  'first_investor_meeting',
  'term_sheet',
  'funding_closed',
  'mvp_launched',
  'product_hunt_launch',
  'first_employee',
  'yc_interview',
  'demo_day',
  'first_partnership',
  'custom',
];

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

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

    const milestones = await getProgressMilestonesByProject(projectId);

    return NextResponse.json({ success: true, data: milestones });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET /api/progress/milestones error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch milestones' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const { projectId, milestoneType, customTitle, evidence, visibility } = body;

    if (!projectId || !milestoneType) {
      return NextResponse.json(
        { success: false, error: 'Project ID and milestone type are required' },
        { status: 400 }
      );
    }

    if (!VALID_MILESTONE_TYPES.includes(milestoneType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid milestone type' },
        { status: 400 }
      );
    }

    if (milestoneType === 'custom' && !customTitle) {
      return NextResponse.json(
        { success: false, error: 'Custom title is required for custom milestones' },
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

    const milestone = await createProgressMilestone({
      projectId,
      milestoneType,
      customTitle: milestoneType === 'custom' ? customTitle : undefined,
      evidence,
      visibility: visibility || 'cohort',
    });

    // Log activity
    await createActivity({
      userId: user.id,
      projectId,
      type: 'milestone_completed',
      data: {
        milestoneType,
        customTitle,
        projectName: project.name,
      },
    });

    return NextResponse.json({ success: true, data: milestone }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('POST /api/progress/milestones error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create milestone' },
      { status: 500 }
    );
  }
}
