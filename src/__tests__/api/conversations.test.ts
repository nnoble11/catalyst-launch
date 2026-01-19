import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/conversations/route';

// Mock auth
const mockRequireAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  requireAuth: () => mockRequireAuth(),
  AuthError: class AuthError extends Error {
    constructor(message = 'Unauthorized') {
      super(message);
      this.name = 'AuthError';
    }
  },
}));

// Mock database queries
const mockGetConversationsByUserId = vi.fn();
const mockCreateConversation = vi.fn();

vi.mock('@/lib/db/queries', () => ({
  getConversationsByUserId: (userId: string, projectId?: string) =>
    mockGetConversationsByUserId(userId, projectId),
  createConversation: (data: unknown) => mockCreateConversation(data),
}));

describe('GET /api/conversations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all conversations for user', async () => {
    const mockUser = { id: 'user_123' };
    const mockConversations = [
      { id: 'conv_1', title: 'Conversation 1' },
      { id: 'conv_2', title: 'Conversation 2' },
    ];

    mockRequireAuth.mockResolvedValue(mockUser);
    mockGetConversationsByUserId.mockResolvedValue(mockConversations);

    const request = new NextRequest('http://localhost/api/conversations');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockConversations);
    expect(mockGetConversationsByUserId).toHaveBeenCalledWith('user_123', undefined);
  });

  it('should filter by projectId when provided', async () => {
    const mockUser = { id: 'user_123' };
    const mockConversations = [{ id: 'conv_1', title: 'Project Conversation', projectId: 'proj_1' }];

    mockRequireAuth.mockResolvedValue(mockUser);
    mockGetConversationsByUserId.mockResolvedValue(mockConversations);

    const request = new NextRequest('http://localhost/api/conversations?projectId=proj_1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockGetConversationsByUserId).toHaveBeenCalledWith('user_123', 'proj_1');
  });

  it('should return 401 when not authenticated', async () => {
    const AuthError = (await import('@/lib/auth')).AuthError;
    mockRequireAuth.mockRejectedValue(new AuthError());

    const request = new NextRequest('http://localhost/api/conversations');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it('should return empty array when no conversations', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'user_123' });
    mockGetConversationsByUserId.mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/conversations');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual([]);
  });
});

describe('POST /api/conversations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new conversation', async () => {
    const mockUser = { id: 'user_123' };
    const mockConversation = {
      id: 'conv_new',
      userId: 'user_123',
      title: 'New Conversation',
    };

    mockRequireAuth.mockResolvedValue(mockUser);
    mockCreateConversation.mockResolvedValue(mockConversation);

    const request = new NextRequest('http://localhost/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Conversation' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockConversation);
  });

  it('should use default title when not provided', async () => {
    const mockUser = { id: 'user_123' };
    mockRequireAuth.mockResolvedValue(mockUser);
    mockCreateConversation.mockResolvedValue({ id: 'conv_new', title: 'New Conversation' });

    const request = new NextRequest('http://localhost/api/conversations', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    await POST(request);

    expect(mockCreateConversation).toHaveBeenCalledWith({
      userId: 'user_123',
      projectId: undefined,
      title: 'New Conversation',
    });
  });

  it('should create conversation with projectId', async () => {
    const mockUser = { id: 'user_123' };
    mockRequireAuth.mockResolvedValue(mockUser);
    mockCreateConversation.mockResolvedValue({ id: 'conv_new' });

    const request = new NextRequest('http://localhost/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ projectId: 'proj_123', title: 'Project Chat' }),
    });

    await POST(request);

    expect(mockCreateConversation).toHaveBeenCalledWith({
      userId: 'user_123',
      projectId: 'proj_123',
      title: 'Project Chat',
    });
  });

  it('should return 401 when not authenticated', async () => {
    const AuthError = (await import('@/lib/auth')).AuthError;
    mockRequireAuth.mockRejectedValue(new AuthError());

    const request = new NextRequest('http://localhost/api/conversations', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });
});
