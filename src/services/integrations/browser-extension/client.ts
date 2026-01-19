/**
 * Browser Extension Integration
 *
 * This integration receives clips and highlights pushed from a browser extension.
 * It doesn't sync data - instead it provides an API endpoint for the extension to push to.
 *
 * Auth: Custom (API key/token)
 * Sync: Push (extension pushes to us)
 */

import { ApiKeyIntegration, IntegrationContext } from '../base/BaseIntegration';
import type {
  IntegrationDefinition,
  StandardIngestItem,
  SyncOptions,
  IntegrationTokens,
} from '@/types/integrations';
import { integrationRegistry } from '../registry';
import { randomBytes } from 'crypto';

export interface WebClip {
  url: string;
  title: string;
  content: string;
  selectedText?: string;
  note?: string;
  tags?: string[];
  timestamp: string;
  source: 'chrome' | 'firefox' | 'safari' | 'edge' | 'other';
  type: 'page' | 'selection' | 'image' | 'link';
  metadata?: {
    author?: string;
    publishedDate?: string;
    siteName?: string;
    description?: string;
    imageUrl?: string;
  };
}

export class BrowserExtensionIntegration extends ApiKeyIntegration {
  readonly definition: IntegrationDefinition = {
    id: 'browser_extension',
    name: 'Browser Extension',
    description: 'Clip web pages, articles, and highlights directly from your browser.',
    icon: 'globe',
    category: 'capture_tools',
    authMethod: 'custom',
    syncMethod: 'push',
    supportedTypes: ['clip', 'highlight', 'bookmark', 'article'],
    defaultSyncInterval: 0, // Push-based
    features: {
      realtime: true,
      bidirectional: false,
      incrementalSync: false,
      webhooks: false,
    },
    isAvailable: true,
  };

  /**
   * Generate a new API key for the browser extension
   */
  static generateApiKey(): string {
    return `cle_${randomBytes(32).toString('hex')}`;
  }

  /**
   * Validate the API key
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    // API key should start with our prefix and be the right length
    return apiKey.startsWith('cle_') && apiKey.length === 68;
  }

  /**
   * Get account info - for browser extension this is minimal
   */
  async getAccountInfo(_tokens: IntegrationTokens): Promise<{
    accountName?: string;
    [key: string]: unknown;
  }> {
    return {
      accountName: 'Browser Extension',
      type: 'push',
    };
  }

  /**
   * Browser extension doesn't pull - it receives pushes
   */
  async sync(
    _context: IntegrationContext,
    _options?: SyncOptions
  ): Promise<StandardIngestItem[]> {
    // No pull sync for browser extension
    return [];
  }

  /**
   * Process a web clip pushed from the extension
   */
  processClip(clip: WebClip): StandardIngestItem {
    let content = '';
    let type: 'clip' | 'highlight' | 'bookmark' | 'article' = 'clip';

    // Determine type based on clip data
    if (clip.type === 'selection' && clip.selectedText) {
      type = 'highlight';
      content = clip.selectedText;
      if (clip.note) {
        content += `\n\n**Note:** ${clip.note}`;
      }
    } else if (clip.type === 'link') {
      type = 'bookmark';
      content = clip.content || clip.title;
    } else if (clip.content && clip.content.length > 500) {
      type = 'article';
      content = clip.content;
    } else {
      content = clip.content || clip.selectedText || clip.title;
    }

    // Add source attribution
    content += `\n\n---\nClipped from: [${clip.title}](${clip.url})`;

    return {
      sourceProvider: 'browser_extension',
      sourceId: this.generateClipId(clip),
      sourceUrl: clip.url,
      type,
      title: clip.title,
      content,
      summary: clip.metadata?.description,
      metadata: {
        timestamp: new Date(clip.timestamp),
        author: clip.metadata?.author,
        tags: clip.tags,
        custom: {
          browser: clip.source,
          clipType: clip.type,
          siteName: clip.metadata?.siteName,
          publishedDate: clip.metadata?.publishedDate,
          imageUrl: clip.metadata?.imageUrl,
          originalUrl: clip.url,
          hasSelection: !!clip.selectedText,
          hasNote: !!clip.note,
        },
      },
      processingHints: {
        extractMemories: type === 'highlight' || !!clip.note,
        extractTasks: clip.note?.toLowerCase().includes('todo') ||
                      clip.note?.toLowerCase().includes('action'),
      },
    };
  }

  /**
   * Generate a unique ID for a clip based on URL and content
   */
  private generateClipId(clip: WebClip): string {
    const content = clip.selectedText || clip.content || clip.url;
    const hash = this.generateClipContentHash(content + clip.timestamp);
    return `clip_${hash}`;
  }

  /**
   * Generate content hash
   */
  private generateClipContentHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Process multiple clips in batch
   */
  processClips(clips: WebClip[]): StandardIngestItem[] {
    return clips.map((clip) => this.processClip(clip));
  }
}

// Create and register the integration
const browserExtensionIntegration = new BrowserExtensionIntegration();
integrationRegistry.register(browserExtensionIntegration);

export default browserExtensionIntegration;
