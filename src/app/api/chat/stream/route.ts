import { NextRequest } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import { getProjectById, createMessage, createActivity, updateConversation } from '@/lib/db/queries';
import { streamChat, type AIProvider } from '@/services/ai/orchestrator';
import { createSSEStream } from '@/services/ai/streaming';
import { buildMemoryContext } from '@/services/ai/memory-manager';
import { buildIntegrationContext } from '@/services/ai/context/integration-context';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const {
      conversationId,
      messages,
      projectId,
      provider = 'openai',
    } = body as {
      conversationId: string;
      messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
      projectId?: string;
      provider?: AIProvider;
    };

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get project context if provided
    let context: {
      projectId?: string;
      projectName?: string;
      stage?: 'ideation' | 'mvp' | 'gtm';
      description?: string;
      milestones?: { title: string; isCompleted: boolean }[];
      integrationData?: { provider: string; title?: string; content?: string; itemType?: string; sourceUrl?: string; createdAt?: Date }[];
      integrationSummary?: string;
      integrationHighlights?: string[];
      memoryContext?: string;
    } = {};

    if (projectId) {
      const project = await getProjectById(projectId);
      if (project && project.userId === user.id) {
        context = {
          projectId: project.id,
          projectName: project.name,
          stage: project.stage,
          description: project.description || undefined,
          milestones: project.milestones?.map((m) => ({
            title: m.title,
            isCompleted: m.isCompleted,
          })) || [],
        };
      }
    }

    // Fetch integration data and memory context for AI
    try {
      const [memoryContext, integrationContext] = await Promise.all([
        buildMemoryContext(user.id, projectId),
        buildIntegrationContext(user.id, {
          messages,
          projectName: context.projectName,
          projectDescription: context.description,
          status: 'processed',
          recentLimit: 80,
          searchLimit: 80,
          maxItems: 60,
          recentDays: 90,
          maxPerProvider: 12,
        }),
      ]);

      if (memoryContext) {
        context.memoryContext = memoryContext;
      }
      if (integrationContext.items.length > 0) {
        context.integrationData = integrationContext.items;
        context.integrationSummary = integrationContext.summary;
        context.integrationHighlights = integrationContext.highlights;
      }
    } catch {
      // Non-critical: integration data fetch failure shouldn't block chat
    }

    // Create SSE stream
    const { stream, sendText, sendDone, sendError, close } = createSSEStream();

    // Start streaming in the background
    (async () => {
      try {
        let fullResponse = '';

        for await (const chunk of streamChat(messages, context, provider)) {
          sendText(chunk);
          fullResponse += chunk;
        }

        // Save the assistant message to the database
        if (conversationId && fullResponse) {
          await createMessage({
            conversationId,
            role: 'assistant',
            content: fullResponse,
            metadata: { model: provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-20250514' },
          });

          // Update conversation's updatedAt timestamp
          await updateConversation(conversationId, {});

          // Log activity
          await createActivity({
            userId: user.id,
            projectId: projectId || undefined,
            type: 'chat_message',
            data: { conversationId, provider },
          });
        }

        sendDone();
      } catch (error) {
        console.error('Streaming error:', error);
        sendError(error instanceof Error ? error.message : 'Streaming failed');
      } finally {
        close();
      }
    })();

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.error('POST /api/chat/stream error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
