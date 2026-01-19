import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database client
const mockFindFirst = vi.fn();
const mockFindMany = vi.fn();

const mockReturning = vi.fn();
const mockValues = vi.fn(() => ({ returning: mockReturning }));
const mockSet = vi.fn(() => ({ where: vi.fn(() => ({ returning: mockReturning })) }));
const mockWhere = vi.fn(() => ({ returning: mockReturning }));

vi.mock('@/lib/db/client', () => ({
  db: {
    query: {
      users: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
      projects: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
        findMany: (...args: unknown[]) => mockFindMany(...args),
      },
      milestones: { findMany: (...args: unknown[]) => mockFindMany(...args) },
      conversations: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
        findMany: (...args: unknown[]) => mockFindMany(...args),
      },
      messages: { findMany: (...args: unknown[]) => mockFindMany(...args) },
      activities: { findMany: (...args: unknown[]) => mockFindMany(...args) },
      documents: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
        findMany: (...args: unknown[]) => mockFindMany(...args),
      },
      notifications: { findMany: (...args: unknown[]) => mockFindMany(...args) },
      integrations: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
        findMany: (...args: unknown[]) => mockFindMany(...args),
      },
      ideas: { findMany: (...args: unknown[]) => mockFindMany(...args) },
    },
    insert: () => ({ values: mockValues }),
    update: () => ({ set: mockSet }),
    delete: () => ({ where: mockWhere }),
  },
}));

// Import after mocking
import {
  getUserByClerkId,
  createUser,
  getProjectsByUserId,
  createProject,
  getMilestonesByProjectId,
  createMilestone,
  getConversationsByUserId,
  createConversation,
  getMessagesByConversationId,
  createMessage,
  createActivity,
  getNotificationsByUserId,
  createNotification,
  getIdeasLeaderboard,
  createIdea,
} from '@/lib/db/queries';

describe('User Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserByClerkId', () => {
    it('should return user when found', async () => {
      const mockUser = { id: 'user_123', clerkId: 'clerk_123', email: 'test@example.com' };
      mockFindFirst.mockResolvedValue(mockUser);

      const result = await getUserByClerkId('clerk_123');

      expect(result).toEqual(mockUser);
      expect(mockFindFirst).toHaveBeenCalled();
    });

    it('should return undefined when user not found', async () => {
      mockFindFirst.mockResolvedValue(undefined);

      const result = await getUserByClerkId('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('createUser', () => {
    it('should create and return user', async () => {
      const mockUser = { id: 'user_new', clerkId: 'clerk_123', email: 'test@example.com' };
      mockReturning.mockResolvedValue([mockUser]);

      const result = await createUser({
        clerkId: 'clerk_123',
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(result).toEqual(mockUser);
      expect(mockValues).toHaveBeenCalled();
    });
  });
});

describe('Project Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProjectsByUserId', () => {
    it('should return projects with milestones', async () => {
      const mockProjects = [
        { id: 'proj_1', name: 'Project 1', milestones: [] },
        { id: 'proj_2', name: 'Project 2', milestones: [] },
      ];
      mockFindMany.mockResolvedValue(mockProjects);

      const result = await getProjectsByUserId('user_123');

      expect(result).toEqual(mockProjects);
      expect(mockFindMany).toHaveBeenCalled();
    });

    it('should return empty array when no projects', async () => {
      mockFindMany.mockResolvedValue([]);

      const result = await getProjectsByUserId('user_123');

      expect(result).toEqual([]);
    });
  });

  describe('createProject', () => {
    it('should create and return project', async () => {
      const mockProject = { id: 'proj_new', name: 'New Project', stage: 'ideation' };
      mockReturning.mockResolvedValue([mockProject]);

      const result = await createProject({
        userId: 'user_123',
        name: 'New Project',
        stage: 'ideation',
      });

      expect(result).toEqual(mockProject);
    });
  });
});

describe('Milestone Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMilestonesByProjectId', () => {
    it('should return milestones ordered by order field', async () => {
      const mockMilestones = [
        { id: 'm1', title: 'First', order: 0 },
        { id: 'm2', title: 'Second', order: 1 },
      ];
      mockFindMany.mockResolvedValue(mockMilestones);

      const result = await getMilestonesByProjectId('proj_123');

      expect(result).toEqual(mockMilestones);
    });
  });

  describe('createMilestone', () => {
    it('should create and return milestone', async () => {
      const mockMilestone = { id: 'm_new', title: 'New Milestone', projectId: 'proj_123' };
      mockReturning.mockResolvedValue([mockMilestone]);

      const result = await createMilestone({
        projectId: 'proj_123',
        title: 'New Milestone',
      });

      expect(result).toEqual(mockMilestone);
    });
  });
});

