import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/ideas/route';
import { GET, POST as POSTLeaderboard } from '@/app/api/ideas/leaderboard/route';

// Mock Clerk auth
const mockAuth = vi.fn();
vi.mock('@clerk/nextjs/server', () => ({
  auth: () => mockAuth(),
}));

// Mock database queries
const mockGetUserByClerkId = vi.fn();
const mockCreateIdea = vi.fn();
const mockCreateActivity = vi.fn();
const mockGetIdeasLeaderboard = vi.fn();
const mockUpvoteIdea = vi.fn();

vi.mock('@/lib/db/queries', () => ({
  getUserByClerkId: (clerkId: string) => mockGetUserByClerkId(clerkId),
  createIdea: (data: unknown) => mockCreateIdea(data),
  createActivity: (data: unknown) => mockCreateActivity(data),
  getIdeasLeaderboard: (limit?: number) => mockGetIdeasLeaderboard(limit),
  upvoteIdea: (ideaId: string) => mockUpvoteIdea(ideaId),
}));

describe('POST /api/ideas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create idea for authenticated user', async () => {
    const mockUser = { id: 'user_123' };
    const mockIdea = { id: 'idea_1', title: 'Great Idea', description: 'Description', userId: 'user_123' };

    mockAuth.mockResolvedValue({ userId: 'clerk_123' });
    mockGetUserByClerkId.mockResolvedValue(mockUser);
    mockCreateIdea.mockResolvedValue(mockIdea);
    mockCreateActivity.mockResolvedValue({});

    const request = new NextRequest('http://localhost/api/ideas', {
      method: 'POST',
      body: JSON.stringify({ title: 'Great Idea', description: 'Description' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockIdea);
    expect(mockCreateIdea).toHaveBeenCalledWith({
      userId: 'user_123',
      title: 'Great Idea',
      description: 'Description',
    });
    expect(mockCreateActivity).toHaveBeenCalledWith({
      userId: 'user_123',
      type: 'idea_submitted',
      data: { ideaId: 'idea_1', title: 'Great Idea' },
    });
  });

  it('should create idea for anonymous user', async () => {
    const mockIdea = { id: 'idea_1', title: 'Anonymous Idea', description: 'Description', userId: null };

    mockAuth.mockResolvedValue({ userId: null });
    mockCreateIdea.mockResolvedValue(mockIdea);

    const request = new NextRequest('http://localhost/api/ideas', {
      method: 'POST',
      body: JSON.stringify({ title: 'Anonymous Idea', description: 'Description' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(mockCreateIdea).toHaveBeenCalledWith({
      userId: undefined,
      title: 'Anonymous Idea',
      description: 'Description',
    });
    expect(mockCreateActivity).not.toHaveBeenCalled();
  });

  it('should return 400 when title is missing', async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const request = new NextRequest('http://localhost/api/ideas', {
      method: 'POST',
      body: JSON.stringify({ description: 'Description only' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Title and description are required');
  });

  it('should return 400 when description is missing', async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const request = new NextRequest('http://localhost/api/ideas', {
      method: 'POST',
      body: JSON.stringify({ title: 'Title only' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Title and description are required');
  });
});

describe('GET /api/ideas/leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return ideas sorted by votes', async () => {
    const mockIdeas = [
      { id: 'idea_1', title: 'Top Idea', votes: 100 },
      { id: 'idea_2', title: 'Second Idea', votes: 50 },
    ];

    mockGetIdeasLeaderboard.mockResolvedValue(mockIdeas);

    const request = new NextRequest('http://localhost/api/ideas/leaderboard');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockIdeas);
  });

  it('should respect limit parameter', async () => {
    mockGetIdeasLeaderboard.mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/ideas/leaderboard?limit=10');
    await GET(request);

    expect(mockGetIdeasLeaderboard).toHaveBeenCalledWith(10);
  });

  it('should use default limit of 50', async () => {
    mockGetIdeasLeaderboard.mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/ideas/leaderboard');
    await GET(request);

    expect(mockGetIdeasLeaderboard).toHaveBeenCalledWith(50);
  });
});

describe('POST /api/ideas/leaderboard (upvote)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should upvote an idea', async () => {
    const mockIdea = { id: 'idea_1', title: 'Great Idea', votes: 11 };
    mockUpvoteIdea.mockResolvedValue(mockIdea);

    const request = new NextRequest('http://localhost/api/ideas/leaderboard', {
      method: 'POST',
      body: JSON.stringify({ ideaId: 'idea_1' }),
    });

    const response = await POSTLeaderboard(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockIdea);
    expect(mockUpvoteIdea).toHaveBeenCalledWith('idea_1');
  });

  it('should return 400 when ideaId is missing', async () => {
    const request = new NextRequest('http://localhost/api/ideas/leaderboard', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POSTLeaderboard(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Idea ID is required');
  });

  it('should return 404 when idea not found', async () => {
    mockUpvoteIdea.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/ideas/leaderboard', {
      method: 'POST',
      body: JSON.stringify({ ideaId: 'nonexistent' }),
    });

    const response = await POSTLeaderboard(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Idea not found');
  });
});
