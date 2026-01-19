import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import {
  getAiMemories,
  upsertAiMemory,
  deleteAiMemory,
} from '@/lib/db/queries';
import { buildMemoryContext, extractMemories, storeMemories } from '@/services/ai/memory-manager';

// Get user's AI memories
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || undefined;
    const category = searchParams.get('category') || undefined;
    const format = searchParams.get('format') || 'list';

    if (format === 'context') {
      // Return formatted context string for AI prompts
      const context = await buildMemoryContext(user.id, projectId);
      return NextResponse.json({ success: true, data: { context } });
    }

    const memories = await getAiMemories(user.id, projectId, category);

    return NextResponse.json({ success: true, data: memories });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET /api/ai/memory error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch memories' },
      { status: 500 }
    );
  }
}

// Create or update a memory
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { action, ...data } = body;

    if (action === 'extract') {
      // Extract memories from conversation messages
      const { messages, projectId } = data;
      if (!messages || !Array.isArray(messages)) {
        return NextResponse.json(
          { success: false, error: 'Messages array is required' },
          { status: 400 }
        );
      }

      const extracted = await extractMemories(user.id, projectId, messages);
      const stored = await storeMemories(user.id, projectId, extracted);

      return NextResponse.json({
        success: true,
        data: {
          extracted: extracted.length,
          stored: stored.length,
          memories: stored,
        },
      });
    }

    // Regular memory creation
    const { key, value, projectId, category, confidence, expiresAt } = data;

    if (!key || !value) {
      return NextResponse.json(
        { success: false, error: 'Key and value are required' },
        { status: 400 }
      );
    }

    const memory = await upsertAiMemory({
      userId: user.id,
      projectId: projectId || undefined,
      key,
      value,
      category,
      confidence: confidence || 80,
      source: 'manual',
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    return NextResponse.json({ success: true, data: memory }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('POST /api/ai/memory error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create memory' },
      { status: 500 }
    );
  }
}

// Delete a memory
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const memoryId = searchParams.get('id');

    if (!memoryId) {
      return NextResponse.json(
        { success: false, error: 'Memory ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const memories = await getAiMemories(user.id);
    const memory = memories.find((m) => m.id === memoryId);

    if (!memory) {
      return NextResponse.json(
        { success: false, error: 'Memory not found' },
        { status: 404 }
      );
    }

    await deleteAiMemory(memoryId);

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('DELETE /api/ai/memory error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete memory' },
      { status: 500 }
    );
  }
}
