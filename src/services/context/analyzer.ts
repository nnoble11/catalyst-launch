import { generateStructuredOutput } from '@/lib/ai/openai';
import { buildContextualPrompt } from '@/lib/ai/prompts/system';
import type { UserContext } from '@/types';
import type { Stage } from '@/config/constants';

interface TaskSuggestion {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'milestone' | 'research' | 'action' | 'reflection';
}

interface ContextAnalysis {
  summary: string;
  insights: string[];
  suggestedTasks: TaskSuggestion[];
  nextSteps: string[];
}

export async function analyzeContext(context: UserContext): Promise<ContextAnalysis> {
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

  const userPrompt = `Based on the following context, provide an analysis:

Recent Activity Summary:
${context.recentActivity.length} activities in the past 7 days
Activity types: ${[...new Set(context.recentActivity.map((a) => a.type))].join(', ') || 'None'}

Milestone Progress:
${context.projectMilestones.filter((m) => m.isCompleted).length}/${context.projectMilestones.length} completed

Detected Patterns:
${context.patterns.map((p) => `- ${p.type}: ${p.description}`).join('\n') || 'No patterns detected'}

Please provide:
1. A brief summary of the current situation
2. Key insights based on the patterns
3. Suggested tasks with priorities
4. Recommended next steps

Return as JSON with keys: summary, insights (array), suggestedTasks (array with title, description, priority, category), nextSteps (array)`;

  const analysis = await generateStructuredOutput<ContextAnalysis>(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        insights: { type: 'array', items: { type: 'string' } },
        suggestedTasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              priority: { type: 'string', enum: ['high', 'medium', 'low'] },
              category: {
                type: 'string',
                enum: ['milestone', 'research', 'action', 'reflection'],
              },
            },
          },
        },
        nextSteps: { type: 'array', items: { type: 'string' } },
      },
    }
  );

  return analysis;
}

interface DailyCheckInResponse {
  greeting: string;
  reflection: string;
  todaysFocus: string[];
  motivationalNote: string;
}

export async function generateDailyCheckIn(
  context: UserContext
): Promise<DailyCheckInResponse> {
  const stage = (context.currentProject?.stage || 'ideation') as Stage;

  const systemPrompt = `You are conducting a daily check-in with a startup founder working on "${context.currentProject?.name || 'their startup'}".

Current stage: ${stage}
Milestones completed: ${context.projectMilestones.filter((m) => m.isCompleted).length}/${context.projectMilestones.length}
Recent activity: ${context.recentActivity.length} actions in the past week

Provide an encouraging but actionable check-in.`;

  const response = await generateStructuredOutput<DailyCheckInResponse>(
    [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content:
          'Generate a daily check-in as JSON with keys: greeting, reflection (about recent progress), todaysFocus (array of 2-3 priorities), motivationalNote',
      },
    ],
    {}
  );

  return response;
}
