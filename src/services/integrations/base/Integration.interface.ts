export interface IntegrationConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface IntegrationTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  provider: 'google_calendar' | 'notion' | 'slack';

  // OAuth methods
  getAuthorizationUrl(state: string): string;
  exchangeCodeForTokens(code: string): Promise<IntegrationTokens>;
  refreshAccessToken(refreshToken: string): Promise<IntegrationTokens>;

  // Validation
  validateConnection(tokens: IntegrationTokens): Promise<boolean>;

  // Data methods (to be implemented by specific integrations)
  fetchData?(tokens: IntegrationTokens, options?: unknown): Promise<unknown>;
  syncData?(tokens: IntegrationTokens, data: unknown): Promise<void>;
}

export abstract class BaseIntegration implements Integration {
  abstract id: string;
  abstract name: string;
  abstract description: string;
  abstract icon: string;
  abstract provider: 'google_calendar' | 'notion' | 'slack';

  protected config: IntegrationConfig;

  constructor(config: IntegrationConfig) {
    this.config = config;
  }

  abstract getAuthorizationUrl(state: string): string;
  abstract exchangeCodeForTokens(code: string): Promise<IntegrationTokens>;
  abstract refreshAccessToken(refreshToken: string): Promise<IntegrationTokens>;
  abstract validateConnection(tokens: IntegrationTokens): Promise<boolean>;
}

export interface IntegrationStatus {
  provider: string;
  connected: boolean;
  lastSynced?: Date;
  error?: string;
}
