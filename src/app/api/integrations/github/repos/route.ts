import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { integrations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import githubIntegration from '@/services/integrations/github/client';

/**
 * GET /api/integrations/github/repos
 * List user's GitHub repositories for selection
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuth();

    // Get the user's GitHub integration
    const [integration] = await db.select()
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, user.id),
          eq(integrations.provider, 'github')
        )
      )
      .limit(1);

    if (!integration) {
      return NextResponse.json(
        { error: 'GitHub integration not found. Please connect GitHub first.' },
        { status: 404 }
      );
    }

    // Fetch repositories from GitHub
    const repos = await githubIntegration.getRepositories({
      accessToken: integration.accessToken,
    });

    // Get currently selected repositories
    const metadata = integration.metadata as Record<string, unknown> | null;
    const selectedRepos = (metadata?.selectedRepositories as string[]) || [];

    // Format response
    const formattedRepos = repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      private: repo.private,
      url: repo.html_url,
      owner: repo.owner.login,
      selected: selectedRepos.includes(repo.full_name),
    }));

    return NextResponse.json({
      repositories: formattedRepos,
      selectedRepositories: selectedRepos,
    });
  } catch (error) {
    console.error('[GitHub Repos] Error fetching repositories:', error);

    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch repositories' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/github/repos
 * Update selected repositories for monitoring
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const { selectedRepositories } = body as { selectedRepositories: string[] };

    if (!Array.isArray(selectedRepositories)) {
      return NextResponse.json(
        { error: 'selectedRepositories must be an array' },
        { status: 400 }
      );
    }

    // Get the user's GitHub integration
    const [integration] = await db.select()
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, user.id),
          eq(integrations.provider, 'github')
        )
      )
      .limit(1);

    if (!integration) {
      return NextResponse.json(
        { error: 'GitHub integration not found. Please connect GitHub first.' },
        { status: 404 }
      );
    }

    // Update the integration metadata with selected repositories
    const existingMetadata = (integration.metadata as Record<string, unknown>) || {};
    const updatedMetadata = {
      ...existingMetadata,
      selectedRepositories,
    };

    await db.update(integrations)
      .set({
        metadata: updatedMetadata,
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, integration.id));

    return NextResponse.json({
      success: true,
      selectedRepositories,
      message: `Now monitoring ${selectedRepositories.length} repositories`,
    });
  } catch (error) {
    console.error('[GitHub Repos] Error updating selected repositories:', error);

    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update selected repositories' },
      { status: 500 }
    );
  }
}
