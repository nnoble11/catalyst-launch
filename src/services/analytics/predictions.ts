import { generateStructuredOutput } from '@/lib/ai/openai';
import {
  getProjectsByUserId,
  getRecentActivities,
  getMilestonesByProjectId,
  getTasksByUserId,
} from '@/lib/db/queries';
import type { Project, Milestone, Activity } from '@/types';

interface MilestoneVelocity {
  averageDaysToComplete: number;
  recentTrend: 'accelerating' | 'stable' | 'slowing';
  completedThisMonth: number;
  completedLastMonth: number;
}

interface ProjectPrediction {
  projectId: string;
  projectName: string;
  currentProgress: number;
  estimatedCompletionDate: string | null;
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  recommendations: string[];
}

interface PredictionsResponse {
  milestoneVelocity: MilestoneVelocity;
  projectPredictions: ProjectPrediction[];
  focusAreas: string[];
  bottlenecks: string[];
}

function calculateMilestoneVelocity(
  milestones: Milestone[],
  activities: Activity[]
): MilestoneVelocity {
  const completedMilestones = milestones.filter((m) => m.isCompleted && m.completedAt);

  if (completedMilestones.length === 0) {
    return {
      averageDaysToComplete: 0,
      recentTrend: 'stable',
      completedThisMonth: 0,
      completedLastMonth: 0,
    };
  }

  // Calculate average days to complete
  const durations = completedMilestones.map((m) => {
    const start = m.createdAt;
    const end = m.completedAt!;
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  });

  const averageDaysToComplete =
    durations.reduce((a, b) => a + b, 0) / durations.length;

  // Count completions this month vs last month
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const completedThisMonth = completedMilestones.filter(
    (m) => m.completedAt! >= thisMonth
  ).length;

  const completedLastMonth = completedMilestones.filter(
    (m) => m.completedAt! >= lastMonth && m.completedAt! < thisMonth
  ).length;

  // Determine trend
  let recentTrend: MilestoneVelocity['recentTrend'] = 'stable';
  if (completedThisMonth > completedLastMonth * 1.5) {
    recentTrend = 'accelerating';
  } else if (completedThisMonth < completedLastMonth * 0.5) {
    recentTrend = 'slowing';
  }

  return {
    averageDaysToComplete: Math.round(averageDaysToComplete),
    recentTrend,
    completedThisMonth,
    completedLastMonth,
  };
}

function predictProjectCompletion(
  project: Project & { milestones?: Milestone[] },
  velocity: MilestoneVelocity
): ProjectPrediction {
  const milestones = project.milestones || [];
  const completed = milestones.filter((m) => m.isCompleted).length;
  const total = milestones.length;
  const currentProgress = total > 0 ? (completed / total) * 100 : 0;
  const remaining = total - completed;

  // Calculate estimated completion
  let estimatedCompletionDate: string | null = null;
  if (remaining > 0 && velocity.averageDaysToComplete > 0) {
    const daysRemaining = remaining * velocity.averageDaysToComplete;
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + daysRemaining);
    estimatedCompletionDate = completionDate.toISOString().split('T')[0];
  } else if (remaining === 0) {
    estimatedCompletionDate = 'Complete';
  }

  // Assess risk
  const riskFactors: string[] = [];
  let riskScore = 0;

  // Check for stalled progress
  if (velocity.recentTrend === 'slowing') {
    riskFactors.push('Velocity is slowing down');
    riskScore += 2;
  }

  // Check for overdue milestones
  const overdueMilestones = milestones.filter(
    (m) => !m.isCompleted && m.dueDate && new Date(m.dueDate) < new Date()
  );
  if (overdueMilestones.length > 0) {
    riskFactors.push(`${overdueMilestones.length} overdue milestone(s)`);
    riskScore += overdueMilestones.length;
  }

  // Check progress rate
  if (currentProgress < 30 && total > 0) {
    riskFactors.push('Early stage with limited progress');
    riskScore += 1;
  }

  const riskLevel: ProjectPrediction['riskLevel'] =
    riskScore >= 3 ? 'high' : riskScore >= 1 ? 'medium' : 'low';

  // Generate recommendations
  const recommendations: string[] = [];
  if (velocity.recentTrend === 'slowing') {
    recommendations.push('Review blockers and consider breaking down large milestones');
  }
  if (overdueMilestones.length > 0) {
    recommendations.push('Prioritize completing overdue milestones');
  }
  if (remaining > 5) {
    recommendations.push('Focus on the next 2-3 milestones to maintain momentum');
  }

  return {
    projectId: project.id,
    projectName: project.name,
    currentProgress: Math.round(currentProgress),
    estimatedCompletionDate,
    riskLevel,
    riskFactors,
    recommendations,
  };
}

