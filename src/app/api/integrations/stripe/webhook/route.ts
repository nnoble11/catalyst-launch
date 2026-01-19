import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { WEBHOOK_SECRETS } from '@/config/integrations';
import { getIntegrationByProvider, getProjectById } from '@/lib/db/queries';
import stripeIntegration from '@/services/integrations/stripe/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover',
});

/**
 * POST /api/integrations/stripe/webhook
 * Handle incoming Stripe webhook events
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  const webhookSecret = WEBHOOK_SECRETS.stripe;
  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    );
  }

  // Log the event type
  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  try {
    // Events that trigger metric updates
    const relevantEvents = [
      'customer.created',
      'customer.deleted',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.paid',
      'charge.succeeded',
    ];

    if (relevantEvents.includes(event.type)) {
      // Get the Stripe account ID from the event
      const accountId = event.account;

      if (accountId) {
        // Find the integration for this Stripe account
        // This would require looking up by stripeAccountId in metadata
        // For now, we'll process the event for all connected Stripe integrations

        // In a production system, you'd want to:
        // 1. Store the stripeAccountId when the user connects
        // 2. Look up the integration by that ID
        // 3. Process only for that specific project

        console.log(`[Stripe Webhook] Processing ${event.type} for account ${accountId}`);
      }

      // Handle the webhook through the integration
      const items = await stripeIntegration.handleWebhook(event, signature);

      console.log(`[Stripe Webhook] Processed ${items.length} items from ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error processing event:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Required for Stripe webhooks - raw body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};
