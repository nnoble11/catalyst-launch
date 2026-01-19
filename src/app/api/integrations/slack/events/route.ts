import { NextRequest, NextResponse } from 'next/server';
import { handleSlackCommand } from '@/services/integrations/slack/commands';
import { getUserByClerkId } from '@/lib/db/queries';

// Slack event verification and handling
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // URL verification challenge
    if (body.type === 'url_verification') {
      return NextResponse.json({ challenge: body.challenge });
    }

    // Handle slash commands
    if (body.command) {
      // Get user by Slack user ID - would need to store this mapping
      // For now, return acknowledgment
      return NextResponse.json({ response_type: 'ephemeral', text: 'Processing...' });
    }

    // Handle interactive components (buttons, selects, etc.)
    if (body.type === 'interactive_message' || body.type === 'block_actions') {
      // Handle button clicks, etc.
      return NextResponse.json({ text: 'Action received!' });
    }

    // Handle events
    if (body.event) {
      const event = body.event;

      switch (event.type) {
        case 'app_mention':
          // Handle @mentions of the bot
          return NextResponse.json({ ok: true });

        case 'message':
          // Handle direct messages to the bot
          return NextResponse.json({ ok: true });

        default:
          return NextResponse.json({ ok: true });
      }
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
