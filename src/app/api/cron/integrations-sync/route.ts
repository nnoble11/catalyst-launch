import { NextRequest, NextResponse } from 'next/server';
import { getPendingSyncs, incrementSyncErrorCount } from '@/lib/db/queries';
import { IntegrationSyncService } from '@/services/integrations/IntegrationSyncService';

// Verify cron secret to prevent unauthorized access
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

    const syncService = new IntegrationSyncService();
    const pendingSyncs = await getPendingSyncs(20); // Process up to 20 at a time

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      totalItemsSynced: 0,
      errors: [] as string[],
    };

    console.log(`[Integrations Sync Cron] Found ${pendingSyncs.length} pending syncs`);

    for (const syncState of pendingSyncs) {
      try {
        if (!syncState.integration) {
          console.warn(`[Integrations Sync Cron] No integration found for sync state ${syncState.id}`);
          continue;
        }

        results.processed++;

        // Run the sync
        const syncResult = await syncService.syncIntegration(
          syncState.userId,
          syncState.provider
        );

        if (syncResult.success) {
          results.successful++;
          results.totalItemsSynced += syncResult.itemsProcessed || 0;
          console.log(`[Integrations Sync Cron] Successfully synced ${syncState.provider} for user ${syncState.userId}: ${syncResult.itemsProcessed} items`);
        } else {
          const errorMessage = syncResult.errors?.[0]?.message || 'Unknown error';
          if (errorMessage.includes('already in progress')) {
            console.log(`[Integrations Sync Cron] Skipping ${syncState.provider} for user ${syncState.userId}: ${errorMessage}`);
            continue;
          }
          results.failed++;
          results.errors.push(`${syncState.provider}: ${errorMessage}`);
          await incrementSyncErrorCount(syncState.integrationId, errorMessage);
          console.error(`[Integrations Sync Cron] Failed to sync ${syncState.provider} for user ${syncState.userId}: ${errorMessage}`);
        }
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`${syncState.provider}: ${errorMessage}`);
        await incrementSyncErrorCount(syncState.integrationId, errorMessage);
        console.error(`[Integrations Sync Cron] Error syncing ${syncState.provider}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Integration sync cron completed',
        ...results,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('GET /api/cron/integrations-sync error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run integration sync cron' },
      { status: 500 }
    );
  }
}
