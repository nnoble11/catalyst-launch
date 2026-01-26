import { streamChatCompletion as openaiStream, generateChatCompletionWithTools } from '@/lib/ai/openai';
import { streamChatCompletion as anthropicStream } from '@/lib/ai/anthropic';
import { buildContextualPrompt } from '@/lib/ai/prompts/system';
import type { Stage } from '@/config/constants';
import {
  fetchAdditionalIntegrationData,
  buildIntegrationSummary,
  buildIntegrationHighlights,
} from '@/services/ai/context/integration-context';

export type AIProvider = 'openai' | 'anthropic';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatContext {
  projectId?: string;
  projectName?: string;
  stage?: Stage;
  description?: string;
  milestones?: { title: string; isCompleted: boolean }[];
  memoryContext?: string;
  integrationSummary?: string;
  integrationHighlights?: string[];
  integrationInsights?: {
    summary: string;
    insights?: string[];
    recommendations?: string[];
    nextSteps?: string[];
    generatedAt?: Date;
  };
  integrationData?: {
    provider: string;
    title?: string;
    content?: string;
    itemType?: string;
    sourceUrl?: string;
    createdAt?: Date;
    metadata?: {
      timestamp?: Date | string;
      custom?: {
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
      };
    };
  }[];
}

export async function* streamChat(
  messages: Message[],
  context: ChatContext,
  provider: AIProvider = 'openai',
  options?: { userId?: string }
) {
  const expandedContext = provider === 'openai'
    ? await maybeFetchMoreIntegrationData(messages, context, options?.userId)
    : context;

  const systemPrompt = expandedContext.projectName
    ? buildContextualPrompt({
        stage: expandedContext.stage || 'ideation',
        projectName: expandedContext.projectName,
        description: expandedContext.description,
        milestones: expandedContext.milestones,
        memoryContext: expandedContext.memoryContext,
        integrationSummary: expandedContext.integrationSummary,
        integrationHighlights: expandedContext.integrationHighlights,
        integrationInsights: expandedContext.integrationInsights,
        integrationData: expandedContext.integrationData,
      })
    : buildContextualPrompt({
        stage: 'ideation',
        projectName: 'General',
        description: 'General startup coaching session',
        memoryContext: expandedContext.memoryContext,
        integrationSummary: expandedContext.integrationSummary,
        integrationHighlights: expandedContext.integrationHighlights,
        integrationInsights: expandedContext.integrationInsights,
        integrationData: expandedContext.integrationData,
      });

  if (provider === 'anthropic') {
    // Convert messages for Anthropic (no system role in messages)
    const anthropicMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    yield* anthropicStream(anthropicMessages, systemPrompt);
  } else {
    // OpenAI format with system message
    const openaiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.filter((m) => m.role !== 'system'),
    ];

    yield* openaiStream(openaiMessages);
  }
}

async function maybeFetchMoreIntegrationData(
  messages: Message[],
  context: ChatContext,
  userId?: string
): Promise<ChatContext> {
  if (!userId) {
    return context;
  }

  const contextSummary = [
    context.integrationSummary,
    context.integrationHighlights?.length ? `Highlights: ${context.integrationHighlights.join('; ')}` : undefined,
    context.projectName ? `Project: ${context.projectName}` : undefined,
  ].filter(Boolean).join('\n');

  const toolPrompt = `You decide whether the assistant needs more ingested data to answer the user.
If the current context is insufficient, call the fetch_ingested_data tool with a focused query.
If not needed, respond normally without tool calls.

Current context summary:
${contextSummary || 'No integration summary available.'}`;

  const toolMessages: Message[] = [
    { role: 'system', content: toolPrompt },
    ...messages.filter((message) => message.role !== 'system'),
  ];

  const tools = [
    {
      type: 'function',
      function: {
        name: 'fetch_ingested_data',
        description: 'Fetch additional ingested data for deeper context.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            provider: { type: 'string' },
            itemTypes: { type: 'array', items: { type: 'string' } },
            sinceDays: { type: 'number' },
            limit: { type: 'number' },
          },
          required: ['query'],
        },
      },
    },
  ];

  try {
    const response = await generateChatCompletionWithTools(toolMessages, tools, {
      maxTokens: 128,
      temperature: 0,
    });

    const toolCalls = response.choices[0]?.message?.tool_calls ?? [];
    if (toolCalls.length === 0) {
      return context;
    }

    const call = toolCalls[0];
    if (call.type !== 'function' || call.function.name !== 'fetch_ingested_data') {
      return context;
    }

    const args = JSON.parse(call.function.arguments || '{}') as {
      query: string;
      provider?: string;
      itemTypes?: string[];
      sinceDays?: number;
      limit?: number;
    };

    const fetchResult = await fetchAdditionalIntegrationData(userId, {
      query: args.query,
      provider: args.provider,
      itemTypes: args.itemTypes,
      sinceDays: args.sinceDays,
      limit: Math.min(Math.max(args.limit ?? 20, 10), 60),
    });

    const existingItems = context.integrationData ?? [];
    const mergedItems = mergeIntegrationItems(existingItems, fetchResult.items);
    const summary = buildIntegrationSummary(mergedItems);
    const highlights = buildIntegrationHighlights(mergedItems);

    return {
      ...context,
      integrationData: mergedItems,
      integrationSummary: summary,
      integrationHighlights: highlights,
    };
  } catch (error) {
    console.warn('Tool-based integration fetch failed:', error);
    return context;
  }
}

function mergeIntegrationItems(
  existing: ChatContext['integrationData'] = [],
  incoming: ChatContext['integrationData'] = []
) {
  const combined = [...existing];
  const seen = new Set(
    existing.map((item) => `${item.provider}:${item.title ?? ''}:${item.sourceUrl ?? ''}`)
  );

  for (const item of incoming) {
    const key = `${item.provider}:${item.title ?? ''}:${item.sourceUrl ?? ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      combined.push(item);
    }
  }

  return combined;
}

export function countTokensEstimate(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}
