import type { Stage } from '@/config/constants';

export const BASE_SYSTEM_PROMPT = `You are an AI cofounder for Catalyst Launch, an AI-powered platform that serves as a cofounder to entrepreneurs. Your role is to guide founders through their startup journey, from ideation to go-to-market.

Key responsibilities:
1. Provide actionable, specific advice tailored to the user's current stage
2. Help users clarify their value proposition and target audience
3. Suggest concrete next steps and milestones
4. Challenge assumptions constructively
5. Share relevant frameworks and best practices

Communication style:
- Be concise but thorough
- Ask clarifying questions when needed
- Prioritize practical advice over theory
- Be encouraging but realistic
- Use bullet points and structured responses when appropriate

You have access to the user's project context including their current stage, milestones, and recent activity. Use this context to provide personalized guidance.`;

export function getStageSpecificPrompt(stage: Stage): string {
  const prompts: Record<Stage, string> = {
    ideation: `The user is in the IDEATION stage. Focus on:
- Problem validation and customer discovery
- Market research and competitive analysis
- Defining the target audience clearly
- Crafting a compelling value proposition
- Identifying key assumptions to test
- Recommending low-cost validation experiments`,

    mvp: `The user is in the MVP DEVELOPMENT stage. Focus on:
- Defining core features vs nice-to-haves
- Technical architecture decisions
- Build vs buy decisions
- Creating a realistic development timeline
- Setting up user feedback mechanisms
- Preparing for initial user testing`,

    gtm: `The user is in the GO-TO-MARKET stage. Focus on:
- Pricing strategy and business model
- Marketing channel selection
- Sales process development
- Launch planning and execution
- Metrics and KPIs to track
- Scaling considerations`,
  };

  return prompts[stage];
}

interface IntegrationContext {
  provider: string;
  title?: string;
  content?: string;
  itemType?: string;
  syncedAt?: Date;
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

export function buildContextualPrompt(context: {
  stage: Stage;
  projectName: string;
  description?: string;
  milestones?: { title: string; isCompleted: boolean }[];
  recentActivity?: { type: string; data: unknown }[];
  memoryContext?: string;
  integrationSummary?: string;
  integrationHighlights?: string[];
  integrationInsights?: {
    summary: string;
    insights?: string[];
    recommendations?: string[];
    nextSteps?: string[];
    generatedAt?: Date;
  };
  integrationData?: IntegrationContext[];
}): string {
  let prompt = `${BASE_SYSTEM_PROMPT}\n\n`;
  prompt += `${getStageSpecificPrompt(context.stage)}\n\n`;

  // Add current date/time context
  const now = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  };
  prompt += `Current date and time: ${now.toLocaleDateString('en-US', dateOptions)} at ${now.toLocaleTimeString('en-US', timeOptions)}\n\n`;

  prompt += `Current project context:\n`;
  prompt += `- Project: ${context.projectName}\n`;
  prompt += `- Stage: ${context.stage}\n`;

  if (context.description) {
    prompt += `- Description: ${context.description}\n`;
  }

  if (context.milestones && context.milestones.length > 0) {
    const completed = context.milestones.filter((m) => m.isCompleted);
    const pending = context.milestones.filter((m) => !m.isCompleted);

    prompt += `\nMilestone progress: ${completed.length}/${context.milestones.length} completed\n`;

    if (pending.length > 0) {
      prompt += `Next milestones to complete:\n`;
      pending.slice(0, 3).forEach((m) => {
        prompt += `- ${m.title}\n`;
      });
    }
  }

  if (context.memoryContext) {
    prompt += `\n${context.memoryContext}\n`;
  }

