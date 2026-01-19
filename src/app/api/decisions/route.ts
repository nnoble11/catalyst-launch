import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import {
  getDecisionsByProject,
  getPendingDecisions,
  createDecision,
  updateDecision,
  getProjectById,
} from '@/lib/db/queries';
import type { DecisionCategory, DecisionStatus } from '@/types';

const VALID_CATEGORIES: DecisionCategory[] = [
  'product',
  'growth',
  'fundraising',
  'team',
  'operations',
  'legal',
  'finance',
];

const VALID_STATUSES: DecisionStatus[] = ['pending', 'decided', 'deferred', 'dismissed'];

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status') as DecisionStatus | null;
    const pendingOnly = searchParams.get('pending') === 'true';

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

    let decisions;
    if (pendingOnly) {
      decisions = await getPendingDecisions(projectId);
    } else {
      decisions = await getDecisionsByProject(
        projectId,
        status && VALID_STATUSES.includes(status) ? status : undefined
      );
    }

    return NextResponse.json({ success: true, data: decisions });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET /api/decisions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch decisions' },
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
      title,
      context,
      tradeoffs,
      recommendedAction,
      urgencyScore,
      impactScore,
      category,
      dueDate,
    } = body;

    // Validate required fields
    if (!projectId || !title || !context || !tradeoffs || !category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project ID, title, context, tradeoffs, and category are required',
        },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Invalid category' },
        { status: 400 }
      );
    }

    // Validate scores
    const validScore = (score: unknown): number => {
      const num = Number(score);
      if (isNaN(num) || num < 1 || num > 10) return 5;
      return num;
    };

    // Verify project belongs to user
    const project = await getProjectById(projectId);
    if (!project || project.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const decision = await createDecision({
      projectId,
      title,
      context,
      tradeoffs,
      recommendedAction,
      urgencyScore: validScore(urgencyScore),
      impactScore: validScore(impactScore),
      category,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    return NextResponse.json({ success: true, data: decision }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('POST /api/decisions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create decision' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const { decisionId, status, decisionMade } = body;

    if (!decisionId) {
      return NextResponse.json(
        { success: false, error: 'Decision ID is required' },
        { status: 400 }
      );
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    const updateData: {
      status?: DecisionStatus;
      decisionMade?: string;
      decidedAt?: Date;
    } = {};

    if (status) {
      updateData.status = status;
      if (status === 'decided') {
        updateData.decidedAt = new Date();
      }
    }

    if (decisionMade) {
      updateData.decisionMade = decisionMade;
    }

    const decision = await updateDecision(decisionId, updateData);

    if (!decision) {
      return NextResponse.json(
        { success: false, error: 'Decision not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: decision });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('PATCH /api/decisions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update decision' },
      { status: 500 }
    );
  }
}
