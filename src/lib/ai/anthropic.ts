import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/config/constants';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateChatCompletion(
  messages: { role: 'user' | 'assistant'; content: string }[],
  systemPrompt?: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
) {
  const response = await anthropic.messages.create({
    model: options?.model || AI_MODELS.anthropic.default,
    max_tokens: options?.maxTokens ?? 2048,
    system: systemPrompt,
    messages,
  });

  return response;
}

export async function* streamChatCompletion(
  messages: { role: 'user' | 'assistant'; content: string }[],
  systemPrompt?: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
) {
  const stream = await anthropic.messages.stream({
    model: options?.model || AI_MODELS.anthropic.default,
    max_tokens: options?.maxTokens ?? 2048,
    system: systemPrompt,
    messages,
  });

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text;
    }
  }
}

export { anthropic };
