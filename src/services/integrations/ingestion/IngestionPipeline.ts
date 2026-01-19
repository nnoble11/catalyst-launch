/**
 * IngestionPipeline - Process incoming items from integrations
 *
 * This pipeline:
 * 1. Receives normalized StandardIngestItems
 * 2. Optionally classifies content with AI
 * 3. Creates captures in the system
 * 4. Extracts memories for AI context
 * 5. Optionally creates tasks from actionable items
 */

import type {
  StandardIngestItem,
  IngestItemType,
} from '@/types/integrations';
import type { CaptureType } from '@/config/constants';
import { createCapture, upsertAiMemory, createTask } from '@/lib/db/queries';

export interface PipelineResult {
  success: boolean;
  captureId?: string;
  memoryIds: string[];
  taskIds: string[];
  error?: string;
}

export interface PipelineOptions {
  skipCapture?: boolean;
  skipMemoryExtraction?: boolean;
  skipTaskExtraction?: boolean;
  projectId?: string;
}

// Map ingest item types to capture types
const INGEST_TO_CAPTURE_TYPE: Record<IngestItemType, CaptureType> = {
  note: 'note',
  highlight: 'note',
  meeting: 'note',
  task: 'task',
  message: 'note',
  article: 'resource',
  bookmark: 'resource',
  document: 'note',
  email: 'note',
  comment: 'note',
  issue: 'task',
  clip: 'resource',
};

