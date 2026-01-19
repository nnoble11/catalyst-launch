import { vi } from 'vitest';

// Mock user
export const mockUser = {
  id: 'user_123',
  clerkId: 'test_clerk_id',
  email: 'test@example.com',
  name: 'Test User',
  avatarUrl: 'https://example.com/avatar.jpg',
  onboardingCompleted: false,
  preferences: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock project
export const mockProject = {
  id: 'project_123',
  userId: 'user_123',
  name: 'Test Project',
  description: 'A test project description',
  stage: 'ideation' as const,
  isActive: true,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  milestones: [],
};

// Mock milestone
export const mockMilestone = {
  id: 'milestone_123',
  projectId: 'project_123',
  title: 'Test Milestone',
  description: 'A test milestone',
  isCompleted: false,
  completedAt: null,
  dueDate: null,
  order: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock conversation
export const mockConversation = {
  id: 'conversation_123',
  userId: 'user_123',
  projectId: 'project_123',
  title: 'Test Conversation',
  summary: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  messages: [],
};

// Mock message
export const mockMessage = {
  id: 'message_123',
  conversationId: 'conversation_123',
  role: 'user' as const,
  content: 'Test message content',
  metadata: null,
  createdAt: new Date(),
};

// Mock notification
export const mockNotification = {
  id: 'notification_123',
  userId: 'user_123',
  title: 'Test Notification',
  message: 'Test notification message',
  type: 'info' as const,
  isRead: false,
  actionUrl: null,
  createdAt: new Date(),
};

// Mock document
export const mockDocument = {
  id: 'document_123',
  userId: 'user_123',
  projectId: 'project_123',
  type: 'pitch-deck' as const,
  title: 'Test Pitch Deck',
  content: { sections: [] },
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock activity
export const mockActivity = {
  id: 'activity_123',
  userId: 'user_123',
  projectId: 'project_123',
  type: 'project_created' as const,
  data: {},
  createdAt: new Date(),
};

// Mock idea
export const mockIdea = {
  id: 'idea_123',
  userId: 'user_123',
  title: 'Test Idea',
  description: 'Test idea description',
  votes: 0,
  createdAt: new Date(),
};

// Mock query functions
export const mockQueries = {
  // User queries
  getUserByClerkId: vi.fn().mockResolvedValue(mockUser),
  createUser: vi.fn().mockResolvedValue(mockUser),
  updateUser: vi.fn().mockResolvedValue(mockUser),

  // Project queries
  getProjectsByUserId: vi.fn().mockResolvedValue([mockProject]),
  getProjectById: vi.fn().mockResolvedValue(mockProject),
  createProject: vi.fn().mockResolvedValue(mockProject),
  updateProject: vi.fn().mockResolvedValue(mockProject),
  deleteProject: vi.fn().mockResolvedValue(undefined),

  // Milestone queries
  getMilestonesByProjectId: vi.fn().mockResolvedValue([mockMilestone]),
  createMilestone: vi.fn().mockResolvedValue(mockMilestone),
  createMilestones: vi.fn().mockResolvedValue([mockMilestone]),
  updateMilestone: vi.fn().mockResolvedValue(mockMilestone),
  deleteMilestone: vi.fn().mockResolvedValue(undefined),

  // Conversation queries
  getConversationsByUserId: vi.fn().mockResolvedValue([mockConversation]),
  getConversationById: vi.fn().mockResolvedValue(mockConversation),
  createConversation: vi.fn().mockResolvedValue(mockConversation),
  updateConversation: vi.fn().mockResolvedValue(mockConversation),

  // Message queries
  getMessagesByConversationId: vi.fn().mockResolvedValue([mockMessage]),
  createMessage: vi.fn().mockResolvedValue(mockMessage),

  // Activity queries
  getActivitiesByUserId: vi.fn().mockResolvedValue([mockActivity]),
  getRecentActivities: vi.fn().mockResolvedValue([mockActivity]),
  createActivity: vi.fn().mockResolvedValue(mockActivity),

  // Document queries
  getDocumentsByProjectId: vi.fn().mockResolvedValue([mockDocument]),
  getDocumentById: vi.fn().mockResolvedValue(mockDocument),
  createDocument: vi.fn().mockResolvedValue(mockDocument),
  updateDocument: vi.fn().mockResolvedValue(mockDocument),

  // Notification queries
  getNotificationsByUserId: vi.fn().mockResolvedValue([mockNotification]),
  createNotification: vi.fn().mockResolvedValue(mockNotification),
  markNotificationAsRead: vi.fn().mockResolvedValue(mockNotification),
  markAllNotificationsAsRead: vi.fn().mockResolvedValue(undefined),

  // Integration queries
  getIntegrationsByUserId: vi.fn().mockResolvedValue([]),
  getIntegrationByProvider: vi.fn().mockResolvedValue(null),
  upsertIntegration: vi.fn().mockResolvedValue({}),
  deleteIntegration: vi.fn().mockResolvedValue(undefined),

  // Idea queries
  getIdeasLeaderboard: vi.fn().mockResolvedValue([mockIdea]),
  createIdea: vi.fn().mockResolvedValue(mockIdea),
  upvoteIdea: vi.fn().mockResolvedValue({ ...mockIdea, votes: 1 }),
};

// Export mock for vi.mock
export default mockQueries;
