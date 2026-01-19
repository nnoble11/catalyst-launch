/**
 * Integration Service Index
 *
 * This file exports all integration-related services and registers
 * all available integrations with the registry.
 */

// Export types
export type {
  IntegrationProvider,
  StandardIngestItem,
  IntegrationDefinition,
  SyncOptions,
  SyncResult,
  IntegrationTokens,
  IngestItemType,
  IntegrationCategory,
} from '@/types/integrations';

// Export base classes
export { BaseIntegration, ApiKeyIntegration } from './base/BaseIntegration';
export type { IntegrationContext } from './base/BaseIntegration';

// Export registry
export { integrationRegistry, INTEGRATION_DEFINITIONS } from './registry';

// Export sync service
export { IntegrationSyncService, integrationSyncService } from './IntegrationSyncService';

// Export ingestion pipeline
export { IngestionPipeline, ingestionPipeline } from './ingestion/IngestionPipeline';

// Export OAuth helper
export {
  generateOAuthState,
  validateOAuthState,
  buildAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
} from './oauth-helper';

// Import and register all integrations
// This ensures they're registered when this module is imported
import './google-calendar/client';
import './slack/client';
import './notion/client';
import './granola/client';
import './readwise/client';
import './linear/client';
import './todoist/client';
import './gmail/client';
import './pocket/client';
import './raindrop/client';
import './discord/client';
import './zoom/client';
import './browser-extension/client';

// Log registered integrations in development
if (process.env.NODE_ENV === 'development') {
  const { integrationRegistry } = require('./registry');
  const registered = integrationRegistry.getAllInstances();
  console.log(`[Integrations] Registered ${registered.length} integrations:`,
    registered.map((i: { provider: string }) => i.provider).join(', ')
  );
}
