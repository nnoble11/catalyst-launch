import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createIdea, createActivity } from '@/lib/db/queries';
import { getUserByClerkId } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    const body = await request.json();

    const { title, description } = body;

    if (!title || !description) {
      return NextResponse.json(
        { success: false, error: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Get user ID if authenticated
    let userId: string | undefined;
    if (clerkId) {
      const user = await getUserByClerkId(clerkId);
      userId = user?.id;
    }

    const idea = await createIdea({
      userId,
      title,
      description,
    });

    // Log activity if user is authenticated
    if (userId) {
      await createActivity({
        userId,
        type: 'idea_submitted',
        data: { ideaId: idea.id, title },
      });
    }

    return NextResponse.json({ success: true, data: idea }, { status: 201 });
  } catch (error) {
    console.error('POST /api/ideas error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create idea' },
      { status: 500 }
    );
  }
}
