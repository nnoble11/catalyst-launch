import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import { buildUserContext } from '@/services/context/engine';
import { generateStructuredOutput } from '@/lib/ai/openai';
import { buildContextualPrompt } from '@/lib/ai/prompts/system';
import type { Stage } from '@/config/constants';

interface SuggestedTask {
  title: string;
  description: string;
  estimatedTime: string;
  priority: 'high' | 'medium' | 'low';
  relatedMilestone?: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { projectId, count = 5 } = body;

    const context = await buildUserContext(user.id, projectId);
    const stage = (context.currentProject?.stage || 'ideation') as Stage;

    const systemPrompt = buildContextualPrompt({
      stage,
      projectName: context.currentProject?.name || 'General',
      description: context.currentProject?.description || undefined,
      milestones: context.projectMilestones.map((m) => ({
        title: m.title,
        isCompleted: m.isCompleted,
      })),
    });

    const pendingMilestones = context.projectMilestones.filter((m) => !m.isCompleted);

    const userPrompt = `Based on the current project context, suggest ${count} actionable tasks for today.

Pending milestones:
${pendingMilestones.map((m) => `- ${m.title}`).join('\n') || 'None'}

Recent patterns:
${context.patterns.map((p) => `- ${p.type}: ${p.description}`).join('\n') || 'No patterns'}

Return as JSON with key "tasks" containing an array of objects with: title, description, estimatedTime (e.g., "30 min", "1 hour"), priority ("high"/"medium"/"low"), and optionally relatedMilestone.

Focus on practical, achievable tasks that move the startup forward.`;

    const response = await generateStructuredOutput<{ tasks: SuggestedTask[] }>(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {}
    );

    return NextResponse.json({ success: true, data: response.tasks });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('POST /api/ai/suggest-tasks error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to suggest tasks' },
      { status: 500 }
    );
  }
}
