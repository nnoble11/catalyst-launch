import { NextRequest, NextResponse } from 'next/server';
import { getIdeasLeaderboard, upvoteIdea } from '@/lib/db/queries';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawLimit = parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10);

    // Validate limit is a positive number within bounds
    const limit = isNaN(rawLimit) || rawLimit < 1
      ? DEFAULT_LIMIT
      : Math.min(rawLimit, MAX_LIMIT);

    const ideas = await getIdeasLeaderboard(limit);

    return NextResponse.json({ success: true, data: ideas });
  } catch (error) {
    console.error('GET /api/ideas/leaderboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ideaId } = body;

    if (!ideaId) {
      return NextResponse.json(
        { success: false, error: 'Idea ID is required' },
        { status: 400 }
      );
    }

    const idea = await upvoteIdea(ideaId);

    if (!idea) {
      return NextResponse.json(
        { success: false, error: 'Idea not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: idea });
  } catch (error) {
    console.error('POST /api/ideas/leaderboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upvote idea' },
      { status: 500 }
    );
  }
}
