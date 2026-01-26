import { createHash } from 'crypto';
import { openai } from '@/lib/ai/openai';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const MAX_INPUT_CHARS = 6000;

export function buildEmbeddingText(title?: string | null, content?: string | null): string {
  const parts = [title, content].filter((part): part is string => Boolean(part && part.trim().length > 0));
  return parts.join('\n\n');
}

export function normalizeEmbeddingText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_INPUT_CHARS);
}

export function hashEmbeddingText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const input = normalizeEmbeddingText(text);
  if (!input) {
    return [];
  }

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input,
  });

  return response.data[0]?.embedding ?? [];
}
