import { generateStructuredOutput } from '@/lib/ai/openai';
import { buildUserContext } from '@/services/context/engine';
import { getAiMemories, createTask, getTasksByUserId } from '@/lib/db/queries';
import type { UserContext, CoachSuggestion } from '@/types';
import type { Stage } from '@/config/constants';
import { v4 as uuidv4 } from 'uuid';

interface SuggestedTask {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'milestone' | 'research' | 'action' | 'reflection';
  rationale: string;
}

interface SuggestionResponse {
  tasks: SuggestedTask[];
  insights: string[];
  focusArea: string;
}

// Stage-specific task templates
const STAGE_TASK_TEMPLATES: Record<Stage, string[]> = {
  ideation: [
    'Conduct 3 customer discovery interviews',
    'Document your problem hypothesis',
    'Create a simple landing page to test interest',
    'Research 5 potential competitors',
    'Define your target customer persona',
    'Write your value proposition statement',
    'Identify 3 key assumptions to validate',
  ],
  mvp: [
    'Define the core feature set for MVP',
    'Create user flow diagrams',
    'Set up basic project infrastructure',
    'Build the first key feature',
    'Get feedback from 5 potential users',
    'Document technical architecture decisions',
    'Create a simple demo or prototype',
  ],
  gtm: [
    'Define your pricing strategy',
    'Create a marketing content calendar',
    'Set up analytics and tracking',
    'Identify your first 10 target customers',
    'Write launch announcement copy',
    'Prepare customer onboarding materials',
    'Plan your launch timeline',
  ],
};

export async function generateSmartSuggestions(
  userId: string,
  projectId?: string,
  count = 5
): Promise<SuggestionResponse> {
  const context = await buildUserContext(userId, projectId);
  const existingTasks = await getTasksByUserId(userId, projectId);
  const memories = projectId ? await getAiMemories(userId, projectId) : [];

  // Get existing task titles to avoid duplicates
  const existingTaskTitles = existingTasks.map((t) => t.title.toLowerCase());

  const stage = (context.currentProject?.stage || 'ideation') as Stage;

  const systemPrompt = `You are an AI startup coach generating personalized task suggestions.
The founder is working on "${context.currentProject?.name || 'their startup'}" in the ${stage} stage.

Project description: ${context.currentProject?.description || 'Not provided'}
Problem statement: ${context.currentProject?.metadata?.problemStatement || 'Not defined'}
Target audience: ${context.currentProject?.metadata?.targetAudience || 'Not defined'}

Key memories about this founder:
${memories.map((m) => `- ${m.key}: ${m.value}`).join('\n') || 'No specific memories yet'}

Existing tasks (avoid duplicates):
${existingTaskTitles.slice(0, 10).join(', ') || 'No existing tasks'}

Stage-appropriate task ideas:
${STAGE_TASK_TEMPLATES[stage].join('\n')}

Generate tasks that are:
1. Specific and actionable (can be completed in 1-2 hours)
2. Relevant to current project stage
3. Not duplicates of existing tasks
4. Progressive (building on each other)`;

  const userPrompt = `Based on the context, generate ${count} task suggestions.

Current milestone progress: ${context.projectMilestones.filter((m) => m.isCompleted).length}/${context.projectMilestones.length}
Pending milestones: ${context.projectMilestones
    .filter((m) => !m.isCompleted)
    .map((m) => m.title)
    .join(', ') || 'None'}

Recent activity patterns:
${context.patterns.map((p) => `- ${p.type}: ${p.description}`).join('\n') || 'No patterns detected'}

Return as JSON with:
- tasks: array of {title, description, priority (high/medium/low), category (milestone/research/action/reflection), rationale}
- insights: array of 2-3 observations about their progress
- focusArea: the main area they should focus on`;

  try {
    const response = await generateStructuredOutput<SuggestionResponse>(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                category: { type: 'string', enum: ['milestone', 'research', 'action', 'reflection'] },
                rationale: { type: 'string' },
              },
            },
          },
          insights: { type: 'array', items: { type: 'string' } },
          focusArea: { type: 'string' },
        },
      }
    );

    return response;
  } catch (error) {
    console.error('Error generating suggestions:', error);
    // Return fallback suggestions based on stage
    return {
      tasks: STAGE_TASK_TEMPLATES[stage].slice(0, count).map((title) => ({
        title,
        description: `Complete this task to progress in the ${stage} stage`,
        priority: 'medium' as const,
        category: 'action' as const,
        rationale: 'Recommended for your current stage',
      })),
      insights: ['Continue making progress on your milestones'],
      focusArea: `Focus on ${stage} stage activities`,
    };
  }
}

