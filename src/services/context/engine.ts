import {
  getRecentActivities,
  getProjectById,
  getMilestonesByProjectId,
  getConversationById,
  getMessagesByConversationId,
} from '@/lib/db/queries';
import type { UserContext, ContextPattern, Activity, Milestone } from '@/types';

export async function buildUserContext(
  userId: string,
  projectId?: string
): Promise<UserContext> {
  // Get recent activities
  const recentActivity = await getRecentActivities(userId, projectId, 7);

  // Get current project if specified
  let currentProject = null;
  let projectMilestones: Milestone[] = [];

  if (projectId) {
    const project = await getProjectById(projectId);
    if (project && project.userId === userId) {
      currentProject = {
        id: project.id,
        userId: project.userId,
        name: project.name,
        description: project.description,
        stage: project.stage,
        isActive: project.isActive,
        metadata: project.metadata,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      };
      projectMilestones = project.milestones.map((m) => ({
        id: m.id,
        projectId: m.projectId,
        title: m.title,
        description: m.description,
        isCompleted: m.isCompleted,
        completedAt: m.completedAt,
        dueDate: m.dueDate,
        order: m.order,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      }));
    }
  }

  // Detect patterns
  const patterns = detectPatterns(recentActivity, projectMilestones);

  return {
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      userId: a.userId,
      projectId: a.projectId,
      type: a.type,
      data: a.data,
      createdAt: a.createdAt,
    })),
    currentProject,
    projectMilestones,
    conversationHistory: [],
    patterns,
  };
}

function detectPatterns(
  activities: Activity[],
  milestones: Milestone[]
): ContextPattern[] {
  const patterns: ContextPattern[] = [];

  // Check for inactivity
  if (activities.length === 0) {
    patterns.push({
      type: 'inactive',
      description: 'No recent activity detected in the past week',
      confidence: 0.9,
      suggestedAction: 'Consider scheduling a check-in to review progress',
    });
  }

  // Check for stall (no milestone progress)
  const recentMilestoneCompletions = activities.filter(
    (a) => a.type === 'milestone_completed'
  );
  if (milestones.length > 0 && recentMilestoneCompletions.length === 0) {
    const pendingMilestones = milestones.filter((m) => !m.isCompleted);
    if (pendingMilestones.length > 0) {
      patterns.push({
        type: 'stall',
        description: 'No milestones completed recently',
        confidence: 0.7,
        suggestedAction: `Focus on completing: ${pendingMilestones[0].title}`,
      });
    }
  }

  // Check for momentum (multiple activities)
  if (activities.length >= 5) {
    patterns.push({
      type: 'momentum',
      description: 'Good activity level maintained',
      confidence: 0.8,
      suggestedAction: 'Keep up the momentum!',
    });
  }

  // Check for milestone near completion
  const completedCount = milestones.filter((m) => m.isCompleted).length;
  const completionRate = milestones.length > 0 ? completedCount / milestones.length : 0;
  if (completionRate >= 0.8 && completionRate < 1) {
    patterns.push({
      type: 'milestone_near',
      description: 'Close to completing all milestones',
      confidence: 0.9,
      suggestedAction: 'Push to finish remaining milestones',
    });
  }

  return patterns;
}

export async function getConversationContext(
  conversationId: string,
  limit = 10
) {
  const conversation = await getConversationById(conversationId);
  if (!conversation) return null;

  const messages = await getMessagesByConversationId(conversationId, limit);

  return {
    conversation,
    messages,
  };
}
