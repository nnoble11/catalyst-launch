/**
 * Milestone Detection Engine
 *
 * Analyzes ingested content (captures, meetings, messages, etc.) to automatically
 * detect milestone signals and create milestones.
 *
 * Detection methods:
 * 1. Keyword pattern matching
 * 2. Context analysis (optional AI-powered)
 * 3. Metric thresholds (from traction data)
 */

import type { ProgressMilestoneType, MilestoneEvidence } from '@/types';
import {
  getRecentCaptures,
  getProgressMilestonesByProject,
  createProgressMilestone,
  getLatestTractionMetrics,
} from '@/lib/db/queries';

export interface MilestoneSignal {
  type: ProgressMilestoneType;
  confidence: number; // 0-1 scale
  evidence: MilestoneEvidence;
  source: {
    type: 'capture' | 'meeting' | 'message' | 'metric' | 'manual';
    id?: string;
    content?: string;
  };
}

export interface DetectionResult {
  signals: MilestoneSignal[];
  milestonesCreated: ProgressMilestoneType[];
}

// Keyword patterns for each milestone type
const MILESTONE_PATTERNS: Record<ProgressMilestoneType, {
  keywords: string[];
  phrases: string[];
  negativeKeywords?: string[];
}> = {
  first_customer: {
    keywords: ['customer', 'paying', 'first sale', 'signed up', 'converted'],
    phrases: [
      'got our first customer',
      'first paying customer',
      'someone paid',
      'first sale',
      'closed first deal',
      'first user converted',
    ],
    negativeKeywords: ['lost', 'churned', 'cancelled'],
  },
  ten_customers: {
    keywords: ['10 customers', 'ten customers', 'double digit'],
    phrases: [
      'hit 10 customers',
      'reached 10 customers',
      'now have 10',
      '10 paying customers',
    ],
  },
  hundred_customers: {
    keywords: ['100 customers', 'hundred customers', 'triple digit'],
    phrases: [
      'hit 100 customers',
      'reached 100',
      '100 paying customers',
      'crossed 100',
    ],
  },
  first_revenue: {
    keywords: ['revenue', 'money', 'income', 'paid', 'payment'],
    phrases: [
      'first revenue',
      'making money',
      'first payment',
      'got paid',
      'revenue coming in',
    ],
  },
  mrr_1k: {
    keywords: ['$1k', '1k mrr', '$1000', '1000 mrr'],
    phrases: [
      'hit $1k mrr',
      'reached $1,000',
      '$1k in recurring',
      '1k monthly recurring',
    ],
  },
  mrr_10k: {
    keywords: ['$10k', '10k mrr', '$10000', '10000 mrr'],
    phrases: [
      'hit $10k mrr',
      'reached $10,000',
      '$10k in recurring',
      '10k monthly recurring',
    ],
  },
  mrr_100k: {
    keywords: ['$100k', '100k mrr', '$100000', '100000 mrr'],
    phrases: [
      'hit $100k mrr',
      'reached $100,000',
      '$100k in recurring',
      '100k monthly recurring',
    ],
  },
  first_investor_meeting: {
    keywords: ['investor', 'vc', 'angel', 'pitch', 'fundraising'],
    phrases: [
      'met with investor',
      'investor meeting',
      'pitched to',
      'vc meeting',
      'angel meeting',
      'first pitch',
      'investor call',
    ],
  },
  term_sheet: {
    keywords: ['term sheet', 'offer', 'valuation'],
    phrases: [
      'got a term sheet',
      'received term sheet',
      'term sheet signed',
      'signed term sheet',
      'valuation of',
    ],
  },
  funding_closed: {
    keywords: ['closed', 'funded', 'raised', 'round'],
    phrases: [
      'closed the round',
      'funding closed',
      'raised our',
      'money in the bank',
      'round closed',
      'wire hit',
    ],
  },
  mvp_launched: {
    keywords: ['launched', 'live', 'shipped', 'released', 'mvp'],
    phrases: [
      'mvp is live',
      'launched our mvp',
      'shipped the mvp',
      'product is live',
      'went live',
      'first version launched',
    ],
  },
  product_hunt_launch: {
    keywords: ['product hunt', 'ph launch', 'producthunt'],
    phrases: [
      'launched on product hunt',
      'product hunt launch',
      'ph launch day',
      'we\'re on product hunt',
      'product of the day',
    ],
  },
  first_employee: {
    keywords: ['hired', 'employee', 'team member', 'joined'],
    phrases: [
      'first hire',
      'hired our first',
      'first employee',
      'someone joined',
      'new team member',
      'first full-time',
    ],
    negativeKeywords: ['fired', 'left', 'quit'],
  },
  yc_interview: {
    keywords: ['yc', 'y combinator', 'ycombinator'],
    phrases: [
      'yc interview',
      'got the yc interview',
      'y combinator interview',
      'interviewing at yc',
      'yc call',
    ],
  },
  demo_day: {
    keywords: ['demo day', 'pitch day', 'investor day'],
    phrases: [
      'demo day',
      'presented at demo day',
      'demo day pitch',
      'graduated from',
    ],
  },
  first_partnership: {
    keywords: ['partnership', 'partner', 'integration', 'collaboration'],
    phrases: [
      'signed a partnership',
      'first partner',
      'partnership deal',
      'partnered with',
      'integration with',
    ],
  },
  custom: {
    keywords: [],
    phrases: [],
  },
};

