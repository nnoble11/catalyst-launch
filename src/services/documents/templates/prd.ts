export const PRD_TEMPLATE = {
  name: 'Product Requirements Document',
  description: 'A comprehensive product requirements document for development',
  sections: [
    {
      id: 'overview',
      title: 'Product Overview',
      prompt: 'Provide a high-level overview of the product and its purpose.',
    },
    {
      id: 'objectives',
      title: 'Objectives & Key Results',
      prompt: 'Define the main objectives and measurable key results.',
    },
    {
      id: 'user-personas',
      title: 'User Personas',
      prompt: 'Describe the target users and their characteristics.',
    },
    {
      id: 'user-stories',
      title: 'User Stories',
      prompt: 'List the key user stories in the format: As a [user], I want [goal], so that [benefit].',
    },
    {
      id: 'features',
      title: 'Feature Requirements',
      prompt: 'Detail the core features with acceptance criteria.',
    },
    {
      id: 'non-functional',
      title: 'Non-Functional Requirements',
      prompt: 'Specify performance, security, scalability, and other non-functional requirements.',
    },
    {
      id: 'technical',
      title: 'Technical Considerations',
      prompt: 'Outline technical architecture, integrations, and constraints.',
    },
    {
      id: 'timeline',
      title: 'Timeline & Milestones',
      prompt: 'Define the development phases and key milestones.',
    },
    {
      id: 'success-metrics',
      title: 'Success Metrics',
      prompt: 'Define how success will be measured post-launch.',
    },
    {
      id: 'risks',
      title: 'Risks & Mitigations',
      prompt: 'Identify potential risks and mitigation strategies.',
    },
  ],
};

export function getPRDSystemPrompt(projectContext: {
  name: string;
  description?: string;
  stage: string;
  metadata?: {
    problemStatement?: string;
    targetAudience?: string;
    valueProposition?: string;
  };
  milestones?: { title: string; isCompleted: boolean }[];
}): string {
  return `You are generating a Product Requirements Document (PRD) for "${projectContext.name}".

Project Details:
- Stage: ${projectContext.stage}
- Description: ${projectContext.description || 'Not provided'}
- Problem Statement: ${projectContext.metadata?.problemStatement || 'Not defined'}
- Target Audience: ${projectContext.metadata?.targetAudience || 'Not defined'}
- Value Proposition: ${projectContext.metadata?.valueProposition || 'Not defined'}

Current Milestones:
${projectContext.milestones?.map((m) => `- [${m.isCompleted ? 'x' : ' '}] ${m.title}`).join('\n') || 'None defined'}

Generate comprehensive, development-ready content for each section. Be specific and actionable. Use technical precision where appropriate.

Return JSON with a "sections" array where each section has: id, title, content (the generated text).`;
}
