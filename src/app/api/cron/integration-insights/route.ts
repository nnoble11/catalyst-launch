import { NextRequest, NextResponse } from 'next/server';
import {
  getUsersWithActiveProjects,
  getIngestedItemsByUserId,
  createIntegrationInsight,
  getLatestIntegrationInsight,
} from '@/lib/db/queries';
import { generateStructuredOutput } from '@/lib/ai/openai';

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured');
    return process.env.NODE_ENV === 'development';
  }

  return authHeader === `Bearer ${cronSecret}`;
}

interface InsightOutput {
  summary: string;
  insights: string[];
  recommendations: string[];
  nextSteps: string[];
}

function buildInsightPrompt(items: Array<{ provider: string; title?: string | null; content?: string | null }>) {
  const providerCounts = items.reduce((acc, item) => {
    acc[item.provider] = (acc[item.provider] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const itemLines = items.map((item) => {
    const title = item.title ? `Title: ${item.title}` : 'Title: (none)';
    const content = item.content ? item.content.slice(0, 300) : '';
    return `Provider: ${item.provider}\n${title}\nContent: ${content}`;
  }).join('\n\n');

  return {
    summary: `Provider counts: ${Object.entries(providerCounts)
      .map(([provider, count]) => `${provider}=${count}`)
      .join(', ')}`,
    items: itemLines,
  };
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const users = await getUsersWithActiveProjects();
    const results = {
      processed: 0,
      generated: 0,
      skipped: 0,
      errors: 0,
    };

    for (const user of users) {
      for (const project of user.projects || []) {
        results.processed++;
        try {
          const latest = await getLatestIntegrationInsight(user.id, project.id);
          if (latest && latest.generatedAt && Date.now() - new Date(latest.generatedAt).getTime() < 12 * 60 * 60 * 1000) {
            results.skipped++;
            continue;
          }

          const ingestedItems = await getIngestedItemsByUserId(user.id, {
            status: 'processed',
            since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            limit: 120,
          });

          if (ingestedItems.length < 10) {
            results.skipped++;
            continue;
          }

          const promptData = buildInsightPrompt(ingestedItems);
          const systemPrompt = `You are analyzing a user's integrated data (email, meetings, tasks, docs). Identify patterns, bottlenecks, and opportunities.\nReturn practical insights that can drive next steps.`;
          const userPrompt = `Context:\n${promptData.summary}\n\nItems:\n${promptData.items}\n\nReturn JSON with:\nsummary (string), insights (array), recommendations (array), nextSteps (array).`;

          const response = await generateStructuredOutput<InsightOutput>(
            [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            {
              type: 'object',
              properties: {
                summary: { type: 'string' },
                insights: { type: 'array', items: { type: 'string' } },
                recommendations: { type: 'array', items: { type: 'string' } },
                nextSteps: { type: 'array', items: { type: 'string' } },
              },
            },
            { temperature: 0.2 }
          );

          await createIntegrationInsight({
            userId: user.id,
            projectId: project.id,
            summary: response.summary,
            insights: response.insights,
            recommendations: response.recommendations,
            nextSteps: response.nextSteps,
            windowDays: 7,
          });

          results.generated++;
        } catch (error) {
          results.errors++;
          console.error(`Integration insight error for user ${user.id}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...results,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('GET /api/cron/integration-insights error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run integration insights cron' },
      { status: 500 }
    );
  }
}
