import { generateStructuredOutput } from '@/lib/ai/openai';
import { getProjectById, createDocument, createActivity } from '@/lib/db/queries';
import {
  PITCH_DECK_TEMPLATE,
  getPitchDeckSystemPrompt,
} from './templates/pitch-deck';
import { PRD_TEMPLATE, getPRDSystemPrompt } from './templates/prd';
import { GTM_TEMPLATE, getGTMSystemPrompt } from './templates/gtm';
import {
  COMPETITIVE_ANALYSIS_TEMPLATE,
  getCompetitiveAnalysisSystemPrompt,
} from './templates/competitive-analysis';
import {
  USER_PERSONA_TEMPLATE,
  getUserPersonaSystemPrompt,
} from './templates/user-persona';
import {
  FINANCIAL_PROJECTIONS_TEMPLATE,
  getFinancialProjectionsSystemPrompt,
} from './templates/financial-projections';
import {
  INVESTOR_UPDATE_TEMPLATE,
  getInvestorUpdateSystemPrompt,
} from './templates/investor-update';
import {
  PRODUCT_ROADMAP_TEMPLATE,
  getProductRoadmapSystemPrompt,
} from './templates/product-roadmap';
import {
  LANDING_PAGE_TEMPLATE,
  getLandingPageSystemPrompt,
} from './templates/landing-page';
import type { DocumentType } from '@/config/constants';

interface GeneratedSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

interface GenerationResult {
  sections: GeneratedSection[];
}

const TEMPLATES: Record<DocumentType, typeof PITCH_DECK_TEMPLATE> = {
  'pitch-deck': PITCH_DECK_TEMPLATE,
  prd: PRD_TEMPLATE,
  'gtm-plan': GTM_TEMPLATE,
  'competitive-analysis': COMPETITIVE_ANALYSIS_TEMPLATE,
  'user-persona': USER_PERSONA_TEMPLATE,
  'financial-projections': FINANCIAL_PROJECTIONS_TEMPLATE,
  'investor-update': INVESTOR_UPDATE_TEMPLATE,
  'product-roadmap': PRODUCT_ROADMAP_TEMPLATE,
  'landing-page': LANDING_PAGE_TEMPLATE,
};

const PROMPT_GENERATORS: Record<DocumentType, typeof getPitchDeckSystemPrompt> = {
  'pitch-deck': getPitchDeckSystemPrompt,
  prd: getPRDSystemPrompt,
  'gtm-plan': getGTMSystemPrompt,
  'competitive-analysis': getCompetitiveAnalysisSystemPrompt,
  'user-persona': getUserPersonaSystemPrompt,
  'financial-projections': getFinancialProjectionsSystemPrompt,
  'investor-update': getInvestorUpdateSystemPrompt,
  'product-roadmap': getProductRoadmapSystemPrompt,
  'landing-page': getLandingPageSystemPrompt,
};

// Minimum required context for different document types
const DOCUMENT_REQUIREMENTS: Record<DocumentType, { required: string[]; recommended: string[] }> = {
  'pitch-deck': {
    required: ['description'],
    recommended: ['problemStatement', 'targetAudience', 'valueProposition'],
  },
  prd: {
    required: ['description'],
    recommended: ['targetAudience', 'valueProposition'],
  },
  'gtm-plan': {
    required: ['description', 'targetAudience'],
    recommended: ['valueProposition', 'competitors'],
  },
  'competitive-analysis': {
    required: ['description'],
    recommended: ['competitors', 'valueProposition'],
  },
  'user-persona': {
    required: ['targetAudience'],
    recommended: ['problemStatement', 'valueProposition'],
  },
  'financial-projections': {
    required: ['description'],
    recommended: ['targetAudience', 'valueProposition'],
  },
  'investor-update': {
    required: ['description'],
    recommended: [],
  },
  'product-roadmap': {
    required: ['description'],
    recommended: ['valueProposition'],
  },
  'landing-page': {
    required: ['description', 'valueProposition'],
    recommended: ['targetAudience', 'problemStatement'],
  },
};

interface ProjectReadiness {
  isReady: boolean;
  missingRequired: string[];
  missingRecommended: string[];
  contextScore: number;
}