// Confidence thresholds
const CONFIDENCE_THRESHOLD = 0.6; // Minimum confidence to suggest
const AUTO_CREATE_THRESHOLD = 0.85; // Minimum confidence to auto-create

export class MilestoneDetectionEngine {
  /**
   * Analyze content for milestone signals
   */
  analyzeContent(content: string, sourceType: MilestoneSignal['source']['type'] = 'capture', sourceId?: string): MilestoneSignal[] {
    const signals: MilestoneSignal[] = [];
    const normalizedContent = content.toLowerCase();

    for (const [milestoneType, patterns] of Object.entries(MILESTONE_PATTERNS)) {
      if (milestoneType === 'custom') continue;

      let confidence = 0;
      const matchedPhrases: string[] = [];
      const matchedKeywords: string[] = [];

      // Check for exact phrase matches (high confidence)
      for (const phrase of patterns.phrases) {
        if (normalizedContent.includes(phrase.toLowerCase())) {
          confidence += 0.4;
          matchedPhrases.push(phrase);
        }
      }

      // Check for keyword matches (medium confidence)
      for (const keyword of patterns.keywords) {
        if (normalizedContent.includes(keyword.toLowerCase())) {
          confidence += 0.15;
          matchedKeywords.push(keyword);
        }
      }

      // Check for negative keywords (reduce confidence)
      if (patterns.negativeKeywords) {
        for (const negKeyword of patterns.negativeKeywords) {
          if (normalizedContent.includes(negKeyword.toLowerCase())) {
            confidence -= 0.3;
          }
        }
      }

      // Cap confidence at 1.0
      confidence = Math.min(1, Math.max(0, confidence));

      if (confidence >= CONFIDENCE_THRESHOLD) {
        signals.push({
          type: milestoneType as ProgressMilestoneType,
          confidence,
          evidence: {
            notes: `Detected from content. Matched: ${[...matchedPhrases, ...matchedKeywords].join(', ')}`,
          },
          source: {
            type: sourceType,
            id: sourceId,
            content: content.substring(0, 500), // First 500 chars for context
          },
        });
      }
    }

    return signals.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Scan recent captures for milestone signals
   */
  async scanRecentCaptures(projectId: string, daysBack: number = 7): Promise<MilestoneSignal[]> {
    const allSignals: MilestoneSignal[] = [];

    try {
      const captures = await getRecentCaptures(projectId, daysBack);

      for (const capture of captures) {
        const content = capture.content || '';
        const signals = this.analyzeContent(content, 'capture', capture.id);
        allSignals.push(...signals);
      }
    } catch (error) {
      console.error('Error scanning captures:', error);
    }

    return allSignals;
  }

  /**
   * Check metrics-based milestones
   */
  async checkMetricMilestones(projectId: string): Promise<MilestoneSignal[]> {
    const signals: MilestoneSignal[] = [];

    try {
      const metrics = await getLatestTractionMetrics(projectId);

      if (!metrics) return signals;

      // Customer milestones
      if (metrics.customers !== null) {
        if (metrics.customers >= 1) {
          signals.push({
            type: 'first_customer',
            confidence: 1.0,
            evidence: {
              metric: 'customers',
              value: metrics.customers,
              notes: 'Detected from traction metrics',
            },
            source: { type: 'metric', id: metrics.id },
          });
        }
        if (metrics.customers >= 10) {
          signals.push({
            type: 'ten_customers',
            confidence: 1.0,
            evidence: {
              metric: 'customers',
              value: metrics.customers,
              notes: 'Detected from traction metrics',
            },
            source: { type: 'metric', id: metrics.id },
          });
        }
        if (metrics.customers >= 100) {
          signals.push({
            type: 'hundred_customers',
            confidence: 1.0,
            evidence: {
              metric: 'customers',
              value: metrics.customers,
              notes: 'Detected from traction metrics',
            },
            source: { type: 'metric', id: metrics.id },
          });
        }
      }

      // Revenue milestones
      if (metrics.revenueCents !== null && metrics.revenueCents > 0) {
        signals.push({
          type: 'first_revenue',
          confidence: 1.0,
          evidence: {
            metric: 'revenue',
            value: metrics.revenueCents / 100,
            notes: 'Detected from traction metrics',
          },
          source: { type: 'metric', id: metrics.id },
        });
      }

      // MRR milestones
      if (metrics.mrrCents !== null) {
        if (metrics.mrrCents >= 100000) {
          signals.push({
            type: 'mrr_1k',
            confidence: 1.0,
            evidence: {
              metric: 'mrr',
              value: metrics.mrrCents / 100,
              notes: 'Detected from traction metrics',
            },
            source: { type: 'metric', id: metrics.id },
          });
        }
        if (metrics.mrrCents >= 1000000) {
          signals.push({
            type: 'mrr_10k',
            confidence: 1.0,
            evidence: {
              metric: 'mrr',
              value: metrics.mrrCents / 100,
              notes: 'Detected from traction metrics',
            },
            source: { type: 'metric', id: metrics.id },
          });
        }
        if (metrics.mrrCents >= 10000000) {
          signals.push({
            type: 'mrr_100k',
            confidence: 1.0,
            evidence: {
              metric: 'mrr',
              value: metrics.mrrCents / 100,
              notes: 'Detected from traction metrics',
            },
            source: { type: 'metric', id: metrics.id },
          });
        }
      }
    } catch (error) {
      console.error('Error checking metric milestones:', error);
    }

    return signals;
  }

  /**
   * Run full detection and optionally create milestones
   */
  async detectAndCreateMilestones(
    projectId: string,
    options: {
      autoCreate?: boolean;
      daysBack?: number;
      includeMetrics?: boolean;
    } = {}
  ): Promise<DetectionResult> {
    const { autoCreate = false, daysBack = 7, includeMetrics = true } = options;

    // Gather all signals
    const contentSignals = await this.scanRecentCaptures(projectId, daysBack);
    const metricSignals = includeMetrics ? await this.checkMetricMilestones(projectId) : [];

    const allSignals = [...contentSignals, ...metricSignals];

    // Deduplicate by milestone type (keep highest confidence)
    const signalMap = new Map<ProgressMilestoneType, MilestoneSignal>();
    for (const signal of allSignals) {
      const existing = signalMap.get(signal.type);
      if (!existing || existing.confidence < signal.confidence) {
        signalMap.set(signal.type, signal);
      }
    }

    const deduplicatedSignals = Array.from(signalMap.values());

    // Get existing milestones to avoid duplicates
    const existingMilestones = await getProgressMilestonesByProject(projectId);
    const existingTypes = new Set(existingMilestones.map((m) => m.milestoneType));

    // Filter out already achieved milestones
    const newSignals = deduplicatedSignals.filter(
      (signal) => !existingTypes.has(signal.type)
    );

    const milestonesCreated: ProgressMilestoneType[] = [];

    // Auto-create high-confidence milestones
    if (autoCreate) {
      for (const signal of newSignals) {
        if (signal.confidence >= AUTO_CREATE_THRESHOLD) {
          try {
            await createProgressMilestone({
              projectId,
              milestoneType: signal.type,
              evidence: {
                ...signal.evidence,
                notes: `${signal.evidence.notes || ''} (Auto-detected with ${Math.round(signal.confidence * 100)}% confidence)`,
              },
              visibility: 'cohort',
            });
            milestonesCreated.push(signal.type);
          } catch (error) {
            console.error(`Failed to create milestone ${signal.type}:`, error);
          }
        }
      }
    }

    return {
      signals: newSignals,
      milestonesCreated,
    };
  }

  /**
   * Analyze a single piece of content and optionally create milestone
   */
  async processContent(
    projectId: string,
    content: string,
    sourceType: MilestoneSignal['source']['type'],
    sourceId?: string,
    autoCreate: boolean = false
  ): Promise<DetectionResult> {
    const signals = this.analyzeContent(content, sourceType, sourceId);

    // Get existing milestones
    const existingMilestones = await getProgressMilestonesByProject(projectId);
    const existingTypes = new Set(existingMilestones.map((m) => m.milestoneType));

    // Filter out already achieved
    const newSignals = signals.filter((s) => !existingTypes.has(s.type));

    const milestonesCreated: ProgressMilestoneType[] = [];

    if (autoCreate) {
      for (const signal of newSignals) {
        if (signal.confidence >= AUTO_CREATE_THRESHOLD) {
          try {
            await createProgressMilestone({
              projectId,
              milestoneType: signal.type,
              evidence: signal.evidence,
              visibility: 'cohort',
            });
            milestonesCreated.push(signal.type);
          } catch (error) {
            console.error(`Failed to create milestone ${signal.type}:`, error);
          }
        }
      }
    }

    return { signals: newSignals, milestonesCreated };
  }
}

// Export singleton instance
export const milestoneDetectionEngine = new MilestoneDetectionEngine();

export default milestoneDetectionEngine;
