export const PITCH_DECK_TEMPLATE = {
  name: 'Pitch Deck',
  description: 'A comprehensive investor pitch deck',
  sections: [
    {
      id: 'problem',
      title: 'The Problem',
      prompt: 'Describe the problem you are solving. What pain point exists in the market?',
    },
    {
      id: 'solution',
      title: 'Our Solution',
      prompt: 'Explain your solution and how it addresses the problem uniquely.',
    },
    {
      id: 'market',
      title: 'Market Opportunity',
      prompt:
        'Describe the market size (TAM, SAM, SOM) and growth potential.',
    },
    {
      id: 'product',
      title: 'Product',
      prompt: 'Explain how your product works and its key features.',
    },
    {
      id: 'traction',
      title: 'Traction',
      prompt: 'Share your current metrics, milestones achieved, and growth.',
    },
    {
      id: 'business-model',
      title: 'Business Model',
      prompt: 'Explain how you make money and your pricing strategy.',
    },
    {
      id: 'competition',
      title: 'Competition',
      prompt: 'Identify competitors and explain your competitive advantages.',
    },
    {
      id: 'team',
      title: 'Team',
      prompt: 'Introduce your team and relevant experience.',
    },
    {
      id: 'financials',
      title: 'Financial Projections',
      prompt: 'Share your financial projections for the next 3-5 years.',
    },
    {
      id: 'ask',
      title: 'The Ask',
      prompt:
        'State how much funding you are raising and how you will use it.',
    },
  ],
};

export function getPitchDeckSystemPrompt(projectContext: {
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
  return `You are generating a professional pitch deck for a startup called "${projectContext.name}".

Project Details:
- Stage: ${projectContext.stage}
- Description: ${projectContext.description || 'Not provided'}
- Problem Statement: ${projectContext.metadata?.problemStatement || 'Not defined'}
- Target Audience: ${projectContext.metadata?.targetAudience || 'Not defined'}
- Value Proposition: ${projectContext.metadata?.valueProposition || 'Not defined'}
- Known Competitors: ${projectContext.metadata?.competitors?.join(', ') || 'Not identified'}

Generate compelling, investor-ready content for each section. Be specific and use data where possible. If specific data isn't available, use reasonable placeholders marked with [brackets].

Return JSON with a "sections" array where each section has: id, title, content (the generated text).`;
}