function checkProjectReadiness(
  project: { description?: string | null; metadata?: Record<string, unknown> | null },
  documentType: DocumentType
): ProjectReadiness {
  const requirements = DOCUMENT_REQUIREMENTS[documentType];
  const missingRequired: string[] = [];
  const missingRecommended: string[] = [];

  const metadata = (project.metadata || {}) as Record<string, unknown>;

  // Check required fields
  for (const field of requirements.required) {
    if (field === 'description') {
      if (!project.description || project.description.length < 20) {
        missingRequired.push('project description (at least 20 characters)');
      }
    } else if (!metadata[field] || (typeof metadata[field] === 'string' && (metadata[field] as string).length < 10)) {
      missingRequired.push(field.replace(/([A-Z])/g, ' $1').toLowerCase().trim());
    }
  }

  // Check recommended fields
  for (const field of requirements.recommended) {
    if (!metadata[field] || (typeof metadata[field] === 'string' && (metadata[field] as string).length < 10)) {
      missingRecommended.push(field.replace(/([A-Z])/g, ' $1').toLowerCase().trim());
    }
  }

  // Calculate context score (0-100)
  const totalFields = requirements.required.length + requirements.recommended.length;
  const filledRequired = requirements.required.length - missingRequired.length;
  const filledRecommended = requirements.recommended.length - missingRecommended.length;
  const contextScore = totalFields > 0
    ? Math.round(((filledRequired * 2 + filledRecommended) / (requirements.required.length * 2 + requirements.recommended.length)) * 100)
    : 100;

  return {
    isReady: missingRequired.length === 0,
    missingRequired,
    missingRecommended,
    contextScore,
  };
}

export async function generateDocument(
  userId: string,
  projectId: string,
  documentType: DocumentType
): Promise<{ id: string; sections: GeneratedSection[] }> {
  // Get project details
  const project = await getProjectById(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  if (project.userId !== userId) {
    throw new Error('Unauthorized');
  }

  const template = TEMPLATES[documentType];
  const getSystemPrompt = PROMPT_GENERATORS[documentType];

  if (!template || !getSystemPrompt) {
    throw new Error('Invalid document type');
  }

  // Check project readiness
  const readiness = checkProjectReadiness(project, documentType);
  if (!readiness.isReady) {
    const missingFields = readiness.missingRequired.join(', ');
    throw new Error(
      `Your project needs more context before generating a ${template.name}. ` +
      `Please add: ${missingFields}. ` +
      `Go to your project settings to add this information.`
    );
  }

  // Build project context
  const projectContext = {
    name: project.name,
    description: project.description || undefined,
    stage: project.stage,
    metadata: project.metadata || undefined,
    milestones: project.milestones?.map((m) => ({
      title: m.title,
      isCompleted: m.isCompleted,
    })),
  };

  const systemPrompt = getSystemPrompt(projectContext);

  const sectionPrompts = template.sections
    .map((s, i) => `${i + 1}. ${s.title}: ${s.prompt}`)
    .join('\n');

  // Enhanced user prompt with explicit formatting instructions
  const userPrompt = `Generate content for the following sections:\n\n${sectionPrompts}\n\n` +
    `CRITICAL FORMATTING RULES:\n` +
    `- Return as JSON with a "sections" array\n` +
    `- Each section must have: id (string), title (string), content (STRING - plain text only)\n` +
    `- The "content" field must ALWAYS be a plain text string, NEVER an array or object\n` +
    `- For lists, use bullet points with "• " or numbered lists as plain text\n` +
    `- For features, format as: "• Feature Name: Description" on separate lines\n` +
    `- For Q&A/FAQ, format as: "Q: Question?\\nA: Answer" as plain text\n` +
    `- For steps, format as: "1. Step Name - Description" on separate lines\n\n` +
    `Make sure all content is specific to "${project.name}" and based on the provided context.`;

  // Generate content using AI
  const result = await generateStructuredOutput<GenerationResult>(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    {}
  );

  // Add order to sections
  const sectionsWithOrder = result.sections.map((section, index) => ({
    ...section,
    order: index,
  }));

  // Save document to database
  const document = await createDocument({
    userId,
    projectId,
    type: documentType,
    title: `${template.name} - ${project.name}`,
    content: {
      sections: sectionsWithOrder,
      metadata: {
        generatedAt: new Date().toISOString(),
        projectStage: project.stage,
      },
    },
  });

  // Log activity
  await createActivity({
    userId,
    projectId,
    type: 'document_generated',
    data: { documentType, documentId: document.id },
  });

  return {
    id: document.id,
    sections: sectionsWithOrder,
  };
}

export function getDocumentTemplate(documentType: DocumentType) {
  return TEMPLATES[documentType];
}

export function getDocumentRequirements(documentType: DocumentType) {
  return DOCUMENT_REQUIREMENTS[documentType];
}

export { checkProjectReadiness };
