import { createNotification } from '@/lib/db/queries';
import type { NotificationType } from '@/types';

interface SendNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  actionUrl?: string;
}

export async function sendNotification({
  userId,
  title,
  message,
  type = 'info',
  actionUrl,
}: SendNotificationParams) {
  return createNotification({
    userId,
    title,
    message,
    type,
    actionUrl,
  });
}

export async function sendMilestoneCompletedNotification(
  userId: string,
  milestoneName: string,
  projectId: string
) {
  return sendNotification({
    userId,
    title: 'Milestone Completed!',
    message: `Congratulations! You completed "${milestoneName}". Keep up the great work!`,
    type: 'success',
    actionUrl: `/projects/${projectId}`,
  });
}

export async function sendDailyCheckInReminder(
  userId: string,
  personalizedMessage?: string
) {
  return sendNotification({
    userId,
    title: 'Daily Check-In',
    message: personalizedMessage || "Time for your daily check-in! Let's review your progress and plan today's tasks.",
    type: 'reminder',
    actionUrl: '/chat',
  });
}

export async function sendStallWarning(
  userId: string,
  projectId: string,
  projectName: string
) {
  return sendNotification({
    userId,
    title: 'Project Needs Attention',
    message: `Your project "${projectName}" hasn't had activity recently. Would you like to chat about what's blocking you?`,
    type: 'warning',
    actionUrl: `/projects/${projectId}`,
  });
}

export async function sendDocumentReadyNotification(
  userId: string,
  documentType: string,
  projectId: string
) {
  return sendNotification({
    userId,
    title: 'Document Ready',
    message: `Your ${documentType} has been generated and is ready for review.`,
    type: 'success',
    actionUrl: `/documents?projectId=${projectId}`,
  });
}

export async function sendSuggestion(
  userId: string,
  suggestion: string,
  actionUrl?: string
) {
  return sendNotification({
    userId,
    title: 'AI Suggestion',
    message: suggestion,
    type: 'suggestion',
    actionUrl,
  });
}
