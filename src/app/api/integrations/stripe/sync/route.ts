import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import { getIntegrationByProvider, getProjectsByUserId } from '@/lib/db/queries';
import stripeIntegration from '@/services/integrations/stripe/client';

/**
 * POST /api/integrations/stripe/sync
 * Sync Stripe metrics and check for milestones
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Get the user's Stripe integration
    const integration = await getIntegrationByProvider(user.id, 'stripe');

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Stripe not connected' },
        { status: 400 }
      );
    }

    // Get the user's primary project
    const projects = await getProjectsByUserId(user.id);
    if (projects.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No projects found' },
        { status: 400 }
      );
    }

    // Parse optional project ID from body
    let projectId = projects[0].id;
    try {
      const body = await request.json();
      if (body.projectId) {
        projectId = body.projectId;
      }
    } catch {
      // Use default project
    }

    // Sync Stripe data to traction metrics and detect milestones
    const result = await stripeIntegration.syncStripeToProject(
      integration.accessToken,
      projectId
    );

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          customers: result.metrics.customerCount,
          mrr: result.metrics.mrrCents / 100, // Convert to dollars
          totalRevenue: result.metrics.totalRevenueCents / 100,
          activeSubscriptions: result.metrics.activeSubscriptions,
          churnedSubscriptions: result.metrics.churnedSubscriptions,
        },
        newMilestones: result.newMilestones,
        milestonesCreated: result.newMilestones.length,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('POST /api/integrations/stripe/sync error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync Stripe data' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/stripe/sync
 * Get current Stripe metrics without saving
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Get the user's Stripe integration
    const integration = await getIntegrationByProvider(user.id, 'stripe');

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Stripe not connected' },
        { status: 400 }
      );
    }

    // Just fetch metrics without saving
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(integration.accessToken, {
      apiVersion: '2025-12-15.clover',
    });

    const metrics = await stripeIntegration.fetchStripeMetrics(stripe);
    const milestoneChecks = stripeIntegration.checkMilestones(metrics);

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          customers: metrics.customerCount,
          mrr: metrics.mrrCents / 100,
          totalRevenue: metrics.totalRevenueCents / 100,
          activeSubscriptions: metrics.activeSubscriptions,
          churnedSubscriptions: metrics.churnedSubscriptions,
        },
        milestoneStatus: milestoneChecks.map((check) => ({
          type: check.type,
          achieved: check.achieved,
          value: check.value,
        })),
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET /api/integrations/stripe/sync error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Stripe metrics' },
      { status: 500 }
    );
  }
}