export async function generatePredictions(userId: string): Promise<PredictionsResponse> {
  const projects = await getProjectsByUserId(userId);
  const activities = await getRecentActivities(userId, undefined, 60);
  const tasks = await getTasksByUserId(userId);

  // Collect all milestones
  const allMilestones: Milestone[] = [];
  for (const project of projects) {
    const milestones = await getMilestonesByProjectId(project.id);
    allMilestones.push(...milestones);
  }

  // Calculate velocity
  const velocity = calculateMilestoneVelocity(allMilestones, activities);

  // Generate predictions for each active project
  const activeProjects = projects.filter((p) => p.isActive);
  const projectPredictions: ProjectPrediction[] = [];

  for (const project of activeProjects) {
    const milestones = await getMilestonesByProjectId(project.id);
    const prediction = predictProjectCompletion({ ...project, milestones }, velocity);
    projectPredictions.push(prediction);
  }

  // Identify focus areas and bottlenecks
  const focusAreas: string[] = [];
  const bottlenecks: string[] = [];

  // High-risk projects need attention
  const highRiskProjects = projectPredictions.filter((p) => p.riskLevel === 'high');
  if (highRiskProjects.length > 0) {
    focusAreas.push(`Address high-risk projects: ${highRiskProjects.map((p) => p.projectName).join(', ')}`);
  }

  // Overdue tasks
  const overdueTasks = tasks.filter(
    (t) => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()
  );
  if (overdueTasks.length > 0) {
    bottlenecks.push(`${overdueTasks.length} overdue task(s) need attention`);
  }

  // Velocity trend
  if (velocity.recentTrend === 'slowing') {
    bottlenecks.push('Overall velocity is decreasing');
    focusAreas.push('Identify and remove blockers to restore momentum');
  } else if (velocity.recentTrend === 'accelerating') {
    focusAreas.push('Maintain current momentum and pace');
  }

  // Tasks in progress
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  if (inProgressTasks.length > 3) {
    bottlenecks.push('Too many tasks in progress at once - consider focusing');
    focusAreas.push('Complete current work before starting new tasks');
  }

  return {
    milestoneVelocity: velocity,
    projectPredictions,
    focusAreas,
    bottlenecks,
  };
}

export async function getAiInsights(
  userId: string,
  predictions: PredictionsResponse
): Promise<string[]> {
  try {
    const result = await generateStructuredOutput<{ insights: string[] }>(
      [
        {
          role: 'system',
          content: `You are an AI analytics assistant providing insights about a founder's progress.
Generate 3-5 actionable insights based on the data. Be specific and constructive.`,
        },
        {
          role: 'user',
          content: `Analyze this data and provide insights:

Milestone Velocity:
- Average days to complete: ${predictions.milestoneVelocity.averageDaysToComplete}
- Trend: ${predictions.milestoneVelocity.recentTrend}
- Completed this month: ${predictions.milestoneVelocity.completedThisMonth}
- Completed last month: ${predictions.milestoneVelocity.completedLastMonth}

Projects:
${predictions.projectPredictions.map((p) => `- ${p.projectName}: ${p.currentProgress}% complete, ${p.riskLevel} risk`).join('\n')}

Known Bottlenecks:
${predictions.bottlenecks.join('\n') || 'None identified'}

Return JSON with key: insights (array of 3-5 insight strings)`,
        },
      ],
      {}
    );

    return result.insights;
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return ['Continue making steady progress on your milestones'];
  }
}
