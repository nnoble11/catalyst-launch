import type { IngestItemType } from '@/types/integrations';
import {
  getIngestedItemsByUserId,
  searchIngestedItemsByUserId,
  searchIngestedEmbeddings,
} from '@/lib/db/queries';
import { generateEmbedding } from '@/services/ai/embeddings';

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from',
  'has', 'have', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'me',
  'my', 'not', 'of', 'on', 'or', 'our', 'so', 'that', 'the', 'their',
  'then', 'there', 'they', 'this', 'to', 'up', 'us', 'we', 'what', 'when',
  'where', 'which', 'who', 'why', 'will', 'with', 'you', 'your',
]);

const ITEM_TYPE_WEIGHTS: Partial<Record<IngestItemType, number>> = {
  email: 0.35,
  meeting: 0.3,
  task: 0.3,
  issue: 0.25,
  message: 0.2,
  document: 0.2,
  note: 0.15,
  highlight: 0.1,
  article: 0.1,
  comment: 0.1,
  bookmark: 0.05,
  clip: 0.05,
};

export interface IntegrationContextItem {
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
}

export function extractSearchTerms(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  maxTerms = 8,
  extraText: string[] = []
): string[] {
  const recentUserMessages = messages
    .filter((m) => m.role === 'user')
    .slice(-2)
    .map((m) => m.content)
    .join(' ');

  const combinedText = [recentUserMessages, ...extraText].join(' ');

  const tokens = combinedText
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, ' ')
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));

  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, maxTerms)
    .map(([token]) => token);
}

export function extractTermsFromQuery(query: string, maxTerms = 8): string[] {
  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, ' ')
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));

  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, maxTerms)
    .map(([token]) => token);
}

function scoreItem(
  item: { title?: string | null; content?: string | null; itemType?: string | null; createdAt?: Date | null },
  terms: string[],
  now: Date
): number {
  const createdAt = item.createdAt ? new Date(item.createdAt) : now;
  const ageDays = Math.max(0, (now.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000));
  const recencyScore = Math.exp(-ageDays / 10);

  const titleText = (item.title ?? '').toLowerCase();
  const contentText = (item.content ?? '').toLowerCase();
  const termMatches = terms.reduce((acc, term) => {
    const inTitle = titleText.includes(term) ? 1 : 0;
    const inContent = contentText.includes(term) ? 1 : 0;
    return acc + (inTitle * 2 + inContent);
  }, 0);
  const termScore = termMatches * 0.35;

  const typeBoost = item.itemType ? (ITEM_TYPE_WEIGHTS[item.itemType as IngestItemType] ?? 0) : 0;

  return recencyScore + termScore + typeBoost;
}

