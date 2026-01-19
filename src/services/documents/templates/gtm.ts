export const GTM_TEMPLATE = {
  name: 'Go-to-Market Plan',
  description: 'A comprehensive go-to-market strategy document',
  sections: [
    {
      id: 'executive-summary',
      title: 'Executive Summary',
      prompt: 'Provide a brief overview of the GTM strategy and key goals.',
    },
    {
      id: 'target-market',
      title: 'Target Market',
      prompt: 'Define the target market segments, ideal customer profile, and buyer personas.',
    },
    {
      id: 'value-proposition',
      title: 'Value Proposition',
      prompt: 'Articulate the unique value proposition and key messaging.',
    },
    {
      id: 'competitive-analysis',
      title: 'Competitive Analysis',
      prompt: 'Analyze the competitive landscape and positioning.',
    },
    {
      id: 'pricing-strategy',
      title: 'Pricing Strategy',
      prompt: 'Define the pricing model, tiers, and rationale.',
    },
    {
      id: 'distribution',
      title: 'Distribution Channels',
      prompt: 'Outline the sales and distribution channels.',
    },
    {
      id: 'marketing-strategy',
      title: 'Marketing Strategy',
      prompt: 'Detail the marketing channels, campaigns, and tactics.',
    },
    {
      id: 'sales-strategy',
      title: 'Sales Strategy',
      prompt: 'Define the sales process, team structure, and targets.',
    },
    {
      id: 'launch-plan',
      title: 'Launch Plan',
      prompt: 'Outline the launch timeline, activities, and milestones.',
    },
    {
      id: 'metrics',
      title: 'Success Metrics & KPIs',
      prompt: 'Define the key metrics and KPIs to track.',
    },
    {
      id: 'budget',
      title: 'Budget & Resources',
      prompt: 'Outline the budget allocation and resource requirements.',
    },
  ],
};

export function getGTMSystemPrompt(projectContext: {
  name: string;
  description?: string;
  stage: string;
  metadata?: {
    problemStatement?: string;
    targetAudience?: string;
    valueProposition?: string;
    competitors?: string[];
  };
}): string {
  return `You are generating a Go-to-Market Plan for "${projectContext.name}".

Project Details:
- Stage: ${projectContext.stage}
- Description: ${projectContext.description || 'Not provided'}
- Problem Statement: ${projectContext.metadata?.problemStatement || 'Not defined'}
- Target Audience: ${projectContext.metadata?.targetAudience || 'Not defined'}
- Value Proposition: ${projectContext.metadata?.valueProposition || 'Not defined'}
- Known Competitors: ${projectContext.metadata?.competitors?.join(', ') || 'Not identified'}

Generate a comprehensive, actionable go-to-market strategy. Include specific tactics, timelines, and metrics where possible. Use [brackets] for placeholders that need specific data.

Return JSON with a "sections" array where each section has: id, title, content (the generated text).`;
}