  // Include integration data if available
  if (context.integrationData && context.integrationData.length > 0) {
    prompt += `\n## Connected Integration Data\n`;
    prompt += `The user has connected external tools. Use this data holistically for insights, recommendations, and next steps.\n`;
    if (context.integrationSummary) {
      prompt += `${context.integrationSummary}\n`;
    }
    if (context.integrationHighlights && context.integrationHighlights.length > 0) {
      prompt += `Key highlights:\n`;
      context.integrationHighlights.forEach((highlight) => {
        prompt += `- ${highlight}\n`;
      });
    }
    prompt += '\n';

    const now = new Date();

    // Group by provider
    const byProvider = context.integrationData.reduce((acc, item) => {
      const key = item.provider.replace('_', ' ');
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, IntegrationContext[]>);

    for (const [provider, items] of Object.entries(byProvider)) {
      // Filter and sort items based on provider type
      let filteredItems = items;

      // For calendar events, only show upcoming events
      if (provider === 'google calendar') {
        filteredItems = items.filter((item) => {
          const startDateStr = item.metadata?.custom?.start?.dateTime || item.metadata?.custom?.start?.date;
          if (!startDateStr) return false;
          const startDate = new Date(startDateStr);
          return startDate >= now;
        }).sort((a, b) => {
          const aStart = a.metadata?.custom?.start?.dateTime || a.metadata?.custom?.start?.date || '';
          const bStart = b.metadata?.custom?.start?.dateTime || b.metadata?.custom?.start?.date || '';
          return new Date(aStart).getTime() - new Date(bStart).getTime();
        });
      }

      if (filteredItems.length === 0) continue;

      prompt += `### ${provider.charAt(0).toUpperCase() + provider.slice(1)}\n`;
      filteredItems.forEach((item) => {
        if (item.title) {
          prompt += `- **${item.title}**`;
          if (item.itemType) prompt += ` (${item.itemType})`;

          // Add date for calendar events
          if (provider === 'google calendar') {
            const startDateStr = item.metadata?.custom?.start?.dateTime || item.metadata?.custom?.start?.date;
            if (startDateStr) {
              const date = new Date(startDateStr);
              prompt += ` - ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
            }
          }

          prompt += '\n';
          if (item.content && provider !== 'google calendar') {
            // Truncate long content (skip for calendar events as they rarely have useful descriptions)
            const truncated = item.content.length > 200
              ? item.content.substring(0, 200) + '...'
              : item.content;
            prompt += `  ${truncated}\n`;
          }
          if (item.sourceUrl) {
            prompt += `  Source: ${item.sourceUrl}\n`;
          }
          if (item.createdAt && provider !== 'google calendar') {
            prompt += `  Ingested: ${new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}\n`;
          }
        }
      });
      prompt += '\n';
    }
  }

  if (context.integrationInsights) {
    prompt += `\n## Integration Insights\n`;
    prompt += `${context.integrationInsights.summary}\n`;
    if (context.integrationInsights.insights && context.integrationInsights.insights.length > 0) {
      prompt += `Insights:\n`;
      context.integrationInsights.insights.forEach((insight) => {
        prompt += `- ${insight}\n`;
      });
    }
    if (context.integrationInsights.recommendations && context.integrationInsights.recommendations.length > 0) {
      prompt += `Recommendations:\n`;
      context.integrationInsights.recommendations.forEach((rec) => {
        prompt += `- ${rec}\n`;
      });
    }
    if (context.integrationInsights.nextSteps && context.integrationInsights.nextSteps.length > 0) {
      prompt += `Next steps:\n`;
      context.integrationInsights.nextSteps.forEach((step) => {
        prompt += `- ${step}\n`;
      });
    }
    prompt += '\n';
  }

  return prompt;
}

export const DAILY_CHECKIN_PROMPT = `You are conducting a daily check-in with a startup founder. Your goal is to:
1. Understand what they accomplished yesterday
2. Identify any blockers or challenges
3. Help them prioritize today's tasks
4. Provide motivation and accountability

Keep the conversation focused and actionable. Ask one question at a time and provide specific suggestions based on their responses.`;

export const DOCUMENT_GENERATION_PROMPT = `You are generating a professional startup document. Follow these guidelines:
1. Use clear, professional language
2. Structure content logically with headers and sections
3. Include specific, actionable content
4. Tailor content to the specific startup context
5. Return content in a structured JSON format

Provide thorough, investor-ready content while maintaining clarity.`;
