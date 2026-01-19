import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sendNotification,
  sendMilestoneCompletedNotification,
  sendDailyCheckInReminder,
  sendStallWarning,
  sendDocumentReadyNotification,
  sendSuggestion,
} from '@/services/notifications/sender';

// Mock database queries
const mockCreateNotification = vi.fn();

vi.mock('@/lib/db/queries', () => ({
  createNotification: (data: unknown) => mockCreateNotification(data),
}));

describe('Notification Sender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateNotification.mockResolvedValue({ id: 'notification_123' });
  });

  describe('sendNotification', () => {
    it('should create notification with required fields and default type', async () => {
      await sendNotification({
        userId: 'user_123',
        title: 'Test Title',
        message: 'Test Message',
      });

      expect(mockCreateNotification).toHaveBeenCalledWith({
        userId: 'user_123',
        title: 'Test Title',
        message: 'Test Message',
        type: 'info',
        actionUrl: undefined,
      });
    });

    it('should create notification with all fields', async () => {
      await sendNotification({
        userId: 'user_123',
        title: 'Test Title',
        message: 'Test Message',
        type: 'success',
        actionUrl: '/projects/123',
      });

      expect(mockCreateNotification).toHaveBeenCalledWith({
        userId: 'user_123',
        title: 'Test Title',
        message: 'Test Message',
        type: 'success',
        actionUrl: '/projects/123',
      });
    });

    it('should return the created notification', async () => {
      const mockNotification = { id: 'n_123', title: 'Test' };
      mockCreateNotification.mockResolvedValue(mockNotification);

      const result = await sendNotification({
        userId: 'user_123',
        title: 'Test',
        message: 'Message',
      });

      expect(result).toEqual(mockNotification);
    });
  });

  describe('sendMilestoneCompletedNotification', () => {
    it('should send success notification with correct message', async () => {
      await sendMilestoneCompletedNotification('user_123', 'Build MVP', 'proj_123');

      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          type: 'success',
          actionUrl: '/projects/proj_123',
        })
      );

      const callArgs = mockCreateNotification.mock.calls[0][0];
      expect(callArgs.title).toBe('Milestone Completed!');
      expect(callArgs.message).toContain('Congratulations');
      expect(callArgs.message).toContain('Build MVP');
    });
  });

  describe('sendDailyCheckInReminder', () => {
    it('should send reminder notification', async () => {
      await sendDailyCheckInReminder('user_123');

      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          type: 'reminder',
          actionUrl: '/chat',
        })
      );

      const callArgs = mockCreateNotification.mock.calls[0][0];
      expect(callArgs.title).toBe('Daily Check-In');
      expect(callArgs.message).toContain('daily check-in');
    });
  });

  describe('sendStallWarning', () => {
    it('should send warning notification with project info', async () => {
      await sendStallWarning('user_123', 'proj_123', 'My Startup');

      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          type: 'warning',
          actionUrl: '/projects/proj_123',
        })
      );

      const callArgs = mockCreateNotification.mock.calls[0][0];
      expect(callArgs.message).toContain('My Startup');
      expect(callArgs.message).toContain('activity');
    });
  });

  describe('sendDocumentReadyNotification', () => {
    it('should send success notification for pitch deck', async () => {
      await sendDocumentReadyNotification('user_123', 'pitch-deck', 'proj_123');

      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          type: 'success',
          actionUrl: '/documents?projectId=proj_123',
        })
      );

      const callArgs = mockCreateNotification.mock.calls[0][0];
      expect(callArgs.message).toContain('pitch-deck');
    });

    it('should send success notification for PRD', async () => {
      await sendDocumentReadyNotification('user_123', 'prd', 'proj_456');

      const callArgs = mockCreateNotification.mock.calls[0][0];
      expect(callArgs.message).toContain('prd');
      expect(callArgs.actionUrl).toBe('/documents?projectId=proj_456');
    });
  });

  describe('sendSuggestion', () => {
    it('should send suggestion notification without actionUrl', async () => {
      await sendSuggestion('user_123', 'Try adding user interviews');

      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          type: 'suggestion',
          message: 'Try adding user interviews',
          actionUrl: undefined,
        })
      );
    });

    it('should send suggestion notification with actionUrl', async () => {
      await sendSuggestion('user_123', 'Check your milestones', '/projects/123');

      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          type: 'suggestion',
          actionUrl: '/projects/123',
        })
      );
    });
  });
});
