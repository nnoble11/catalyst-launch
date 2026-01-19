import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { WEBHOOK_SECRETS } from '@/config/integrations';
import githubIntegration from '@/services/integrations/github/client';
import { ingestionPipeline } from '@/services/integrations/ingestion/IngestionPipeline';
import { db } from '@/lib/db/client';
import { integrations, webhookSubscriptions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Verify GitHub webhook signature using HMAC-SHA256
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * POST /api/integrations/github/webhook
 * Handle incoming GitHub webhook events
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  const eventType = request.headers.get('x-github-event');
  const deliveryId = request.headers.get('x-github-delivery');

  // Validate required headers
  if (!signature) {
    console.error('[GitHub Webhook] Missing x-hub-signature-256 header');
    return NextResponse.json(
      { error: 'Missing signature header' },
      { status: 401 }
    );
  }

  if (!eventType) {
    console.error('[GitHub Webhook] Missing x-github-event header');
    return NextResponse.json(
      { error: 'Missing event type header' },
      { status: 400 }
    );
  }

  // Verify webhook secret
  const webhookSecret = WEBHOOK_SECRETS.github;
  if (!webhookSecret) {
    console.error('[GitHub Webhook] Webhook secret not configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  // Verify signature
  if (!verifySignature(body, signature, webhookSecret)) {
    console.error('[GitHub Webhook] Invalid signature');
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    );
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    console.error('[GitHub Webhook] Invalid JSON payload');
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  console.log(`[GitHub Webhook] Received event: ${eventType} (delivery: ${deliveryId})`);

  // Events we care about
  const relevantEvents = [
    'push',
    'pull_request',
    'issues',
    'release',
    'issue_comment',
    'pull_request_review_comment',
  ];

  if (!relevantEvents.includes(eventType)) {
    // Acknowledge but don't process
    console.log(`[GitHub Webhook] Ignoring event type: ${eventType}`);
    return NextResponse.json({ received: true, processed: false });
  }

  try {
    // Get the repository info from payload
    const repository = payload.repository;
    if (!repository) {
      console.error('[GitHub Webhook] No repository in payload');
      return NextResponse.json(
        { error: 'No repository in payload' },
        { status: 400 }
      );
    }

    const repoFullName = repository.full_name;

    // Find integrations that have this repo selected
    // We need to find all GitHub integrations and check their metadata
    const githubIntegrations = await db.select()
      .from(integrations)
      .where(eq(integrations.provider, 'github'));

    let processedCount = 0;

    for (const integration of githubIntegrations) {
      const metadata = integration.metadata as Record<string, unknown> | null;
      const selectedRepos = (metadata?.selectedRepositories as string[]) || [];

      if (!selectedRepos.includes(repoFullName)) {
        continue;
      }

      // Process the webhook for this integration
      try {
        const items = await githubIntegration.handleWebhook(payload, signature);

        if (items.length > 0) {
          // Process through ingestion pipeline
          for (const item of items) {
            await ingestionPipeline.process(
              integration.userId,
              item
            );
          }

          console.log(`[GitHub Webhook] Processed ${items.length} items for user ${integration.userId}`);
          processedCount += items.length;
        }

        // Update webhook subscription last received timestamp
        await db.update(webhookSubscriptions)
          .set({ lastReceivedAt: new Date() })
          .where(
            and(
              eq(webhookSubscriptions.integrationId, integration.id),
              eq(webhookSubscriptions.provider, 'github')
            )
          );
      } catch (error) {
        console.error(`[GitHub Webhook] Error processing for user ${integration.userId}:`, error);
      }
    }

    return NextResponse.json({
      received: true,
      processed: true,
      itemsProcessed: processedCount,
    });
  } catch (error) {
    console.error('[GitHub Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Ping event handler (GitHub sends this when webhook is created)
export async function GET(_request: NextRequest) {
  return NextResponse.json({ status: 'ok', message: 'GitHub webhook endpoint active' });
}
