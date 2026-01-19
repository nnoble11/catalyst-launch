import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PATCH } from '@/app/api/notifications/route';

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
const mockGetNotificationsByUserId = vi.fn();
const mockCreateNotification = vi.fn();
const mockMarkAllNotificationsAsRead = vi.fn();

vi.mock('@/lib/db/queries', () => ({
  getNotificationsByUserId: (userId: string, unreadOnly?: boolean) =>
    mockGetNotificationsByUserId(userId, unreadOnly),
  createNotification: (data: unknown) => mockCreateNotification(data),
  markAllNotificationsAsRead: (userId: string) => mockMarkAllNotificationsAsRead(userId),
}));

describe('GET /api/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all notifications', async () => {
    const mockUser = { id: 'user_123' };
    const mockNotifications = [
      { id: 'n1', title: 'Notification 1', isRead: false },
      { id: 'n2', title: 'Notification 2', isRead: true },
    ];

    mockRequireAuth.mockResolvedValue(mockUser);
    mockGetNotificationsByUserId.mockResolvedValue(mockNotifications);

    const request = new NextRequest('http://localhost/api/notifications');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockNotifications);
  });

  it('should filter unread only when specified', async () => {
    const mockUser = { id: 'user_123' };
    mockRequireAuth.mockResolvedValue(mockUser);
    mockGetNotificationsByUserId.mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/notifications?unreadOnly=true');
    await GET(request);

    expect(mockGetNotificationsByUserId).toHaveBeenCalledWith('user_123', true);
  });

  it('should return 401 when not authenticated', async () => {
    const AuthError = (await import('@/lib/auth')).AuthError;
    mockRequireAuth.mockRejectedValue(new AuthError());

    const request = new NextRequest('http://localhost/api/notifications');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });
});

describe('POST /api/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a notification', async () => {
    const mockUser = { id: 'user_123' };
    const mockNotification = {
      id: 'n_new',
      title: 'New Notification',
      message: 'This is a test',
      type: 'info',
    };

    mockRequireAuth.mockResolvedValue(mockUser);
    mockCreateNotification.mockResolvedValue(mockNotification);

    const request = new NextRequest('http://localhost/api/notifications', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Notification', message: 'This is a test' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockNotification);
  });

  it('should use default type "info" when not provided', async () => {
    const mockUser = { id: 'user_123' };
    mockRequireAuth.mockResolvedValue(mockUser);
    mockCreateNotification.mockResolvedValue({ id: 'n_new' });

    const request = new NextRequest('http://localhost/api/notifications', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', message: 'Test message' }),
    });

    await POST(request);

    expect(mockCreateNotification).toHaveBeenCalledWith({
      userId: 'user_123',
      title: 'Test',
      message: 'Test message',
      type: 'info',
      actionUrl: undefined,
    });
  });

  it('should return 400 when title is missing', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'user_123' });

    const request = new NextRequest('http://localhost/api/notifications', {
      method: 'POST',
      body: JSON.stringify({ message: 'Test message' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Title and message are required');
  });

  it('should return 400 when message is missing', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'user_123' });

    const request = new NextRequest('http://localhost/api/notifications', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Title and message are required');
  });

  it('should create notification with custom type and actionUrl', async () => {
    const mockUser = { id: 'user_123' };
    mockRequireAuth.mockResolvedValue(mockUser);
    mockCreateNotification.mockResolvedValue({ id: 'n_new' });

    const request = new NextRequest('http://localhost/api/notifications', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Success!',
        message: 'Task completed',
        type: 'success',
        actionUrl: '/projects/123',
      }),
    });

    await POST(request);

    expect(mockCreateNotification).toHaveBeenCalledWith({
      userId: 'user_123',
      title: 'Success!',
      message: 'Task completed',
      type: 'success',
      actionUrl: '/projects/123',
    });
  });
});

describe('PATCH /api/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should mark all notifications as read', async () => {
    const mockUser = { id: 'user_123' };
    mockRequireAuth.mockResolvedValue(mockUser);
    mockMarkAllNotificationsAsRead.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost/api/notifications?action=markAllRead', {
      method: 'PATCH',
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockMarkAllNotificationsAsRead).toHaveBeenCalledWith('user_123');
  });

  it('should return 400 for invalid action', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'user_123' });

    const request = new NextRequest('http://localhost/api/notifications?action=invalidAction', {
      method: 'PATCH',
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid action');
  });

  it('should return 401 when not authenticated', async () => {
    const AuthError = (await import('@/lib/auth')).AuthError;
    mockRequireAuth.mockRejectedValue(new AuthError());

    const request = new NextRequest('http://localhost/api/notifications?action=markAllRead', {
      method: 'PATCH',
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });
});
