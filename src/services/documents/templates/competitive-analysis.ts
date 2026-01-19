export const COMPETITIVE_ANALYSIS_TEMPLATE = {
  name: 'Competitive Analysis',
  description: 'Market positioning and competitor analysis matrix',
  sections: [
    {
      id: 'market-overview',
      title: 'Market Overview',
      prompt: 'Provide an overview of the market landscape, key trends, and dynamics.',
    },
    {
      id: 'competitor-profiles',
      title: 'Competitor Profiles',
      prompt: 'Detail the main competitors, their backgrounds, funding, and market position.',
    },
    {
      id: 'feature-comparison',
      title: 'Feature Comparison Matrix',
      prompt: 'Compare key features across competitors in a structured matrix format.',
    },
    {
      id: 'pricing-analysis',
      title: 'Pricing Analysis',
      prompt: 'Analyze competitor pricing strategies, tiers, and value propositions.',
    },
    {
      id: 'strengths-weaknesses',
      title: 'Strengths & Weaknesses',
      prompt: 'Identify key strengths and weaknesses of each competitor.',
    },
    {
      id: 'market-positioning',
      title: 'Market Positioning',
      prompt: 'Explain how each competitor positions themselves and their target segments.',
    },
    {
      id: 'competitive-advantage',
      title: 'Our Competitive Advantage',
      prompt: 'Articulate what makes our solution unique and defensible.',
    },
    {
      id: 'threat-assessment',
      title: 'Threat Assessment',
      prompt: 'Evaluate potential threats from competitors and new entrants.',
    },
    {
      id: 'opportunities',
      title: 'Market Opportunities',
      prompt: 'Identify gaps in the market and opportunities to differentiate.',
    },
    {
      id: 'strategic-recommendations',
      title: 'Strategic Recommendations',
      prompt: 'Provide actionable recommendations based on the competitive analysis.',
    },
  ],
};

export function getCompetitiveAnalysisSystemPrompt(projectContext: {
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
  return `You are generating a comprehensive competitive analysis for a startup called "${projectContext.name}".

Project Details:
- Stage: ${projectContext.stage}
- Description: ${projectContext.description || 'Not provided'}
- Problem Statement: ${projectContext.metadata?.problemStatement || 'Not defined'}
- Target Audience: ${projectContext.metadata?.targetAudience || 'Not defined'}
- Value Proposition: ${projectContext.metadata?.valueProposition || 'Not defined'}
- Known Competitors: ${projectContext.metadata?.competitors?.join(', ') || 'Research competitors in this space'}

Generate detailed, actionable competitive intelligence. Use tables and matrices where appropriate. If specific competitor data isn't available, provide frameworks and guidance for research.

Return JSON with a "sections" array where each section has: id, title, content (the generated text).`;
}
