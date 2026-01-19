export const FINANCIAL_PROJECTIONS_TEMPLATE = {
  name: 'Financial Projections',
  description: 'Revenue and cost models with 3-5 year forecasts',
  sections: [
    {
      id: 'executive-summary',
      title: 'Executive Summary',
      prompt: 'Summarize the key financial highlights and projections.',
    },
    {
      id: 'revenue-model',
      title: 'Revenue Model',
      prompt: 'Detail the revenue streams, pricing, and how money will be made.',
    },
    {
      id: 'revenue-projections',
      title: 'Revenue Projections',
      prompt: 'Provide monthly/quarterly revenue projections for Year 1, then annual for Years 2-5.',
    },
    {
      id: 'cost-structure',
      title: 'Cost Structure',
      prompt: 'Break down fixed costs, variable costs, and major expense categories.',
    },
    {
      id: 'unit-economics',
      title: 'Unit Economics',
      prompt: 'Calculate CAC, LTV, LTV:CAC ratio, and payback period.',
    },
    {
      id: 'cash-flow',
      title: 'Cash Flow Projections',
      prompt: 'Project cash inflows and outflows, identifying runway and funding needs.',
    },
    {
      id: 'break-even',
      title: 'Break-Even Analysis',
      prompt: 'Calculate when the business will break even and the path to profitability.',
    },
    {
      id: 'headcount',
      title: 'Headcount Plan',
      prompt: 'Project hiring needs and associated costs over time.',
    },
    {
      id: 'funding-requirements',
      title: 'Funding Requirements',
      prompt: 'Detail funding needs, use of funds, and expected milestones per funding round.',
    },
    {
      id: 'assumptions',
      title: 'Key Assumptions',
      prompt: 'List the critical assumptions underlying these projections.',
    },
    {
      id: 'scenarios',
      title: 'Scenario Analysis',
      prompt: 'Provide base, optimistic, and conservative scenarios with key drivers.',
    },
  ],
};

export function getFinancialProjectionsSystemPrompt(projectContext: {
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
  return `You are generating financial projections for a startup called "${projectContext.name}".

Project Details:
- Stage: ${projectContext.stage}
- Description: ${projectContext.description || 'Not provided'}
- Target Audience: ${projectContext.metadata?.targetAudience || 'Not defined'}
- Value Proposition: ${projectContext.metadata?.valueProposition || 'Not defined'}

Create realistic, defensible financial projections based on the stage and market. Use industry benchmarks where applicable. Include tables and charts descriptions. Mark assumptions clearly and explain the reasoning.

For early-stage startups, focus on near-term projections and unit economics. For later stages, include more detailed P&L projections.

Return JSON with a "sections" array where each section has: id, title, content (the generated text).`;
}
