import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import { integrationRegistry, validateOAuthState } from '@/services/integrations';
import { incrementSyncErrorCount } from '@/lib/db/queries';
import { db } from '@/lib/db/client';
import { integrations, integrationSyncState } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { normalizeProviderId } from '@/config/integrations';
import { IntegrationSyncService } from '@/services/integrations/IntegrationSyncService';

// Providers that don't need additional configuration before syncing
const AUTO_SYNC_PROVIDERS = ['stripe', 'slack', 'notion', 'google_calendar', 'gmail', 'linear', 'todoist'];

/**
 * GET /api/integrations/[provider]/callback
 * OAuth callback handler
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerSlug } = await params;
  const redirectUrl = new URL('/integrations', request.url);

  // Normalize URL slug to provider ID
  const provider = normalizeProviderId(providerSlug);
  if (!provider) {
    redirectUrl.searchParams.set('error', 'Invalid provider');
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const user = await requireAuth();

    // Get integration from registry
    const integration = integrationRegistry.get(provider);
    const definition = integrationRegistry.getDefinition(provider);

    if (!integration || !definition) {
      redirectUrl.searchParams.set('error', 'Integration not found');
      return NextResponse.redirect(redirectUrl);
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth error
    if (error) {
      redirectUrl.searchParams.set('error', error);
      return NextResponse.redirect(redirectUrl);
    }

    // Validate required params
    if (!code || !state) {
      redirectUrl.searchParams.set('error', 'Missing code or state');
      return NextResponse.redirect(redirectUrl);
    }

    // Validate state for CSRF protection
    const isValidState = await validateOAuthState(provider, state);
    if (!isValidState) {
      redirectUrl.searchParams.set('error', 'Invalid state - possible CSRF attack');
      return NextResponse.redirect(redirectUrl);
    }

    // Exchange code for tokens
    const tokens = await integration.exchangeCodeForTokens(code);

    // Get account info
    let accountInfo: Record<string, unknown> = {};
    try {
      accountInfo = await integration.getAccountInfo(tokens);
    } catch (e) {
      console.error('Failed to get account info:', e);
    }

    const savedIntegration = await db.transaction(async (tx) => {
      const [integration] = await tx
        .insert(integrations)
        .values({
          userId: user.id,
          provider: provider,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          metadata: accountInfo,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [integrations.userId, integrations.provider],
          set: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt,
            metadata: accountInfo,
            updatedAt: new Date(),
          },
        })
        .returning();

      const existingSyncState = await tx.query.integrationSyncState.findFirst({
        where: eq(integrationSyncState.integrationId, integration.id),
      });

      if (existingSyncState) {
        await tx
          .update(integrationSyncState)
          .set({
            status: 'pending',
            nextSyncAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(integrationSyncState.id, existingSyncState.id));
      } else {
        await tx.insert(integrationSyncState).values({
          userId: user.id,
          integrationId: integration.id,
          provider: provider,
          status: 'pending',
          nextSyncAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return integration;
    });

    // Trigger immediate first sync for providers that don't need configuration
    // This runs in the background and doesn't block the redirect
    if (AUTO_SYNC_PROVIDERS.includes(provider)) {
      const syncService = new IntegrationSyncService();
      syncService.syncIntegration(user.id, provider).catch((err) => {
        console.error(`[OAuth Callback] Background sync failed for ${provider}:`, err);
        void incrementSyncErrorCount(savedIntegration.id, err instanceof Error ? err.message : 'Unknown error');
      });
    }

    // Redirect back to integrations page with success
    redirectUrl.searchParams.set('connected', provider);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error(`OAuth callback error for ${provider}:`, error);

    if (error instanceof AuthError) {
      redirectUrl.searchParams.set('error', 'Please log in first');
    } else {
      redirectUrl.searchParams.set('error', 'Failed to connect integration');
    }

    return NextResponse.redirect(redirectUrl);
  }
}
