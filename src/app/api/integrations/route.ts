import { NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import { getIntegrationsByUserId } from '@/lib/db/queries';

export async function GET() {
  try {
    const user = await requireAuth();
    const integrations = await getIntegrationsByUserId(user.id);

    // Don't return sensitive tokens
    const safeIntegrations = integrations.map((i) => ({
      id: i.id,
      provider: i.provider,
      metadata: i.metadata,
      createdAt: i.createdAt,
    }));

    return NextResponse.json({ success: true, data: safeIntegrations });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET /api/integrations error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}
