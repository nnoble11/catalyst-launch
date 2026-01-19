import { streamChatCompletion as openaiStream } from '@/lib/ai/openai';
import { streamChatCompletion as anthropicStream } from '@/lib/ai/anthropic';
import { buildContextualPrompt } from '@/lib/ai/prompts/system';
import type { Stage } from '@/config/constants';

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
  integrationData?: {
    provider: string;
    title?: string;
    content?: string;
    itemType?: string;
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
  provider: AIProvider = 'openai'
) {
  const systemPrompt = context.projectName
    ? buildContextualPrompt({
        stage: context.stage || 'ideation',
        projectName: context.projectName,
        description: context.description,
        milestones: context.milestones,
        integrationData: context.integrationData,
      })
    : buildContextualPrompt({
        stage: 'ideation',
        projectName: 'General',
        description: 'General startup coaching session',
        integrationData: context.integrationData,
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

export function countTokensEstimate(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}
