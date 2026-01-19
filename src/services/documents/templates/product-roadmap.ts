export const PRODUCT_ROADMAP_TEMPLATE = {
  name: 'Product Roadmap',
  description: 'Feature timeline and product development plan',
  sections: [
    {
      id: 'vision',
      title: 'Product Vision',
      prompt: 'Articulate the long-term product vision and north star.',
    },
    {
      id: 'strategic-pillars',
      title: 'Strategic Pillars',
      prompt: 'Define the 3-4 key themes or pillars that guide product decisions.',
    },
    {
      id: 'now-next-later',
      title: 'Now, Next, Later',
      prompt: 'Organize features into Now (current quarter), Next (next quarter), and Later (6+ months).',
    },
    {
      id: 'q1-features',
      title: 'Q1 Features',
      prompt: 'Detail specific features planned for the current/next quarter.',
    },
    {
      id: 'q2-features',
      title: 'Q2 Features',
      prompt: 'Outline features planned for the following quarter.',
    },
    {
      id: 'h2-themes',
      title: 'H2 Themes',
      prompt: 'Describe high-level themes and initiatives for the second half.',
    },
    {
      id: 'technical-debt',
      title: 'Technical Debt & Infrastructure',
      prompt: 'Plan for addressing technical debt and infrastructure improvements.',
    },
    {
      id: 'dependencies',
      title: 'Dependencies & Risks',
      prompt: 'Identify key dependencies and risks that could impact the roadmap.',
    },
    {
      id: 'success-metrics',
      title: 'Success Metrics',
      prompt: 'Define how success will be measured for major initiatives.',
    },
    {
      id: 'resource-requirements',
      title: 'Resource Requirements',
      prompt: 'Outline the team and resources needed to execute the roadmap.',
    },
  ],
};

export function getProductRoadmapSystemPrompt(projectContext: {
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
  const pendingMilestones = projectContext.milestones?.filter((m) => !m.isCompleted) || [];

  return `You are generating a product roadmap for a startup called "${projectContext.name}".

Project Details:
- Stage: ${projectContext.stage}
- Description: ${projectContext.description || 'Not provided'}
- Problem Statement: ${projectContext.metadata?.problemStatement || 'Not defined'}
- Target Audience: ${projectContext.metadata?.targetAudience || 'Not defined'}
- Value Proposition: ${projectContext.metadata?.valueProposition || 'Not defined'}
- Known Competitors: ${projectContext.metadata?.competitors?.join(', ') || 'Not identified'}

Current Milestones/Goals:
${pendingMilestones.map((m) => `- ${m.title}`).join('\n') || 'No specific milestones defined'}

Create a realistic, prioritized product roadmap. Balance quick wins with strategic investments. Consider competitive landscape and user needs. Be specific about features but flexible on timelines.

Return JSON with a "sections" array where each section has: id, title, content (the generated text).`;
}
