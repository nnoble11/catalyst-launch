import { NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import { integrationSyncService } from '@/services/integrations/IntegrationSyncService';

/**
 * POST /api/integrations/granola/sync
 * Trigger a sync from Granola
 */
export async function POST() {
  try {
    const user = await requireAuth();

    const result = await integrationSyncService.syncIntegration(
      user.id,
      'granola'
    );

    return NextResponse.json({
      success: result.success,
      itemsProcessed: result.itemsProcessed,
      itemsCreated: result.itemsCreated,
      itemsUpdated: result.itemsUpdated,
      itemsSkipped: result.itemsSkipped,
      errors: result.errors,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('POST /api/integrations/granola/sync error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync Granola' },
      { status: 500 }
    );
  }
}
