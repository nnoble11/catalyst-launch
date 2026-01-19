import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import { getProjectsByUserId } from '@/lib/db/queries';
import { csvMetricsImporter } from '@/services/import/CSVMetricsImporter';

/**
 * POST /api/progress/import
 * Import traction metrics from CSV
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;
    const detectMilestones = formData.get('detectMilestones') !== 'false';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      return NextResponse.json(
        { success: false, error: 'File must be a CSV' },
        { status: 400 }
      );
    }

    // Get project ID if not provided
    let targetProjectId = projectId;
    if (!targetProjectId) {
      const projects = await getProjectsByUserId(user.id);
      if (projects.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No projects found' },
          { status: 400 }
        );
      }
      targetProjectId = projects[0].id;
    }

    // Read file content
    const content = await file.text();

    // Import the CSV
    const result = await csvMetricsImporter.import(content, targetProjectId, {
      detectMilestones,
    });

    return NextResponse.json({
      success: result.success,
      data: {
        rowsProcessed: result.rowsProcessed,
        rowsFailed: result.rowsFailed,
        milestonesCreated: result.milestonesCreated,
        errors: result.errors.length > 0 ? result.errors.slice(0, 10) : undefined, // Limit errors shown
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('POST /api/progress/import error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import CSV' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/progress/import
 * Import metrics from JSON data (direct API import)
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const { projectId, metrics, detectMilestones = true } = body;

    if (!metrics || !Array.isArray(metrics)) {
      return NextResponse.json(
        { success: false, error: 'Metrics array is required' },
        { status: 400 }
      );
    }

    // Get project ID if not provided
    let targetProjectId = projectId;
    if (!targetProjectId) {
      const projects = await getProjectsByUserId(user.id);
      if (projects.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No projects found' },
          { status: 400 }
        );
      }
      targetProjectId = projects[0].id;
    }

    // Convert JSON to CSV format for processing
    const headers = ['date', 'customers', 'mrr', 'revenue', 'active_users', 'nps'];
    const csvLines = [headers.join(',')];

    for (const metric of metrics) {
      const row = [
        metric.date || new Date().toISOString().split('T')[0],
        metric.customers ?? '',
        metric.mrr ?? '',
        metric.revenue ?? '',
        metric.activeUsers ?? '',
        metric.nps ?? '',
      ];
      csvLines.push(row.join(','));
    }

    const csvContent = csvLines.join('\n');

    // Import using the CSV importer
    const result = await csvMetricsImporter.import(csvContent, targetProjectId, {
      detectMilestones,
    });

    return NextResponse.json({
      success: result.success,
      data: {
        rowsProcessed: result.rowsProcessed,
        rowsFailed: result.rowsFailed,
        milestonesCreated: result.milestonesCreated,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('PUT /api/progress/import error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import metrics' },
      { status: 500 }
    );
  }
}
