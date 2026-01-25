/**
 * IntegrationSyncService - Unified sync handling for all integrations
 *
 * This service manages:
 * - Triggering syncs (manual or scheduled)
 * - Processing synced items through the ingestion pipeline
 * - Updating sync state and statistics
 * - Error handling and retry logic
 */

import type {
  IntegrationProvider,
  StandardIngestItem,
  SyncOptions,
  SyncResult,
  SyncError,
} from '@/types/integrations';
import {
  getIntegrationByProvider,
  upsertSyncState,
  updateSyncStateStatus,
  incrementSyncErrorCount,
  createIngestedItem,
  markIngestedItemProcessed,
  getIntegrationSyncState,
  upsertIntegration,
  startSyncIfNotRunning,
} from '@/lib/db/queries';
import { BaseIntegration, IntegrationContext } from './base/BaseIntegration';
import { integrationRegistry } from './registry';
import { IngestionPipeline } from './ingestion/IngestionPipeline';
import { createHash } from 'crypto';

export class IntegrationSyncService {
  private pipeline: IngestionPipeline;

  constructor() {
    this.pipeline = new IngestionPipeline();
  }

  /**
   * Sync a specific integration for a user
   */
  async syncIntegration(
    userId: string,
    provider: IntegrationProvider,
    options?: SyncOptions
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      provider,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
      itemsFailed: 0,
      errors: [],
      hasMore: false,
    };

    try {
      // Get integration instance
      const integration = integrationRegistry.get(provider);
      if (!integration) {
        throw new Error(`Integration ${provider} not found in registry`);
      }

      // Get user's integration connection
      const dbIntegration = await getIntegrationByProvider(userId, provider);
      if (!dbIntegration) {
        throw new Error(`User has not connected ${provider}`);
      }

      // Check if token needs refresh (expired or expiring within 5 minutes)
      let accessToken = dbIntegration.accessToken;
      const expiresAt = dbIntegration.expiresAt;
      const refreshToken = dbIntegration.refreshToken;

      if (expiresAt && refreshToken) {
        const expirationBuffer = 5 * 60 * 1000; // 5 minutes
        const isExpired = new Date(expiresAt).getTime() - Date.now() < expirationBuffer;

        if (isExpired) {
          console.log(`[Sync] Token expired for ${provider}, refreshing...`);
          try {
            const newTokens = await integration.refreshAccessToken(refreshToken);
            accessToken = newTokens.accessToken;

            // Update tokens in database
            await upsertIntegration({
              userId,
              provider,
              accessToken: newTokens.accessToken,
              refreshToken: newTokens.refreshToken || refreshToken,
              expiresAt: newTokens.expiresAt,
              metadata: dbIntegration.metadata as Record<string, unknown>,
            });
            console.log(`[Sync] Token refreshed successfully for ${provider}`);
          } catch (refreshError) {
            console.error(`[Sync] Failed to refresh token for ${provider}:`, refreshError);
            throw new Error(`Token refresh failed for ${provider}. Please reconnect the integration.`);
          }
        }
      }

      // Create context with potentially refreshed token
      const context: IntegrationContext = {
        userId,
        integrationId: dbIntegration.id,
        tokens: {
          accessToken,
          refreshToken: refreshToken ?? undefined,
          expiresAt: expiresAt ?? undefined,
        },
        metadata: dbIntegration.metadata as Record<string, unknown> | undefined,
      };

      // Ensure sync state exists
      let syncState = await getIntegrationSyncState(dbIntegration.id);
      if (!syncState) {
        await upsertSyncState({
          userId,
          integrationId: dbIntegration.id,
          provider,
          status: 'pending',
          nextSyncAt: new Date(),
        });
        syncState = await getIntegrationSyncState(dbIntegration.id);
      }

      // Start sync if not already running
      const started = await startSyncIfNotRunning(dbIntegration.id);
      if (!started) {
        result.errors.push({
          message: `Sync already in progress for ${provider}`,
          recoverable: true,
        });
        return result;
      }
      const syncOptions: SyncOptions = {
        ...options,
      };

      // If not full sync, use cursor/timestamps from state
      if (!options?.fullSync) {
        if (syncState?.cursor && !syncOptions.cursor) {
          syncOptions.cursor = syncState.cursor;
        }
        if (!syncOptions.since) {
          syncOptions.since = syncState?.lastItemTimestamp ?? syncState?.lastSuccessfulSyncAt ?? undefined;
        }
      }

      // Perform sync
      const items = await integration.sync(context, syncOptions);
      result.itemsProcessed = items.length;

      // Process each item through the pipeline
      for (const item of items) {
        try {
          const processResult = await this.processItem(
            userId,
            dbIntegration.id,
            provider,
            item,
            options?.dryRun
          );

          if (processResult.created) {
            result.itemsCreated++;
          } else if (processResult.updated) {
            result.itemsUpdated++;
          } else {
            result.itemsSkipped++;
          }
        } catch (error) {
          result.itemsFailed++;
          result.errors.push({
            itemId: item.sourceId,
            message: error instanceof Error ? error.message : 'Unknown error',
            recoverable: true,
          });
        }
      }

      const { latestTimestamp, latestSourceId } = this.getLatestItemMetadata(items);
      // Update sync state
      const totalSynced = (syncState?.totalItemsSynced ?? 0) + result.itemsCreated + result.itemsUpdated;
      await upsertSyncState({
        userId,
        integrationId: dbIntegration.id,
        provider,
        status: 'completed',
        lastSyncAt: new Date(),
        lastSuccessfulSyncAt: new Date(),
        cursor: syncOptions.cursor ?? syncState?.cursor ?? undefined,
        lastItemId: latestSourceId ?? syncState?.lastItemId ?? undefined,
        lastItemTimestamp: latestTimestamp ?? syncState?.lastItemTimestamp ?? undefined,
        totalItemsSynced: totalSynced,
        itemsSyncedThisRun: result.itemsProcessed,
        errorCount: 0,
        nextSyncAt: this.calculateNextSyncTime(integration),
      });

      result.success = true;
      result.hasMore = items.length === (options?.limit ?? 100);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push({
        message: errorMessage,
        recoverable: false,
      });

      // Get integration ID for error tracking
      const dbIntegration = await getIntegrationByProvider(userId, provider);
      if (dbIntegration) {
        await updateSyncStateStatus(dbIntegration.id, 'failed', errorMessage);
        await incrementSyncErrorCount(dbIntegration.id, errorMessage);
      }
    }

