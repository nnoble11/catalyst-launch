import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { integrations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createIngestedItem } from '@/lib/db/queries';

interface SlackEvent {
  type: string;
  user?: string;
  text?: string;
  channel?: string;
  ts?: string;
  team?: string;
}

interface SlackEventPayload {
  type: string;
  challenge?: string;
  command?: string;
  event?: SlackEvent;
  team_id?: string;
}

// Slack event verification and handling
export async function POST(request: NextRequest) {
  try {
    const body: SlackEventPayload = await request.json();

    // URL verification challenge
    if (body.type === 'url_verification') {
      return NextResponse.json({ challenge: body.challenge });
    }

    // Handle slash commands
    if (body.command) {
      return NextResponse.json({ response_type: 'ephemeral', text: 'Processing...' });
    }

    // Handle interactive components (buttons, selects, etc.)
    if (body.type === 'interactive_message' || body.type === 'block_actions') {
      return NextResponse.json({ text: 'Action received!' });
    }

    // Handle events
    if (body.event && body.team_id) {
      const event = body.event;

      // Find integrations with this Slack team
      const slackIntegrations = await db.select()
        .from(integrations)
        .where(eq(integrations.provider, 'slack'));

      // Filter to integrations that match this team
      const matchingIntegrations = slackIntegrations.filter((integration) => {
        const metadata = integration.metadata as Record<string, unknown> | null;
        return metadata?.teamId === body.team_id;
      });

      // Process message events
      if (event.type === 'message' && event.text && !event.text.startsWith('bot:')) {
        for (const integration of matchingIntegrations) {
          try {
            await createIngestedItem({
              userId: integration.userId,
              integrationId: integration.id,
              provider: 'slack',
              sourceId: `slack-${event.channel}-${event.ts}`,
              itemType: 'message',
              title: `Slack message in #${event.channel}`,
              content: event.text,
              rawData: { event, teamId: body.team_id },
              metadata: {
                channel: event.channel,
                user: event.user,
                timestamp: event.ts,
              },
              status: 'pending',
            });
            console.log(`[Slack Events] Ingested message for user ${integration.userId}`);
          } catch (err) {
            console.error(`[Slack Events] Failed to ingest message:`, err);
          }
        }
      }

      // Process app mentions
      if (event.type === 'app_mention' && event.text) {
        for (const integration of matchingIntegrations) {
          try {
            await createIngestedItem({
              userId: integration.userId,
              integrationId: integration.id,
              provider: 'slack',
              sourceId: `slack-mention-${event.channel}-${event.ts}`,
              itemType: 'message',
              title: `Slack mention in #${event.channel}`,
              content: event.text,
              rawData: { event, teamId: body.team_id },
              metadata: {
                channel: event.channel,
                user: event.user,
                timestamp: event.ts,
              },
              status: 'pending',
            });
            console.log(`[Slack Events] Ingested mention for user ${integration.userId}`);
          } catch (err) {
            console.error(`[Slack Events] Failed to ingest mention:`, err);
          }
        }
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/integrations/slack/events error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle form-encoded slash command requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
