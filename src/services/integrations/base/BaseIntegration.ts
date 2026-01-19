/**
 * BaseIntegration - Abstract base class for all integrations
 *
 * Each integration must extend this class and implement the required methods.
 * This provides a consistent interface for OAuth, syncing, and data normalization.
 */

import type {
  IntegrationProvider,
  IntegrationTokens,
  StandardIngestItem,
  SyncOptions,
  SyncResult,
  IntegrationDefinition,
  ApiClientConfig,
} from '@/types/integrations';

export interface IntegrationContext {
  userId: string;
  integrationId: string;
  tokens: IntegrationTokens;
  metadata?: Record<string, unknown>;
}

export abstract class BaseIntegration {
  abstract readonly definition: IntegrationDefinition;

  /**
   * Get the provider ID
   */
  get provider(): IntegrationProvider {
    return this.definition.id;
  }

  /**
   * Get the OAuth authorization URL
   * @param state - CSRF protection state
   * @returns Authorization URL to redirect user to
   */
  abstract getAuthorizationUrl(state: string): string;

  /**
   * Exchange authorization code for tokens
   * @param code - Authorization code from OAuth callback
   * @returns Access and refresh tokens
   */
  abstract exchangeCodeForTokens(code: string): Promise<IntegrationTokens>;

  /**
   * Refresh expired access token
   * @param refreshToken - Current refresh token
   * @returns New access and refresh tokens
   */
  abstract refreshAccessToken(refreshToken: string): Promise<IntegrationTokens>;

  /**
   * Validate that the connection is still working
   * @param tokens - Current tokens
   * @returns True if connection is valid
   */
  abstract validateConnection(tokens: IntegrationTokens): Promise<boolean>;

  /**
   * Sync data from the external service
   * @param context - Integration context with tokens
   * @param options - Sync options
   * @returns Array of normalized items
   */
  abstract sync(
    context: IntegrationContext,
    options?: SyncOptions
  ): Promise<StandardIngestItem[]>;

  /**
   * Get account information for display
   * @param tokens - Current tokens
   * @returns Account metadata
   */
  abstract getAccountInfo(tokens: IntegrationTokens): Promise<{
    accountName?: string;
    accountEmail?: string;
    workspace?: string;
    [key: string]: unknown;
  }>;

  /**
   * Handle incoming webhook event (if supported)
   * @param payload - Raw webhook payload
   * @param signature - Webhook signature for verification
   * @returns Normalized items from webhook
   */
  async handleWebhook(
    payload: unknown,
    signature?: string
  ): Promise<StandardIngestItem[]> {
    throw new Error(`Webhooks not supported for ${this.provider}`);
  }

  /**
   * Register webhook subscription (if supported)
   * @param context - Integration context
   * @param webhookUrl - URL to receive webhooks
   * @returns Webhook subscription details
   */
  async registerWebhook(
    context: IntegrationContext,
    webhookUrl: string
  ): Promise<{ webhookId: string; secret?: string }> {
    throw new Error(`Webhook registration not supported for ${this.provider}`);
  }

  /**
   * Unregister webhook subscription (if supported)
   * @param context - Integration context
   * @param webhookId - ID of webhook to remove
   */
  async unregisterWebhook(
    context: IntegrationContext,
    webhookId: string
  ): Promise<void> {
    throw new Error(`Webhook unregistration not supported for ${this.provider}`);
  }

  /**
   * Helper: Create API client configuration
   */
  protected createApiConfig(
    baseUrl: string,
    accessToken: string,
    refreshToken?: string
  ): ApiClientConfig {
    return {
      baseUrl,
      accessToken,
      refreshToken,
      timeout: 30000,
      retries: 3,
    };
  }

  /**
   * Helper: Make authenticated API request with retry logic
   */
  protected async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = 3
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);

        // Don't retry on client errors (except rate limiting)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          return response;
        }

        // Retry on server errors or rate limiting
        if (response.status >= 500 || response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, i) * 1000;
          await this.sleep(delay);
          continue;
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        await this.sleep(Math.pow(2, i) * 1000);
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Helper: Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Helper: Generate content hash for change detection
   */
  protected generateContentHash(content: string): string {
    // Simple hash for change detection
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}

/**
 * API Key based integration (simpler auth)
 */
export abstract class ApiKeyIntegration extends BaseIntegration {
  /**
   * API key integrations don't use OAuth
   */
  getAuthorizationUrl(_state: string): string {
    throw new Error(`${this.provider} uses API key authentication, not OAuth`);
  }

  exchangeCodeForTokens(_code: string): Promise<IntegrationTokens> {
    throw new Error(`${this.provider} uses API key authentication, not OAuth`);
  }

  refreshAccessToken(_refreshToken: string): Promise<IntegrationTokens> {
    // API keys don't expire
    throw new Error(`${this.provider} uses API key authentication, no refresh needed`);
  }

  /**
   * Validate API key
   * @param apiKey - The API key to validate
   */
  abstract validateApiKey(apiKey: string): Promise<boolean>;

  /**
   * Override validate connection to use API key
   */
  async validateConnection(tokens: IntegrationTokens): Promise<boolean> {
    return this.validateApiKey(tokens.accessToken);
  }
}

export default BaseIntegration;
