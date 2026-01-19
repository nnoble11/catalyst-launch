import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import { generateDocument } from '@/services/documents/generator';
import { DOCUMENT_TYPES, type DocumentType } from '@/config/constants';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const { projectId, documentType } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    if (!documentType || !DOCUMENT_TYPES.includes(documentType)) {
      return NextResponse.json(
        { success: false, error: 'Valid document type is required' },
        { status: 400 }
      );
    }

    const result = await generateDocument(
      user.id,
      projectId,
      documentType as DocumentType
    );

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('POST /api/documents/generate error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to generate document';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
