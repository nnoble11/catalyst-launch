import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import { getTasksByUserId, createTask, createActivity } from '@/lib/db/queries';
import type { TaskStatus, TaskPriority } from '@/config/constants';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || undefined;
    const status = searchParams.get('status') as TaskStatus | undefined;

    const tasks = await getTasksByUserId(user.id, projectId, status);

    return NextResponse.json({ success: true, data: tasks });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET /api/tasks error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const {
      title,
      description,
      projectId,
      status = 'backlog',
      priority = 'medium',
      dueDate,
      aiSuggested = false,
      aiRationale,
    } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    const task = await createTask({
      userId: user.id,
      projectId: projectId || undefined,
      title,
      description,
      status: status as TaskStatus,
      priority: priority as TaskPriority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      aiSuggested,
      aiRationale,
    });

    // Log activity
    await createActivity({
      userId: user.id,
      projectId: projectId || undefined,
      type: 'task_created',
      data: { taskId: task.id, taskTitle: title },
    });

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('POST /api/tasks error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
