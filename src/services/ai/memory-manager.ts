import { generateStructuredOutput } from '@/lib/ai/openai';
import {
  getAiMemories,
  upsertAiMemory,
  deleteAiMemory,
  getAiMemoryByKey,
} from '@/lib/db/queries';
import type { AiMemory } from '@/types';

interface ExtractedMemory {
  key: string;
  value: string;
  category: string;
  confidence: number;
}

// Memory categories
export const MEMORY_CATEGORIES = {
  preference: 'User preferences and working style',
  decision: 'Past decisions and their rationale',
  challenge: 'Recurring challenges and blockers',
  goal: 'Goals and motivations',
  context: 'Important context about the project or founder',
  feedback: 'Feedback and lessons learned',
} as const;

export type MemoryCategory = keyof typeof MEMORY_CATEGORIES;

/**
 * Extract memorable information from a conversation
 */
export async function extractMemories(
  userId: string,
  projectId: string | undefined,
  messages: { role: string; content: string }[]
): Promise<ExtractedMemory[]> {
  // Only analyze recent messages
  const recentMessages = messages.slice(-10);
  const conversationText = recentMessages
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  const systemPrompt = `You are an AI memory extraction system. Your job is to identify key information from conversations that should be remembered for future interactions.

Focus on extracting:
1. User preferences (communication style, working hours, etc.)
2. Important decisions and why they were made
3. Recurring challenges or blockers
4. Goals and motivations
5. Key context about the project or founder
6. Feedback or lessons learned

For each memory, provide:
- key: A unique identifier (snake_case, e.g., "preferred_communication_style")
- value: The actual information to remember
- category: One of [preference, decision, challenge, goal, context, feedback]
- confidence: How confident you are this should be remembered (0-100)

Only extract information that would be valuable to remember across sessions.
Return empty array if nothing significant to remember.`;

  const userPrompt = `Extract memorable information from this conversation:\n\n${conversationText}

Return as JSON with key: memories (array of {key, value, category, confidence})`;

  try {
    const result = await generateStructuredOutput<{ memories: ExtractedMemory[] }>(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        type: 'object',
        properties: {
          memories: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                key: { type: 'string' },
                value: { type: 'string' },
                category: { type: 'string' },
                confidence: { type: 'number' },
              },
            },
          },
        },
      }
    );

    // Filter memories with high enough confidence
    return result.memories.filter((m) => m.confidence >= 70);
  } catch (error) {
    console.error('Error extracting memories:', error);
    return [];
  }
}

/**
 * Store extracted memories in the database
 */
export async function storeMemories(
  userId: string,
  projectId: string | undefined,
  memories: ExtractedMemory[],
  source = 'conversation'
): Promise<AiMemory[]> {
  const storedMemories: AiMemory[] = [];

  for (const memory of memories) {
    try {
      const stored = await upsertAiMemory({
        userId,
        projectId,
        key: memory.key,
        value: memory.value,
        category: memory.category,
        confidence: memory.confidence,
        source,
      });
      storedMemories.push(stored);
    } catch (error) {
      console.error(`Error storing memory ${memory.key}:`, error);
    }
  }

  return storedMemories;
}

/**
 * Get relevant memories for a context
 */
export async function getRelevantMemories(
  userId: string,
  projectId?: string,
  category?: MemoryCategory
): Promise<AiMemory[]> {
  const memories = await getAiMemories(userId, projectId, category);
  return memories;
}

/**
 * Build a memory context string for AI prompts
 */
export async function buildMemoryContext(
  userId: string,
  projectId?: string
): Promise<string> {
  const memories = await getAiMemories(userId, projectId);

  if (memories.length === 0) {
    return '';
  }

  const groupedMemories = memories.reduce(
    (acc, memory) => {
      const category = memory.category || 'general';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(memory);
      return acc;
    },
    {} as Record<string, AiMemory[]>
  );

  let context = 'What I remember about this user:\n';

  for (const [category, categoryMemories] of Object.entries(groupedMemories)) {
    const categoryLabel = MEMORY_CATEGORIES[category as MemoryCategory] || category;
    context += `\n${categoryLabel}:\n`;
    for (const memory of categoryMemories) {
      context += `- ${memory.key}: ${memory.value}\n`;
    }
  }

  return context;
}

/**
 * Update a specific memory
 */
export async function updateMemory(
  userId: string,
  key: string,
  value: string,
  projectId?: string
): Promise<AiMemory | null> {
  return upsertAiMemory({
    userId,
    projectId,
    key,
    value,
    source: 'manual_update',
  });
}

/**
 * Delete a memory
 */
export async function forgetMemory(memoryId: string): Promise<void> {
  await deleteAiMemory(memoryId);
}

/**
 * Summarize and consolidate memories periodically
 */
export async function consolidateMemories(
  userId: string,
  projectId?: string
): Promise<void> {
  const memories = await getAiMemories(userId, projectId);

  if (memories.length < 10) {
    // Not enough memories to consolidate
    return;
  }

  // Group similar memories
  const groupedByCategory = memories.reduce(
    (acc, memory) => {
      const category = memory.category || 'general';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(memory);
      return acc;
    },
    {} as Record<string, AiMemory[]>
  );

  // For each category with many memories, ask AI to consolidate
  for (const [category, categoryMemories] of Object.entries(groupedByCategory)) {
    if (categoryMemories.length < 5) continue;

    const memoryText = categoryMemories
      .map((m) => `${m.key}: ${m.value}`)
      .join('\n');

    try {
      const result = await generateStructuredOutput<{
        consolidated: { key: string; value: string }[];
        toRemove: string[];
      }>(
        [
          {
            role: 'system',
            content: `You are consolidating AI memories. Given multiple related memories, combine redundant ones and identify which can be removed. Keep the most important and current information.`,
          },
          {
            role: 'user',
            content: `Consolidate these ${category} memories:\n${memoryText}\n\nReturn JSON with: consolidated (new combined memories) and toRemove (keys to delete)`,
          },
        ],
        {}
      );

      // Remove old memories
      for (const key of result.toRemove) {
        const memory = categoryMemories.find((m) => m.key === key);
        if (memory) {
          await deleteAiMemory(memory.id);
        }
      }

      // Add consolidated memories
      for (const newMemory of result.consolidated) {
        await upsertAiMemory({
          userId,
          projectId,
          key: newMemory.key,
          value: newMemory.value,
          category,
          confidence: 90,
          source: 'consolidation',
        });
      }
    } catch (error) {
      console.error(`Error consolidating ${category} memories:`, error);
    }
  }
}
