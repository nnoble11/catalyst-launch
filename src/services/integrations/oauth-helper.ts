/**
 * OAuth Helper - Shared utilities for OAuth integrations
 */

import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import type { IntegrationProvider } from '@/types/integrations';

const STATE_COOKIE_PREFIX = 'oauth_state_';
const STATE_EXPIRY = 10 * 60 * 1000; // 10 minutes

/**
 * Generate and store OAuth state for CSRF protection
 */
export async function generateOAuthState(provider: IntegrationProvider): Promise<string> {
  const state = randomBytes(32).toString('hex');

  const cookieStore = await cookies();
  cookieStore.set(`${STATE_COOKIE_PREFIX}${provider}`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: STATE_EXPIRY / 1000,
    path: '/',
  });

  return state;
}

/**
 * Validate OAuth state and clear the cookie
 */
export async function validateOAuthState(
  provider: IntegrationProvider,
  state: string
): Promise<boolean> {
  const cookieStore = await cookies();
  const storedState = cookieStore.get(`${STATE_COOKIE_PREFIX}${provider}`)?.value;

  // Clear the cookie regardless
  cookieStore.delete(`${STATE_COOKIE_PREFIX}${provider}`);

  if (!storedState || storedState !== state) {
    return false;
  }

  return true;
}

/**
 * Build OAuth authorization URL with standard parameters
 */
export function buildAuthUrl(
  baseUrl: string,
  params: {
    clientId: string;
    redirectUri: string;
    scope?: string;
    state: string;
    responseType?: string;
    additionalParams?: Record<string, string>;
  }
): string {
  const url = new URL(baseUrl);
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('state', params.state);
  url.searchParams.set('response_type', params.responseType || 'code');

  if (params.scope) {
    url.searchParams.set('scope', params.scope);
  }

  if (params.additionalParams) {
    for (const [key, value] of Object.entries(params.additionalParams)) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  tokenUrl: string,
  params: {
    code: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    grantType?: string;
  }
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  scope?: string;
}> {
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: params.grantType || 'authorization_code',
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
    scope: data.scope,
  };
}

/**
 * Refresh an access token
 */
export async function refreshAccessToken(
  tokenUrl: string,
  params: {
    refreshToken: string;
    clientId: string;
    clientSecret: string;
  }
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: params.refreshToken,
      client_id: params.clientId,
      client_secret: params.clientSecret,
    }),
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}
