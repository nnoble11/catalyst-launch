export const LANDING_PAGE_TEMPLATE = {
  name: 'Landing Page Copy',
  description: 'Conversion-optimized marketing content',
  sections: [
    {
      id: 'headline',
      title: 'Hero Headline',
      prompt: 'Create a compelling main headline that captures attention and value proposition.',
    },
    {
      id: 'subheadline',
      title: 'Subheadline',
      prompt: 'Write a supporting subheadline that elaborates on the headline.',
    },
    {
      id: 'cta-primary',
      title: 'Primary CTA',
      prompt: 'Craft the main call-to-action button text and surrounding copy.',
    },
    {
      id: 'problem-section',
      title: 'Problem Section',
      prompt: 'Describe the problem in a way that resonates with the target audience.',
    },
    {
      id: 'solution-section',
      title: 'Solution Section',
      prompt: 'Present the solution and how it addresses the pain points.',
    },
    {
      id: 'features',
      title: 'Key Features',
      prompt: 'List and describe 3-5 key features with benefit-focused copy.',
    },
    {
      id: 'how-it-works',
      title: 'How It Works',
      prompt: 'Explain the product/service in 3-4 simple steps.',
    },
    {
      id: 'social-proof',
      title: 'Social Proof',
      prompt: 'Provide testimonials, stats, logos, or other credibility indicators.',
    },
    {
      id: 'faq',
      title: 'FAQ Section',
      prompt: 'Address the top 5-6 frequently asked questions and objections.',
    },
    {
      id: 'final-cta',
      title: 'Final CTA Section',
      prompt: 'Create a compelling closing section with final call-to-action.',
    },
    {
      id: 'meta-content',
      title: 'SEO Meta Content',
      prompt: 'Write the meta title, description, and key phrases for SEO.',
    },
  ],
};

export function getLandingPageSystemPrompt(projectContext: {
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
  return `You are generating landing page copy for a startup called "${projectContext.name}".

Project Details:
- Stage: ${projectContext.stage}
- Description: ${projectContext.description || 'Not provided'}
- Problem Statement: ${projectContext.metadata?.problemStatement || 'Not defined'}
- Target Audience: ${projectContext.metadata?.targetAudience || 'Not defined'}
- Value Proposition: ${projectContext.metadata?.valueProposition || 'Not defined'}
- Known Competitors: ${projectContext.metadata?.competitors?.join(', ') || 'Not identified'}

Create conversion-optimized copy that:
1. Speaks directly to the target audience's pain points
2. Uses clear, benefit-focused language
3. Builds trust and credibility
4. Creates urgency without being pushy
5. Is scannable with clear hierarchy

Write in a voice that matches the brand (professional yet approachable). Use power words and emotional triggers. Include specific numbers and outcomes where possible.

Return JSON with a "sections" array where each section has: id, title, content (the generated text).`;
}