describe('Conversation Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getConversationsByUserId', () => {
    it('should return conversations', async () => {
      const mockConversations = [
        { id: 'conv_1', title: 'Chat 1' },
        { id: 'conv_2', title: 'Chat 2' },
      ];
      mockFindMany.mockResolvedValue(mockConversations);

      const result = await getConversationsByUserId('user_123');

      expect(result).toEqual(mockConversations);
    });

    it('should filter by projectId when provided', async () => {
      mockFindMany.mockResolvedValue([]);

      await getConversationsByUserId('user_123', 'proj_123');

      expect(mockFindMany).toHaveBeenCalled();
    });
  });

  describe('createConversation', () => {
    it('should create conversation with default title', async () => {
      const mockConversation = { id: 'conv_new', title: 'New Conversation' };
      mockReturning.mockResolvedValue([mockConversation]);

      const result = await createConversation({
        userId: 'user_123',
        title: 'New Conversation',
      });

      expect(result).toEqual(mockConversation);
    });
  });
});

describe('Message Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMessagesByConversationId', () => {
    it('should return messages with default limit', async () => {
      const mockMessages = [
        { id: 'msg_1', content: 'Hello', role: 'user' },
        { id: 'msg_2', content: 'Hi there!', role: 'assistant' },
      ];
      mockFindMany.mockResolvedValue(mockMessages);

      const result = await getMessagesByConversationId('conv_123');

      expect(result).toEqual(mockMessages);
    });
  });

  describe('createMessage', () => {
    it('should create and return message', async () => {
      const mockMessage = { id: 'msg_new', content: 'Test', role: 'user' };
      mockReturning.mockResolvedValue([mockMessage]);

      const result = await createMessage({
        conversationId: 'conv_123',
        role: 'user',
        content: 'Test',
      });

      expect(result).toEqual(mockMessage);
    });
  });
});

describe('Activity Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createActivity', () => {
    it('should create and return activity', async () => {
      const mockActivity = { id: 'act_new', type: 'project_created' };
      mockReturning.mockResolvedValue([mockActivity]);

      const result = await createActivity({
        userId: 'user_123',
        type: 'project_created',
        data: { projectName: 'Test' },
      });

      expect(result).toEqual(mockActivity);
    });
  });
});

describe('Notification Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getNotificationsByUserId', () => {
    it('should return all notifications', async () => {
      const mockNotifications = [
        { id: 'n1', title: 'Notification 1', isRead: false },
        { id: 'n2', title: 'Notification 2', isRead: true },
      ];
      mockFindMany.mockResolvedValue(mockNotifications);

      const result = await getNotificationsByUserId('user_123');

      expect(result).toEqual(mockNotifications);
    });

    it('should filter unread only when specified', async () => {
      mockFindMany.mockResolvedValue([]);

      await getNotificationsByUserId('user_123', true);

      expect(mockFindMany).toHaveBeenCalled();
    });
  });

  describe('createNotification', () => {
    it('should create notification with all fields', async () => {
      const mockNotification = { id: 'n_new', title: 'Test', type: 'info' };
      mockReturning.mockResolvedValue([mockNotification]);

      const result = await createNotification({
        userId: 'user_123',
        title: 'Test',
        message: 'Test message',
        type: 'info',
      });

      expect(result).toEqual(mockNotification);
    });
  });
});

describe('Idea Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getIdeasLeaderboard', () => {
    it('should return ideas sorted by votes', async () => {
      const mockIdeas = [
        { id: 'idea_1', title: 'Top Idea', votes: 100 },
        { id: 'idea_2', title: 'Second', votes: 50 },
      ];
      mockFindMany.mockResolvedValue(mockIdeas);

      const result = await getIdeasLeaderboard();

      expect(result).toEqual(mockIdeas);
    });

    it('should respect limit parameter', async () => {
      mockFindMany.mockResolvedValue([]);

      await getIdeasLeaderboard(10);

      expect(mockFindMany).toHaveBeenCalled();
    });
  });

  describe('createIdea', () => {
    it('should create idea with userId', async () => {
      const mockIdea = { id: 'idea_new', title: 'New Idea', userId: 'user_123' };
      mockReturning.mockResolvedValue([mockIdea]);

      const result = await createIdea({
        userId: 'user_123',
        title: 'New Idea',
        description: 'Description',
      });

      expect(result).toEqual(mockIdea);
    });

    it('should create idea without userId (anonymous)', async () => {
      const mockIdea = { id: 'idea_new', title: 'Anonymous Idea', userId: null };
      mockReturning.mockResolvedValue([mockIdea]);

      const result = await createIdea({
        title: 'Anonymous Idea',
        description: 'Description',
      });

      expect(result).toEqual(mockIdea);
    });
  });
});