export class IngestionPipeline {
  /**
   * Process a single item through the pipeline
   */
  async process(
    userId: string,
    item: StandardIngestItem,
    options?: PipelineOptions
  ): Promise<PipelineResult> {
    const result: PipelineResult = {
      success: false,
      memoryIds: [],
      taskIds: [],
    };

    try {
      // Step 1: Create capture (unless skipped)
      if (!options?.skipCapture) {
        const capture = await this.createCaptureFromItem(userId, item, options?.projectId);
        result.captureId = capture.id;
      }

      // Step 2: Extract and store AI memories (unless skipped)
      if (!options?.skipMemoryExtraction) {
        const memories = await this.extractMemories(userId, item, options?.projectId);
        result.memoryIds = memories;
      }

      // Step 3: Extract tasks if applicable (unless skipped)
      if (!options?.skipTaskExtraction && this.shouldExtractTasks(item)) {
        const tasks = await this.extractTasks(userId, item, options?.projectId);
        result.taskIds = tasks;
      }

      result.success = true;
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }

  /**
   * Process multiple items in batch
   */
  async processBatch(
    userId: string,
    items: StandardIngestItem[],
    options?: PipelineOptions
  ): Promise<PipelineResult[]> {
    const results: PipelineResult[] = [];

    for (const item of items) {
      const result = await this.process(userId, item, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Create a capture from an ingested item
   */
  private async createCaptureFromItem(
    userId: string,
    item: StandardIngestItem,
    projectId?: string
  ) {
    const captureType = INGEST_TO_CAPTURE_TYPE[item.type] || 'note';

    // Build content with title if available
    let content = item.content;
    if (item.title && !content.startsWith(item.title)) {
      content = `${item.title}\n\n${content}`;
    }

    // Add source attribution
    const sourceAttribution = `\n\n---\nSource: ${item.sourceProvider}${item.sourceUrl ? ` | ${item.sourceUrl}` : ''}`;
    content += sourceAttribution;

    const capture = await createCapture({
      userId,
      projectId: projectId || item.processingHints?.linkToProject,
      content,
      type: captureType,
    });

    return capture;
  }

  /**
   * Extract memories from an item for AI context
   */
  private async extractMemories(
    userId: string,
    item: StandardIngestItem,
    projectId?: string
  ): Promise<string[]> {
    const memoryIds: string[] = [];

    // Extract key information based on item type
    const memories = this.generateMemoriesFromItem(item);

    for (const memory of memories) {
      const stored = await upsertAiMemory({
        userId,
        projectId: projectId || item.processingHints?.linkToProject,
        key: memory.key,
        value: memory.value,
        category: memory.category,
        source: `${item.sourceProvider}:${item.sourceId}`,
        confidence: memory.confidence ?? 70,
      });
      memoryIds.push(stored.id);
    }

    return memoryIds;
  }

  /**
   * Generate memories based on item type and content
   */
  private generateMemoriesFromItem(item: StandardIngestItem): Array<{
    key: string;
    value: string;
    category: string;
    confidence?: number;
  }> {
    const memories: Array<{
      key: string;
      value: string;
      category: string;
      confidence?: number;
    }> = [];

    // Basic memory: store the content summary
    if (item.summary) {
      memories.push({
        key: `${item.sourceProvider}_${item.type}_${item.sourceId}`,
        value: item.summary,
        category: this.getMemoryCategory(item.type),
        confidence: 80,
      });
    }

    // Type-specific memories
    switch (item.type) {
      case 'meeting':
        if (item.title) {
          memories.push({
            key: `meeting_${item.sourceId}`,
            value: `Meeting: ${item.title}. ${item.summary || item.content.substring(0, 200)}`,
            category: 'meetings',
            confidence: 85,
          });
        }
        break;

      case 'highlight':
        memories.push({
          key: `highlight_${item.sourceId}`,
          value: item.content,
          category: 'reading_highlights',
          confidence: 90,
        });
        break;

      case 'task':
      case 'issue':
        if (item.title) {
          memories.push({
            key: `task_${item.sourceId}`,
            value: `Task: ${item.title}`,
            category: 'tasks',
            confidence: 85,
          });
        }
        break;

      case 'bookmark':
      case 'article':
        if (item.title && item.sourceUrl) {
          memories.push({
            key: `resource_${item.sourceId}`,
            value: `Saved: ${item.title} - ${item.sourceUrl}`,
            category: 'resources',
            confidence: 75,
          });
        }
        break;
    }

    // Extract tags as memories
    if (item.metadata.tags && item.metadata.tags.length > 0) {
      memories.push({
        key: `tags_${item.sourceId}`,
        value: `Tagged with: ${item.metadata.tags.join(', ')}`,
        category: 'tags',
        confidence: 80,
      });
    }

    return memories;
  }

  /**
   * Get memory category based on item type
   */
  private getMemoryCategory(type: IngestItemType): string {
    const categoryMap: Record<IngestItemType, string> = {
      note: 'notes',
      highlight: 'reading_highlights',
      meeting: 'meetings',
      task: 'tasks',
      message: 'communication',
      article: 'reading',
      bookmark: 'resources',
      document: 'documents',
      email: 'communication',
      comment: 'communication',
      issue: 'tasks',
      clip: 'web_clips',
    };
    return categoryMap[type] || 'general';
  }

  /**
   * Determine if tasks should be extracted from this item
   */
  private shouldExtractTasks(item: StandardIngestItem): boolean {
    // Tasks and issues are directly task-like
    if (item.type === 'task' || item.type === 'issue') {
      return true;
    }

    // Check processing hints
    if (item.processingHints?.extractTasks) {
      return true;
    }

    return false;
  }

  /**
   * Extract and create tasks from an item
   */
  private async extractTasks(
    userId: string,
    item: StandardIngestItem,
    projectId?: string
  ): Promise<string[]> {
    const taskIds: string[] = [];

    // For task/issue types, create a task directly
    if (item.type === 'task' || item.type === 'issue') {
      const task = await createTask({
        userId,
        projectId: projectId || item.processingHints?.linkToProject,
        title: item.title || item.content.substring(0, 100),
        description: item.content,
        status: 'backlog',
        priority: this.mapPriority(item.processingHints?.priority),
        aiSuggested: true,
        aiRationale: `Imported from ${item.sourceProvider}`,
      });
      taskIds.push(task.id);
    }

    return taskIds;
  }

  /**
   * Map priority hint to task priority
   */
  private mapPriority(hint?: 'low' | 'medium' | 'high'): 'low' | 'medium' | 'high' | 'urgent' {
    if (!hint) return 'medium';
    return hint;
  }
}

export const ingestionPipeline = new IngestionPipeline();
