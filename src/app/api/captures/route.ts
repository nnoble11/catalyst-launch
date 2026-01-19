import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import {
  getCapturesByUserId,
  createCapture,
  updateCapture,
  deleteCapture,
  createActivity,
  createTask,
} from '@/lib/db/queries';
import { generateStructuredOutput } from '@/lib/ai/openai';
import type { CaptureType } from '@/config/constants';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const unprocessedOnly = searchParams.get('unprocessed') === 'true';

    const captures = await getCapturesByUserId(user.id, unprocessedOnly);

    return NextResponse.json({ success: true, data: captures });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET /api/captures error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch captures' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { content, projectId, autoProcess = true } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    // Auto-categorize using AI if autoProcess is true
    let captureType: CaptureType = 'note';
    if (autoProcess) {
      try {
        const classification = await generateStructuredOutput<{ type: CaptureType }>(
          [
            {
              role: 'system',
              content: `Classify the following quick capture into one of these categories:
- idea: A new concept, feature idea, or creative thought
- note: General observation or information to remember
- task: Something that needs to be done (action item)
- question: Something to research or find out
- resource: A link, reference, or external resource

Respond with JSON containing only the type field.`,
            },
            {
              role: 'user',
              content: `Classify this capture: "${content}"`,
            },
          ],
          {}
        );
        captureType = classification.type;
      } catch (error) {
        console.error('Error classifying capture:', error);
        // Fall back to 'note' if classification fails
      }
    }

    const capture = await createCapture({
      userId: user.id,
      projectId: projectId || undefined,
      content,
      type: captureType,
    });

    // Log activity
    await createActivity({
      userId: user.id,
      projectId: projectId || undefined,
      type: 'capture_created',
      data: { captureId: capture.id, type: captureType },
    });

    return NextResponse.json({ success: true, data: capture }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('POST /api/captures error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create capture' },
      { status: 500 }
    );
  }
}

// Process a capture into a task or other entity
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { captureId, action, projectId } = body;

    if (!captureId || !action) {
      return NextResponse.json(
        { success: false, error: 'captureId and action are required' },
        { status: 400 }
      );
    }

    // Get the capture
    const captures = await getCapturesByUserId(user.id);
    const capture = captures.find((c) => c.id === captureId);

    if (!capture) {
      return NextResponse.json(
        { success: false, error: 'Capture not found' },
        { status: 404 }
      );
    }

    let processedInto: { taskId?: string; actionTaken?: string } = {};

    if (action === 'convert_to_task') {
      // Create a task from the capture
      const task = await createTask({
        userId: user.id,
        projectId: projectId || capture.projectId || undefined,
        title: capture.content.slice(0, 100),
        description: capture.content.length > 100 ? capture.content : undefined,
        status: 'backlog',
        priority: 'medium',
      });

      processedInto = { taskId: task.id, actionTaken: 'converted_to_task' };
    } else if (action === 'dismiss') {
      processedInto = { actionTaken: 'dismissed' };
    }

    // Update the capture as processed
    const updatedCapture = await updateCapture(captureId, {
      processedAt: new Date(),
      processedInto,
      projectId: projectId || undefined,
    });

    return NextResponse.json({ success: true, data: updatedCapture });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('PATCH /api/captures error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process capture' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const captureId = searchParams.get('id');

    if (!captureId) {
      return NextResponse.json(
        { success: false, error: 'Capture ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const captures = await getCapturesByUserId(user.id);
    const capture = captures.find((c) => c.id === captureId);

    if (!capture) {
      return NextResponse.json(
        { success: false, error: 'Capture not found' },
        { status: 404 }
      );
    }

    await deleteCapture(captureId);

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('DELETE /api/captures error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete capture' },
      { status: 500 }
    );
  }
}
