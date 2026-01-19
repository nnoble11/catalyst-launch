export const USER_PERSONA_TEMPLATE = {
  name: 'User Persona',
  description: 'Detailed customer profile and journey mapping',
  sections: [
    {
      id: 'persona-overview',
      title: 'Persona Overview',
      prompt: 'Create a named persona with demographic details, job title, and background.',
    },
    {
      id: 'goals-motivations',
      title: 'Goals & Motivations',
      prompt: 'Describe what this persona is trying to achieve and what drives them.',
    },
    {
      id: 'pain-points',
      title: 'Pain Points & Frustrations',
      prompt: 'Detail the specific problems and frustrations this persona experiences.',
    },
    {
      id: 'behaviors',
      title: 'Behaviors & Habits',
      prompt: 'Describe how this persona currently solves their problems and their daily routines.',
    },
    {
      id: 'decision-criteria',
      title: 'Decision Criteria',
      prompt: 'What factors influence this persona when evaluating solutions?',
    },
    {
      id: 'information-sources',
      title: 'Information Sources',
      prompt: 'Where does this persona go to learn about new products and solutions?',
    },
    {
      id: 'objections',
      title: 'Common Objections',
      prompt: 'What concerns or objections might this persona have about our solution?',
    },
    {
      id: 'user-journey',
      title: 'User Journey Map',
      prompt: 'Map the journey from awareness to adoption, including key touchpoints.',
    },
    {
      id: 'messaging',
      title: 'Key Messaging',
      prompt: 'What messages and value propositions resonate most with this persona?',
    },
    {
      id: 'quotes',
      title: 'Voice of the Customer',
      prompt: 'Provide representative quotes that capture this persona\'s perspective.',
    },
  ],
};

export function getUserPersonaSystemPrompt(projectContext: {
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
  return `You are generating a detailed user persona for a startup called "${projectContext.name}".

Project Details:
- Stage: ${projectContext.stage}
- Description: ${projectContext.description || 'Not provided'}
- Problem Statement: ${projectContext.metadata?.problemStatement || 'Not defined'}
- Target Audience: ${projectContext.metadata?.targetAudience || 'Not defined'}
- Value Proposition: ${projectContext.metadata?.valueProposition || 'Not defined'}

Create a vivid, research-based persona that feels like a real person. Include specific details that help the team empathize with this user. Use realistic quotes and scenarios.

Return JSON with a "sections" array where each section has: id, title, content (the generated text).`;
}
