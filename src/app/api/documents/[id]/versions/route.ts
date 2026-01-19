import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import {
  getDocumentById,
  getDocumentVersions,
  createDocumentVersion,
  updateDocument,
} from '@/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Verify document ownership
    const document = await getDocumentById(id);
    if (!document || document.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    const versions = await getDocumentVersions(id);

    return NextResponse.json({ success: true, data: versions });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET /api/documents/[id]/versions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch versions' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { changeDescription } = body;

    // Verify document ownership
    const document = await getDocumentById(id);
    if (!document || document.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Create a version snapshot of current content
    const version = await createDocumentVersion({
      documentId: id,
      version: document.version,
      content: document.content,
      changeDescription,
    });

    // Increment document version
    await updateDocument(id, { version: document.version + 1 });

    return NextResponse.json({ success: true, data: version }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('POST /api/documents/[id]/versions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create version' },
      { status: 500 }
    );
  }
}
