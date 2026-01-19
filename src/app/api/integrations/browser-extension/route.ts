import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import {
  getIntegrationByProvider,
  upsertIntegration,
  deleteIntegration,
} from '@/lib/db/queries';
import browserExtensionIntegration, {
  BrowserExtensionIntegration,
} from '@/services/integrations/browser-extension/client';

/**
 * GET /api/integrations/browser-extension
 * Get browser extension connection status and API key
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const integration = await getIntegrationByProvider(user.id, 'browser_extension');

    if (!integration) {
      return NextResponse.json({
        success: true,
        data: {
          connected: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        // Only show masked API key for security
        apiKeyPreview: integration.accessToken.substring(0, 8) + '...',
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET /api/integrations/browser-extension error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get browser extension status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/browser-extension
 * Generate a new API key for the browser extension
 */
export async function POST() {
  try {
    const user = await requireAuth();

    // Generate new API key
    const apiKey = BrowserExtensionIntegration.generateApiKey();

    // Save the integration
    await upsertIntegration({
      userId: user.id,
      provider: 'browser_extension',
      accessToken: apiKey,
      metadata: {
        createdAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        apiKey, // Return full key only once during creation
        message: 'Save this API key - it will not be shown again.',
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('POST /api/integrations/browser-extension error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate API key' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrations/browser-extension
 * Revoke the browser extension API key
 */
export async function DELETE() {
  try {
    const user = await requireAuth();
    const integration = await getIntegrationByProvider(user.id, 'browser_extension');

    if (integration) {
      await deleteIntegration(integration.id);
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('DELETE /api/integrations/browser-extension error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to revoke API key' },
      { status: 500 }
    );
  }
}
