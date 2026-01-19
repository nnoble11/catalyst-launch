import { NextResponse } from 'next/server';
import { INTEGRATION_DEFINITIONS } from '@/services/integrations/registry';

export async function GET() {
  try {
    // Return all integration definitions
    // In production, you might filter based on user's plan/features
    return NextResponse.json({
      success: true,
      data: INTEGRATION_DEFINITIONS,
    });
  } catch (error) {
    console.error('GET /api/integrations/definitions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch integration definitions' },
      { status: 500 }
    );
  }
}