    return result;
  }

  /**
   * Process a single ingested item
   */
  private async processItem(
    userId: string,
    integrationId: string,
    provider: IntegrationProvider,
    item: StandardIngestItem,
    dryRun?: boolean
  ): Promise<{ created: boolean; updated: boolean }> {
    // Store the ingested item
    const { item: ingestedItem, isNew, updated } = await createIngestedItem({
      userId,
      integrationId,
      provider,
      sourceId: item.sourceId,
      sourceHash: this.generateHash(item.content),
      sourceUrl: item.sourceUrl,
      itemType: item.type,
      title: item.title,
      content: item.content,
      rawData: item as unknown as Record<string, unknown>,
      metadata: item.metadata as unknown as Record<string, unknown>,
      status: 'pending',
    });

    if (!isNew && !updated) {
      // Item already exists and hasn't changed
      return { created: false, updated: false };
    }

    if (dryRun) {
      return { created: isNew, updated };
    }

    // Process through ingestion pipeline
    const pipelineResult = await this.pipeline.process(userId, item);

    // Update ingested item with results
    await markIngestedItemProcessed(ingestedItem.id, {
      captureId: pipelineResult.captureId,
      memoryIds: pipelineResult.memoryIds,
      taskIds: pipelineResult.taskIds,
    });

    return { created: isNew, updated };
  }

  /**
   * Calculate next sync time based on integration settings
   */
  private calculateNextSyncTime(integration: BaseIntegration): Date {
    const intervalMinutes = integration.definition.defaultSyncInterval ?? 15;
    return new Date(Date.now() + intervalMinutes * 60 * 1000);
  }

  /**
   * Generate a simple hash for content comparison
   */
  private generateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private getLatestItemMetadata(items: StandardIngestItem[]): {
    latestTimestamp?: Date;
    latestSourceId?: string;
  } {
    let latestTimestamp: Date | undefined;
    let latestSourceId: string | undefined;

    for (const item of items) {
      const candidate = item.metadata?.updatedAt ?? item.metadata?.timestamp;
      if (!candidate) continue;

      if (!latestTimestamp || candidate > latestTimestamp) {
        latestTimestamp = candidate;
        latestSourceId = item.sourceId;
      }
    }

    return { latestTimestamp, latestSourceId };
  }

  /**
   * Trigger sync for all connected integrations for a user
   */
  async syncAllIntegrations(userId: string): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    const connectedProviders = await this.getConnectedProviders(userId);

    for (const provider of connectedProviders) {
      const result = await this.syncIntegration(userId, provider);
      results.push(result);
    }

    return results;
  }

  /**
   * Get list of connected provider IDs for a user
   */
  private async getConnectedProviders(userId: string): Promise<IntegrationProvider[]> {
    // This would query the integrations table
    // For now, return empty - will be implemented with actual DB query
    const { getIntegrationsByUserId } = await import('@/lib/db/queries');
    const integrations = await getIntegrationsByUserId(userId);
    return integrations.map(i => i.provider as IntegrationProvider);
  }

  /**
   * Handle incoming webhook event
   */
  async handleWebhook(
    userId: string,
    provider: IntegrationProvider,
    payload: unknown,
    signature?: string
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      provider,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
      itemsFailed: 0,
      errors: [],
      hasMore: false,
    };

    try {
      const integration = integrationRegistry.get(provider);
      if (!integration) {
        throw new Error(`Integration ${provider} not found`);
      }

      // Process webhook through integration
      const items = await integration.handleWebhook(payload, signature);
      result.itemsProcessed = items.length;

      // Get user's integration for storing items
      const dbIntegration = await getIntegrationByProvider(userId, provider);
      if (!dbIntegration) {
        throw new Error(`User has not connected ${provider}`);
      }

      // Process each item
      for (const item of items) {
        try {
          const processResult = await this.processItem(
            userId,
            dbIntegration.id,
            provider,
            item
          );

          if (processResult.created) {
            result.itemsCreated++;
          } else if (processResult.updated) {
            result.itemsUpdated++;
          } else {
            result.itemsSkipped++;
          }
        } catch (error) {
          result.itemsFailed++;
          result.errors.push({
            itemId: item.sourceId,
            message: error instanceof Error ? error.message : 'Unknown error',
            recoverable: true,
          });
        }
      }

      result.success = true;

    } catch (error) {
      result.errors.push({
        message: error instanceof Error ? error.message : 'Unknown error',
        recoverable: false,
      });
    }

    return result;
  }
}

// Export singleton instance
export const integrationSyncService = new IntegrationSyncService();
