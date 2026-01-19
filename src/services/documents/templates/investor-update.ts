export const INVESTOR_UPDATE_TEMPLATE = {
  name: 'Investor Update',
  description: 'Monthly progress report for investors and stakeholders',
  sections: [
    {
      id: 'highlights',
      title: 'Key Highlights',
      prompt: 'Summarize the top 3-5 wins and achievements this month.',
    },
    {
      id: 'metrics',
      title: 'Key Metrics',
      prompt: 'Report on core KPIs with month-over-month and year-over-year comparisons.',
    },
    {
      id: 'product-updates',
      title: 'Product Updates',
      prompt: 'Describe new features shipped, improvements made, and technical progress.',
    },
    {
      id: 'customer-insights',
      title: 'Customer Insights',
      prompt: 'Share customer feedback, case studies, and notable wins or losses.',
    },
    {
      id: 'team-updates',
      title: 'Team Updates',
      prompt: 'Announce new hires, departures, and organizational changes.',
    },
    {
      id: 'financial-summary',
      title: 'Financial Summary',
      prompt: 'Provide a brief financial update including burn rate and runway.',
    },
    {
      id: 'challenges',
      title: 'Challenges & Learnings',
      prompt: 'Be transparent about obstacles faced and lessons learned.',
    },
    {
      id: 'next-month',
      title: 'Next Month Focus',
      prompt: 'Outline priorities and expected milestones for the coming month.',
    },
    {
      id: 'asks',
      title: 'Asks from Investors',
      prompt: 'Specify any introductions, advice, or support needed from investors.',
    },
  ],
};

export function getInvestorUpdateSystemPrompt(projectContext: {
  name: string;
  description?: string;
  stage: string;
  metadata?: {
    problemStatement?: string;
    targetAudience?: string;
    valueProposition?: string;
    competitors?: string[];
  };
  milestones?: { title: string; isCompleted: boolean }[];
}): string {
  const completedMilestones = projectContext.milestones?.filter((m) => m.isCompleted) || [];
  const pendingMilestones = projectContext.milestones?.filter((m) => !m.isCompleted) || [];

  return `You are generating a monthly investor update for a startup called "${projectContext.name}".

Project Details:
- Stage: ${projectContext.stage}
- Description: ${projectContext.description || 'Not provided'}
- Target Audience: ${projectContext.metadata?.targetAudience || 'Not defined'}

Recent Progress:
- Completed Milestones: ${completedMilestones.map((m) => m.title).join(', ') || 'None recorded'}
- Upcoming Milestones: ${pendingMilestones.map((m) => m.title).join(', ') || 'None recorded'}

Create a professional, concise investor update that balances celebrating wins with honest transparency about challenges. Use specific metrics and data points. Be forward-looking and action-oriented.

Return JSON with a "sections" array where each section has: id, title, content (the generated text).`;
}
