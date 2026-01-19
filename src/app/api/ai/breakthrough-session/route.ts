import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import { analyzeStuckState } from '@/services/ai/stuck-detector';
import { generateSmartSuggestions } from '@/services/ai/suggestion-generator';
import { generateStructuredOutput } from '@/lib/ai/openai';
import type { BreakthroughSession } from '@/types';

interface BreakthroughSessionResponse {
  session: BreakthroughSession;
  suggestedTasks: {
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }[];
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { projectId } = body;

    // Analyze the stuck state
    const stuckAnalysis = await analyzeStuckState(user.id, projectId);

    // Generate breakthrough session content
    const systemPrompt = `You are a supportive startup coach conducting a breakthrough session.
The founder appears to be stuck and needs help getting back on track.
Be empathetic, encouraging, and practical.`;

    const userPrompt = `The founder is experiencing these challenges:
${stuckAnalysis.indicators.map((i) => `- ${i.type}: ${i.description}`).join('\n')}

Overall severity: ${stuckAnalysis.overallSeverity}

Generate a breakthrough session that includes:
1. 3-5 reflective questions to help them identify blockers
2. 2-3 practical exercises they can do right now (with estimated duration)
3. 3 relevant resources or next steps

Return as JSON with:
- questions: array of question strings
- exercises: array of {title, description, duration}
- resources: array of resource description strings`;

    const sessionContent = await generateStructuredOutput<{
      questions: string[];
      exercises: { title: string; description: string; duration: string }[];
      resources: string[];
    }>(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        type: 'object',
        properties: {
          questions: { type: 'array', items: { type: 'string' } },
          exercises: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                duration: { type: 'string' },
              },
            },
          },
          resources: { type: 'array', items: { type: 'string' } },
        },
      }
    );

    // Get suggested tasks
    const suggestions = await generateSmartSuggestions(user.id, projectId, 3);

    const session: BreakthroughSession = {
      projectId: projectId || '',
      stuckIndicators: stuckAnalysis.indicators,
      questions: sessionContent.questions,
      exercises: sessionContent.exercises,
      resources: sessionContent.resources,
    };

    const response: BreakthroughSessionResponse = {
      session,
      suggestedTasks: suggestions.tasks.map((t) => ({
        title: t.title,
        description: t.description,
        priority: t.priority,
      })),
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('POST /api/ai/breakthrough-session error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate breakthrough session' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || undefined;

    // Quick stuck analysis
    const stuckAnalysis = await analyzeStuckState(user.id, projectId);

    return NextResponse.json({
      success: true,
      data: {
        isStuck: stuckAnalysis.isStuck,
        severity: stuckAnalysis.overallSeverity,
        encouragement: stuckAnalysis.encouragement,
        nextSteps: stuckAnalysis.nextSteps,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET /api/ai/breakthrough-session error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check stuck status' },
      { status: 500 }
    );
  }
}
