import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import { generateWeeklyReport } from '@/services/reports/weekly-generator';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const report = await generateWeeklyReport(user.id);

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET /api/reports/weekly error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate weekly report' },
      { status: 500 }
    );
  }
}
