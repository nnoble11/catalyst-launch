import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import {
  getNotionAuthUrl,
  exchangeNotionCode,
  saveNotionIntegration,
  searchNotionPages,
  exportDocumentToNotion,
} from '@/services/integrations/notion/client';
import { getIntegrationByProvider, deleteIntegration, getDocumentById } from '@/lib/db/queries';
import { v4 as uuidv4 } from 'uuid';

// Get Notion auth URL or connection status
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'auth') {
      const state = uuidv4();
      const authUrl = getNotionAuthUrl(state);
      return NextResponse.json({ success: true, data: { authUrl, state } });
    }

    if (action === 'pages') {
      const query = searchParams.get('query') || undefined;
      const pages = await searchNotionPages(user.id, query);
      return NextResponse.json({ success: true, data: pages });
    }

    // Get connection status
    const integration = await getIntegrationByProvider(user.id, 'notion');

    return NextResponse.json({
      success: true,
      data: {
        connected: !!integration,
        metadata: integration?.metadata || null,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET /api/integrations/notion error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get Notion status' },
      { status: 500 }
    );
  }
}

// OAuth callback or export document
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    // OAuth callback
    if (body.code) {
      const { accessToken, workspaceId, workspaceName, workspaceIcon } =
        await exchangeNotionCode(body.code);

      await saveNotionIntegration(user.id, accessToken, {
        workspaceId,
        workspaceName,
        workspaceIcon,
      });

      return NextResponse.json({
        success: true,
        data: { connected: true, workspaceName },
      });
    }

    // Export document to Notion
    if (body.documentId && body.parentPageId) {
      const document = await getDocumentById(body.documentId);

      if (!document || document.userId !== user.id) {
        return NextResponse.json(
          { success: false, error: 'Document not found' },
          { status: 404 }
        );
      }

      const sections = document.content.sections.map((s) => ({
        title: s.title,
        content: s.content,
      }));

      const page = await exportDocumentToNotion(
        user.id,
        body.parentPageId,
        document.title,
        sections
      );

      return NextResponse.json({
        success: true,
        data: { page },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('POST /api/integrations/notion error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process Notion request' },
      { status: 500 }
    );
  }
}

// Disconnect
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();

    const integration = await getIntegrationByProvider(user.id, 'notion');
    if (integration) {
      await deleteIntegration(integration.id);
    }

    return NextResponse.json({ success: true, data: { disconnected: true } });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('DELETE /api/integrations/notion error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect Notion' },
      { status: 500 }
    );
  }
}