export async function createAiSuggestedTasks(
  userId: string,
  projectId?: string,
  count = 3
): Promise<void> {
  const suggestions = await generateSmartSuggestions(userId, projectId, count);

  for (const task of suggestions.tasks) {
    await createTask({
      userId,
      projectId: projectId || undefined,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: 'backlog',
      aiSuggested: true,
      aiRationale: task.rationale,
    });
  }
}

export async function generateCoachSuggestions(
  userId: string,
  projectId?: string
): Promise<CoachSuggestion[]> {
  const context = await buildUserContext(userId, projectId);
  const suggestions: CoachSuggestion[] = [];

  // Check patterns and generate appropriate suggestions
  const hasInactivity = context.patterns.some((p) => p.type === 'inactive');
  const hasStall = context.patterns.some((p) => p.type === 'stall');
  const hasMomentum = context.patterns.some((p) => p.type === 'momentum');
  const nearMilestone = context.patterns.some((p) => p.type === 'milestone_near');

  if (hasInactivity) {
    suggestions.push({
      id: uuidv4(),
      type: 'breakthrough',
      title: 'Schedule a Breakthrough Session',
      description:
        "It looks like you've been away for a bit. Let's have a focused session to get back on track.",
      priority: 'high',
      actionUrl: '/chat?mode=breakthrough',
      dismissed: false,
    });
  }

  if (hasStall) {
    suggestions.push({
      id: uuidv4(),
      type: 'task',
      title: 'Break Down Your Current Milestone',
      description:
        'Your current milestone might be too big. Try breaking it into 3-5 smaller, actionable tasks.',
      priority: 'high',
      actionUrl: '/tasks',
      dismissed: false,
    });
  }

  if (hasMomentum) {
    suggestions.push({
      id: uuidv4(),
      type: 'reflection',
      title: 'Capture Your Progress',
      description:
        "You're making great progress! Take a moment to document what's working well.",
      priority: 'medium',
      actionUrl: '/documents?type=investor-update',
      dismissed: false,
    });
  }

  if (nearMilestone) {
    suggestions.push({
      id: uuidv4(),
      type: 'task',
      title: 'Push to the Finish Line',
      description:
        "You're so close to completing all milestones! Focus on the remaining items to finish strong.",
      priority: 'high',
      actionUrl: '/projects',
      dismissed: false,
    });
  }

  // Always add a general resource suggestion if no other high-priority items
  if (suggestions.filter((s) => s.priority === 'high').length === 0) {
    const stage = (context.currentProject?.stage || 'ideation') as Stage;
    const stageResources: Record<Stage, { title: string; description: string; url: string }> = {
      ideation: {
        title: 'Customer Interview Template',
        description: 'Use this template to conduct effective customer discovery interviews',
        url: '/documents?type=user-persona',
      },
      mvp: {
        title: 'PRD Template',
        description: 'Document your product requirements to guide development',
        url: '/documents?type=prd',
      },
      gtm: {
        title: 'Go-to-Market Plan',
        description: 'Create a comprehensive launch strategy',
        url: '/documents?type=gtm-plan',
      },
    };

    const resource = stageResources[stage];
    suggestions.push({
      id: uuidv4(),
      type: 'resource',
      title: resource.title,
      description: resource.description,
      priority: 'medium',
      actionUrl: resource.url,
      dismissed: false,
    });
  }

  return suggestions;
}

export async function generateDailyTasks(userId: string, projectId?: string): Promise<SuggestedTask[]> {
  const context = await buildUserContext(userId, projectId);
  const existingTasks = await getTasksByUserId(userId, projectId, 'today');

  // If user already has tasks for today, don't generate more
  if (existingTasks.length >= 3) {
    return [];
  }

  const tasksNeeded = 3 - existingTasks.length;
  const suggestions = await generateSmartSuggestions(userId, projectId, tasksNeeded);

  return suggestions.tasks;
}
