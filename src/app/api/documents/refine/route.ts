import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import { getDocumentById, getProjectById } from '@/lib/db/queries';
import { generateStructuredOutput } from '@/lib/ai/openai';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { documentId, sectionId, currentContent, refinementPrompt, projectId } = body;

    if (!documentId || !sectionId || !currentContent || !refinementPrompt) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify document ownership
    const document = await getDocumentById(documentId);
    if (!document || document.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Get project context if available
    let projectContext = '';
    if (projectId) {
      const project = await getProjectById(projectId);
      if (project) {
        projectContext = `
Project: ${project.name}
Description: ${project.description || 'Not provided'}
Stage: ${project.stage}
Target Audience: ${project.metadata?.targetAudience || 'Not defined'}
Value Proposition: ${project.metadata?.valueProposition || 'Not defined'}`;
      }
    }

    const systemPrompt = `You are refining a section of a startup document.
${projectContext}

The user wants to: ${refinementPrompt}

Maintain the same structure and key information while applying the requested changes.
Return the refined content as JSON with key: refinedContent (string).`;

    const result = await generateStructuredOutput<{ refinedContent: string }>(
      [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Original content:\n\n${currentContent}\n\nPlease refine this content according to the instructions.`,
        },
      ],
      {
        type: 'object',
        properties: {
          refinedContent: { type: 'string' },
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        refinedContent: result.refinedContent,
        sectionId,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('POST /api/documents/refine error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to refine section' },
      { status: 500 }
    );
  }
}
