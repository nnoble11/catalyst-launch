import { NextRequest, NextResponse } from 'next/server';
import { getProgressFeed } from '@/lib/db/queries';

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

    const feedItems = await getProgressFeed(limit);

    return NextResponse.json({ success: true, data: feedItems });
  } catch (error) {
    console.error('GET /api/progress/feed error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch progress feed' },
      { status: 500 }
    );
  }
}
