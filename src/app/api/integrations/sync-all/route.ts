import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import { integrationSyncService } from '@/services/integrations';

/**
 * POST /api/integrations/sync-all
 * Sync all connected integrations for the current user
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Sync all connected integrations
    const results = await integrationSyncService.syncAllIntegrations(user.id);

    // Aggregate results
    const summary = {
      totalIntegrations: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      totalItemsProcessed: results.reduce((sum, r) => sum + r.itemsProcessed, 0),
      totalItemsCreated: results.reduce((sum, r) => sum + r.itemsCreated, 0),
      totalItemsUpdated: results.reduce((sum, r) => sum + r.itemsUpdated, 0),
      results: results.map((r) => ({
        provider: r.provider,
        success: r.success,
        itemsProcessed: r.itemsProcessed,
        errors: r.errors.length > 0 ? r.errors : undefined,
      })),
    };

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('POST /api/integrations/sync-all error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync integrations' },
      { status: 500 }
    );
  }
}
