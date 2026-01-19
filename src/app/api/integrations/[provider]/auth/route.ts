import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import { integrationRegistry, generateOAuthState } from '@/services/integrations';
import { normalizeProviderId } from '@/config/integrations';

/**
 * GET /api/integrations/[provider]/auth
 * Get the OAuth authorization URL for an integration
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const user = await requireAuth();
    const { provider: providerSlug } = await params;

    // Normalize URL slug to provider ID (e.g., 'google-calendar' -> 'google_calendar')
    const provider = normalizeProviderId(providerSlug);
    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Invalid provider' },
        { status: 400 }
      );
    }

    // Get integration from registry
    const integration = integrationRegistry.get(provider);
    const definition = integrationRegistry.getDefinition(provider);

    if (!integration || !definition) {
      return NextResponse.json(
        { success: false, error: 'Integration not found' },
        { status: 404 }
      );
    }

    if (!definition.isAvailable) {
      return NextResponse.json(
        { success: false, error: 'Integration not yet available' },
        { status: 400 }
      );
    }

    // API key based integrations don't use OAuth
    if (definition.authMethod === 'api_key' || definition.authMethod === 'custom') {
      return NextResponse.json({
        success: true,
        data: {
          authMethod: definition.authMethod,
          message: 'This integration uses API key authentication',
        },
      });
    }

    // Generate state for CSRF protection
    const state = await generateOAuthState(provider);

    // Get authorization URL
    const authUrl = integration.getAuthorizationUrl(state);

    return NextResponse.json({
      success: true,
      data: {
        authUrl,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET /api/integrations/[provider]/auth error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get authorization URL' },
      { status: 500 }
    );
  }
}
