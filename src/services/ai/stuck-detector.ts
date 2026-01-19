import { generateStructuredOutput } from '@/lib/ai/openai';
import { buildUserContext } from '@/services/context/engine';
import {
  getRecentActivities,
  getStuckMilestones,
  getStalledProjects,
  getProjectById,
} from '@/lib/db/queries';
import type { StuckAnalysis, StuckIndicator, UserContext } from '@/types';

interface ActivityPattern {
  totalActivities: number;
  activityTrend: 'increasing' | 'stable' | 'declining' | 'none';
  daysSinceLastActivity: number;
  activityByDay: Record<string, number>;
}

function analyzeActivityPattern(
  activities: { createdAt: Date; type: string }[]
): ActivityPattern {
  const now = new Date();
  const activityByDay: Record<string, number> = {};

  // Group activities by day
  for (const activity of activities) {
    const dateKey = activity.createdAt.toISOString().split('T')[0];
    activityByDay[dateKey] = (activityByDay[dateKey] || 0) + 1;
  }

  // Calculate days since last activity
  let daysSinceLastActivity = 7;
  if (activities.length > 0) {
    const lastActivity = activities[0];
    const diffTime = Math.abs(now.getTime() - lastActivity.createdAt.getTime());
    daysSinceLastActivity = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Determine activity trend
  let activityTrend: ActivityPattern['activityTrend'] = 'none';
  if (activities.length === 0) {
    activityTrend = 'none';
  } else {
    // Compare first half vs second half of the week
    const midpoint = new Date();
    midpoint.setDate(midpoint.getDate() - 3);

    const recentCount = activities.filter((a) => a.createdAt >= midpoint).length;
    const olderCount = activities.filter((a) => a.createdAt < midpoint).length;

    if (recentCount > olderCount * 1.5) {
      activityTrend = 'increasing';
    } else if (olderCount > recentCount * 1.5) {
      activityTrend = 'declining';
    } else {
      activityTrend = 'stable';
    }
  }

  return {
    totalActivities: activities.length,
    activityTrend,
    daysSinceLastActivity,
    activityByDay,
  };
}

export async function detectStuckPatterns(
  userId: string,
  projectId?: string
): Promise<StuckIndicator[]> {
  const indicators: StuckIndicator[] = [];

  // Get recent activities
  const activities = await getRecentActivities(userId, projectId, 14);
  const activityPattern = analyzeActivityPattern(activities);

  // Check for no activity (48+ hours)
  if (activityPattern.daysSinceLastActivity >= 2) {
    indicators.push({
      type: 'no_activity',
      severity: activityPattern.daysSinceLastActivity >= 7 ? 'high' : 'medium',
      description: `No activity detected in the last ${activityPattern.daysSinceLastActivity} days`,
      daysSinceActivity: activityPattern.daysSinceLastActivity,
      suggestedActions: [
        'Start with a small, 5-minute task to build momentum',
        'Review your current milestone and break it into smaller steps',
        'Schedule a dedicated work session in your calendar',
      ],
    });
  }

  // Check for declining activity
  if (activityPattern.activityTrend === 'declining') {
    indicators.push({
      type: 'declining_activity',
      severity: 'medium',
      description: 'Activity levels have been declining recently',
      suggestedActions: [
        'Identify what might be causing the slowdown',
        'Consider if you need to adjust your goals or timeline',
        'Try working on a different aspect of the project',
      ],
    });
  }

  // Check for stuck milestones (7+ days on same milestone)
  if (projectId) {
    const project = await getProjectById(projectId);
    if (project) {
      const pendingMilestones = project.milestones.filter((m) => !m.isCompleted);
      const oldestPending = pendingMilestones[0];

      if (oldestPending) {
        const daysSinceCreated = Math.ceil(
          (new Date().getTime() - oldestPending.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceCreated >= 7) {
          indicators.push({
            type: 'stuck_milestone',
            severity: daysSinceCreated >= 14 ? 'high' : 'medium',
            description: `Milestone "${oldestPending.title}" has been pending for ${daysSinceCreated} days`,
            affectedItems: [oldestPending.title],
            suggestedActions: [
              'Break this milestone into 3-5 smaller tasks',
              'Identify the specific blocker preventing progress',
              'Consider if this milestone needs to be redefined',
            ],
          });
        }
      }
    }
  }

  return indicators;
}

export async function analyzeStuckState(
  userId: string,
  projectId?: string
): Promise<StuckAnalysis> {
  const indicators = await detectStuckPatterns(userId, projectId);
  const context = await buildUserContext(userId, projectId);

  // Determine overall severity
  let overallSeverity: StuckAnalysis['overallSeverity'] = 'none';
  if (indicators.length > 0) {
    const hasHigh = indicators.some((i) => i.severity === 'high');
    const hasMedium = indicators.some((i) => i.severity === 'medium');

    if (hasHigh || indicators.length >= 3) {
      overallSeverity = 'high';
    } else if (hasMedium || indicators.length >= 2) {
      overallSeverity = 'medium';
    } else {
      overallSeverity = 'low';
    }
  }

  // Generate AI-powered encouragement and next steps
  const aiResponse = await generateStuckResponse(context, indicators);

  return {
    isStuck: indicators.length > 0,
    overallSeverity,
    indicators,
    encouragement: aiResponse.encouragement,
    nextSteps: aiResponse.nextSteps,
    resources: aiResponse.resources,
  };
}

interface StuckAiResponse {
  encouragement: string;
  nextSteps: string[];
  resources: {
    title: string;
    description: string;
    type: 'template' | 'guide' | 'exercise';
  }[];
}

async function generateStuckResponse(
  context: UserContext,
  indicators: StuckIndicator[]
): Promise<StuckAiResponse> {
  if (indicators.length === 0) {
    return {
      encouragement: "You're making great progress! Keep up the momentum.",
      nextSteps: ['Continue with your current tasks', 'Review your milestones'],
      resources: [],
    };
  }

  const systemPrompt = `You are a supportive startup coach helping a founder who appears to be stuck.
Your goal is to provide genuine encouragement and actionable next steps.
Be warm and understanding, but also practical and specific.
The founder is working on: ${context.currentProject?.name || 'their startup'}
Current stage: ${context.currentProject?.stage || 'ideation'}`;

  const userPrompt = `The founder is experiencing the following challenges:
${indicators.map((i) => `- ${i.type}: ${i.description}`).join('\n')}

Recent activity: ${context.recentActivity.length} actions in the past 2 weeks
Milestones: ${context.projectMilestones.filter((m) => m.isCompleted).length}/${context.projectMilestones.length} completed

Please provide:
1. A brief, genuine encouragement message (2-3 sentences)
2. 3 specific next steps they can take right now
3. 2-3 relevant resources (templates, guides, or exercises) that could help

Return as JSON with keys: encouragement (string), nextSteps (array of strings), resources (array with title, description, type)`;

  try {
    const response = await generateStructuredOutput<StuckAiResponse>(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        type: 'object',
        properties: {
          encouragement: { type: 'string' },
          nextSteps: { type: 'array', items: { type: 'string' } },
          resources: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                type: { type: 'string', enum: ['template', 'guide', 'exercise'] },
              },
            },
          },
        },
      }
    );

    return response;
  } catch (error) {
    console.error('Error generating stuck response:', error);
    // Return a fallback response
    return {
      encouragement:
        "Every founder faces challenges - it's a normal part of the journey. Let's work through this together.",
      nextSteps: [
        'Start with the smallest possible next action',
        'Reach out to a mentor or fellow founder for perspective',
        'Take a short break and return with fresh eyes',
      ],
      resources: [
        {
          title: 'The 5-Minute Unstuck Exercise',
          description: 'A quick exercise to identify and overcome your primary blocker',
          type: 'exercise',
        },
        {
          title: 'Milestone Breakdown Template',
          description: 'Break large milestones into manageable daily tasks',
          type: 'template',
        },
      ],
    };
  }
}

export async function shouldSendStuckAlert(userId: string, projectId?: string): Promise<boolean> {
  const indicators = await detectStuckPatterns(userId, projectId);

  // Send alert if:
  // - Any high severity indicator exists
  // - Multiple medium severity indicators exist
  // - No activity for 48+ hours
  const hasHighSeverity = indicators.some((i) => i.severity === 'high');
  const mediumCount = indicators.filter((i) => i.severity === 'medium').length;
  const noRecentActivity = indicators.some(
    (i) => i.type === 'no_activity' && (i.daysSinceActivity ?? 0) >= 2
  );

  return hasHighSeverity || mediumCount >= 2 || noRecentActivity;
}
