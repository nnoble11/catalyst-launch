import OpenAI from 'openai';
import { AI_MODELS } from '@/config/constants';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateChatCompletion(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  }
) {
  const response = await openai.chat.completions.create({
    model: options?.model || AI_MODELS.openai.default,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2048,
    stream: options?.stream ?? false,
  });

  return response;
}

export async function* streamChatCompletion(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
) {
  const stream = await openai.chat.completions.create({
    model: options?.model || AI_MODELS.openai.default,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2048,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}

export async function generateStructuredOutput<T>(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  schema: object,
  options?: {
    model?: string;
    temperature?: number;
  }
): Promise<T> {
  const response = await openai.chat.completions.create({
    model: options?.model || AI_MODELS.openai.default,
    messages,
    temperature: options?.temperature ?? 0.3,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content in response');
  }

  try {
    return JSON.parse(content) as T;
  } catch (error) {
    console.error('Failed to parse OpenAI JSON response:', content);
    throw new Error(`Invalid JSON response from OpenAI: ${error instanceof Error ? error.message : 'Parse error'}`);
  }
}

export async function generateChatCompletionWithTools(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  tools: OpenAI.Chat.Completions.ChatCompletionTool[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
) {
  const response = await openai.chat.completions.create({
    model: options?.model || AI_MODELS.openai.fast,
    messages,
    temperature: options?.temperature ?? 0,
    max_tokens: options?.maxTokens ?? 256,
    tools,
    tool_choice: 'auto',
  });

  return response;
}

export { openai };
