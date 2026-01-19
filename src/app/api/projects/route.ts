import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import {
  getProjectsByUserId,
  createProject,
  createMilestones,
  createActivity,
} from '@/lib/db/queries';
import { DEFAULT_MILESTONES, type Stage } from '@/config/constants';

export async function GET() {
  try {
    const user = await requireAuth();
    const projects = await getProjectsByUserId(user.id);

    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET /api/projects error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const { name, description, stage, metadata } = body;

    if (!name || !stage) {
      return NextResponse.json(
        { success: false, error: 'Name and stage are required' },
        { status: 400 }
      );
    }

    // Create project
    const project = await createProject({
      userId: user.id,
      name,
      description,
      stage: stage as Stage,
      metadata,
    });

    // Create default milestones for the stage
    const defaultMilestones = DEFAULT_MILESTONES[stage as Stage] || [];
    if (defaultMilestones.length > 0) {
      await createMilestones(
        defaultMilestones.map((title, index) => ({
          projectId: project.id,
          title,
          order: index,
        }))
      );
    }

    // Log activity
    await createActivity({
      userId: user.id,
      projectId: project.id,
      type: 'project_created',
      data: { projectName: name, stage },
    });

    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('POST /api/projects error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