function selectDiverseItems<T extends { provider: string }>(
  items: T[],
  options: { maxItems: number; maxPerProvider: number }
): T[] {
  const byProvider = items.reduce((acc, item) => {
    const key = item.provider;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);

  const selected: T[] = [];
  for (const providerItems of Object.values(byProvider)) {
    selected.push(providerItems[0]);
  }

  const remaining = items.filter((item) => !selected.includes(item));
  const providerCounts = selected.reduce((acc, item) => {
    acc[item.provider] = (acc[item.provider] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  for (const item of remaining) {
    if (selected.length >= options.maxItems) break;
    const count = providerCounts[item.provider] ?? 0;
    if (count >= options.maxPerProvider) continue;
    providerCounts[item.provider] = count + 1;
    selected.push(item);
  }

  return selected.slice(0, options.maxItems);
}

type IngestedItemBase = {
  id: string;
  provider: string;
  title?: string | null;
  content?: string | null;
  itemType: string;
  sourceUrl?: string | null;
  metadata?: unknown;
  createdAt?: Date | null;
};

function normalizeIngestedItem(item: IngestedItemBase): IngestedItemBase {
  return {
    id: item.id,
    provider: item.provider,
    title: item.title ?? null,
    content: item.content ?? null,
    itemType: item.itemType,
    sourceUrl: item.sourceUrl ?? null,
    metadata: item.metadata,
    createdAt: item.createdAt ?? null,
  };
}

export async function buildIntegrationContext(
  userId: string,
  options: {
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
    projectName?: string;
    projectDescription?: string;
    status?: 'pending' | 'processed' | 'skipped' | 'failed';
    recentLimit?: number;
    searchLimit?: number;
    maxItems?: number;
    recentDays?: number;
    maxPerProvider?: number;
  }
): Promise<{ items: IntegrationContextItem[]; summary?: string; highlights?: string[] }> {
  const now = new Date();
  const terms = extractSearchTerms(options.messages, 10, [
    options.projectName ?? '',
    options.projectDescription ?? '',
  ]);
  const since = options.recentDays
    ? new Date(now.getTime() - options.recentDays * 24 * 60 * 60 * 1000)
    : undefined;

  const [recentItems, searchItems] = await Promise.all([
    getIngestedItemsByUserId(userId, {
      status: options.status ?? 'processed',
      limit: options.recentLimit ?? 60,
      since,
    }),
    terms.length > 0
      ? searchIngestedItemsByUserId(userId, {
          terms,
          status: options.status ?? 'processed',
          limit: options.searchLimit ?? 60,
          since,
        })
      : Promise.resolve([]),
  ]);

  const uniqueItems = new Map<string, IngestedItemBase>();
  for (const item of recentItems) {
    uniqueItems.set(item.id, normalizeIngestedItem(item));
  }
  for (const item of searchItems) {
    if (!uniqueItems.has(item.id)) {
      uniqueItems.set(item.id, normalizeIngestedItem(item));
    }
  }

  const scoredItems = [...uniqueItems.values()]
    .map((item) => ({
      item,
      score: scoreItem(item, terms, now),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);

  const diversifiedItems = selectDiverseItems(scoredItems, {
    maxItems: options.maxItems ?? 50,
    maxPerProvider: options.maxPerProvider ?? 10,
  });

  const summary = buildIntegrationSummary(diversifiedItems, now);
  const highlights = buildIntegrationHighlights(diversifiedItems);

  return {
    items: diversifiedItems.map((item) => ({
      provider: item.provider,
      title: item.title || undefined,
      content: item.content || undefined,
      itemType: item.itemType,
      sourceUrl: item.sourceUrl || undefined,
      createdAt: item.createdAt ?? undefined,
      metadata: item.metadata as IntegrationContextItem['metadata'],
    })),
    summary,
    highlights,
  };
}

export function buildIntegrationSummary(
  items: Array<{ provider: string; createdAt?: Date | null }>,
  now: Date = new Date(),
  recentDays = 7
): string | undefined {
  const cutoff = new Date(now.getTime() - recentDays * 24 * 60 * 60 * 1000);
  const recentItems = items.filter((item) => (item.createdAt ? new Date(item.createdAt) : now) >= cutoff);

  if (recentItems.length === 0) {
    return undefined;
  }

  const counts = recentItems.reduce((acc, item) => {
    const key = item.provider.replace('_', ' ');
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topProviders = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([provider, count]) => `${provider} (${count})`)
    .join(', ');

  return `Recent ingested data (${recentItems.length} items): ${topProviders}`;
}

export function buildIntegrationHighlights(
  items: Array<{ provider: string; title?: string | null; createdAt?: Date | null }>
): string[] {
  return items
    .filter((item) => item.title)
    .slice(0, 5)
    .map((item) => {
      const provider = item.provider.replace('_', ' ');
      const date = item.createdAt
        ? new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : undefined;
      return `${provider}: ${item.title}${date ? ` (${date})` : ''}`;
    });
}

export async function fetchAdditionalIntegrationData(
  userId: string,
  options: {
    query: string;
    provider?: string;
    itemTypes?: string[];
    sinceDays?: number;
    limit?: number;
  }
): Promise<{ items: IntegrationContextItem[]; summary?: string; highlights?: string[] }> {
  const now = new Date();
  const since = options.sinceDays
    ? new Date(now.getTime() - options.sinceDays * 24 * 60 * 60 * 1000)
    : undefined;

  const queryText = options.query.trim();
  const embedding = queryText ? await generateEmbedding(queryText) : [];

  let semanticItems: Array<{
    id: string;
    provider: string;
    title?: string | null;
    content?: string | null;
    itemType: string;
    sourceUrl?: string | null;
    createdAt?: Date | null;
    metadata?: unknown;
  }> = [];

  if (embedding.length > 0) {
    semanticItems = await searchIngestedEmbeddings(userId, {
      embedding,
      provider: options.provider,
      itemTypes: options.itemTypes,
      since,
      limit: options.limit ?? 25,
    });
  }

  const keywordTerms = extractTermsFromQuery(queryText, 8);
  const keywordItems = keywordTerms.length > 0
    ? await searchIngestedItemsByUserId(userId, {
        terms: keywordTerms,
        status: 'processed',
        since,
        limit: options.limit ?? 25,
      })
    : [];

  const filteredKeywordItems = keywordItems.filter((item) => {
    if (options.provider && item.provider !== options.provider) {
      return false;
    }
    if (options.itemTypes && options.itemTypes.length > 0 && !options.itemTypes.includes(item.itemType)) {
      return false;
    }
    return true;
  });

  const uniqueItems = new Map<string, (typeof semanticItems)[number]>();
  for (const item of semanticItems) {
    uniqueItems.set(item.id, item);
  }
  for (const item of filteredKeywordItems) {
    if (!uniqueItems.has(item.id)) {
      uniqueItems.set(item.id, item);
    }
  }

  const mergedItems = [...uniqueItems.values()]
    .slice(0, options.limit ?? 30);

  const summary = buildIntegrationSummary(mergedItems, now);
  const highlights = buildIntegrationHighlights(mergedItems);

  return {
    items: mergedItems.map((item) => ({
      provider: item.provider,
      title: item.title ?? undefined,
      content: item.content ?? undefined,
      itemType: item.itemType,
      sourceUrl: item.sourceUrl ?? undefined,
      createdAt: item.createdAt ?? undefined,
      metadata: item.metadata as IntegrationContextItem['metadata'],
    })),
    summary,
    highlights,
  };
}
