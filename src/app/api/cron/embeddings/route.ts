import { NextRequest, NextResponse } from 'next/server';
import {
  enqueueMissingEmbeddings,
  getPendingEmbeddings,
  storeEmbeddingVector,
  markEmbeddingFailed,
} from '@/lib/db/queries';
import { buildEmbeddingText, generateEmbedding } from '@/services/ai/embeddings';

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured');
    return process.env.NODE_ENV === 'development';
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await enqueueMissingEmbeddings(200);
    const pending = await getPendingEmbeddings(40);

    const results = {
      processed: 0,
      embedded: 0,
      failed: 0,
    };

    for (const item of pending) {
      results.processed++;
      try {
        const text = buildEmbeddingText(item.title ?? undefined, item.content ?? undefined);
        if (!text) {
          await markEmbeddingFailed(item.embedding_id, 'Empty embedding text');
          results.failed++;
          continue;
        }

        const vector = await generateEmbedding(text);
        if (vector.length === 0) {
          await markEmbeddingFailed(item.embedding_id, 'Embedding generation failed');
          results.failed++;
          continue;
        }

        await storeEmbeddingVector(item.embedding_id, vector);
        results.embedded++;
      } catch (error) {
        await markEmbeddingFailed(
          item.embedding_id,
          error instanceof Error ? error.message : 'Embedding error'
        );
        results.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...results,
        pending: pending.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('GET /api/cron/embeddings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run embeddings cron' },
      { status: 500 }
    );
  }
}
