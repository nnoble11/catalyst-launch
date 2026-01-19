import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { integrations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import browserExtensionIntegration, {
  WebClip,
} from '@/services/integrations/browser-extension/client';
import { IngestionPipeline } from '@/services/integrations/ingestion/IngestionPipeline';
import {
  createIngestedItem,
  markIngestedItemProcessed,
} from '@/lib/db/queries';

const pipeline = new IngestionPipeline();

/**
 * POST /api/integrations/browser-extension/clip
 * Receive a clip from the browser extension
 *
 * Authentication: Bearer token (API key)
 */
export async function POST(request: NextRequest) {
  try {
    // Extract API key from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization' },
        { status: 401 }
      );
    }

    const apiKey = authHeader.replace('Bearer ', '');

    // Validate API key format
    const isValidFormat = await browserExtensionIntegration.validateApiKey(apiKey);
    if (!isValidFormat) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key format' },
        { status: 401 }
      );
    }

    // Find the integration by API key
    const integration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.provider, 'browser_extension'),
        eq(integrations.accessToken, apiKey)
      ),
      with: {
        user: true,
      },
    });

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Parse the clip data
    const body = await request.json();
    const clip = body as WebClip;

    // Validate required fields
    if (!clip.url || !clip.title) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: url and title' },
        { status: 400 }
      );
    }

    // Set timestamp if not provided
    if (!clip.timestamp) {
      clip.timestamp = new Date().toISOString();
    }

    // Process the clip through the integration
    const ingestItem = browserExtensionIntegration.processClip(clip);

    // Store in ingested items
    const { item: ingestedItem, isNew } = await createIngestedItem({
      userId: integration.userId,
      integrationId: integration.id,
      provider: 'browser_extension',
      sourceId: ingestItem.sourceId,
      sourceUrl: ingestItem.sourceUrl,
      itemType: ingestItem.type,
      title: ingestItem.title,
      content: ingestItem.content,
      rawData: clip as unknown as Record<string, unknown>,
      metadata: ingestItem.metadata as unknown as Record<string, unknown>,
      status: 'pending',
    });

    if (!isNew) {
      // Clip already exists
      return NextResponse.json({
        success: true,
        data: {
          id: ingestedItem.id,
          message: 'Clip already captured',
          duplicate: true,
        },
      });
    }

    // Process through ingestion pipeline
    const result = await pipeline.process(integration.userId, ingestItem);

    // Update ingested item with results
    await markIngestedItemProcessed(ingestedItem.id, {
      captureId: result.captureId,
      memoryIds: result.memoryIds,
      taskIds: result.taskIds,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: ingestedItem.id,
        captureId: result.captureId,
        message: 'Clip captured successfully',
      },
    });
  } catch (error) {
    console.error('POST /api/integrations/browser-extension/clip error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process clip' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
