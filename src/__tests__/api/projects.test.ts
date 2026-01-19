import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/projects/route';

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
const mockGetProjectsByUserId = vi.fn();
const mockCreateProject = vi.fn();
const mockCreateMilestones = vi.fn();
const mockCreateActivity = vi.fn();

vi.mock('@/lib/db/queries', () => ({
  getProjectsByUserId: () => mockGetProjectsByUserId(),
  createProject: (data: unknown) => mockCreateProject(data),
  createMilestones: (data: unknown) => mockCreateMilestones(data),
  createActivity: (data: unknown) => mockCreateActivity(data),
}));

// Mock constants
vi.mock('@/config/constants', () => ({
  DEFAULT_MILESTONES: {
    ideation: ['Define problem', 'Research market', 'Identify audience', 'Create value prop', 'Validate assumptions'],
    mvp: ['Core features', 'Tech stack', 'Build MVP', 'User testing', 'Iterate'],
    gtm: ['Pricing', 'Marketing', 'Sales', 'Launch', 'Metrics'],
  },
}));

describe('GET /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return projects for authenticated user', async () => {
    const mockUser = { id: 'user_123' };
    const mockProjects = [
      { id: 'proj_1', name: 'Project 1', stage: 'ideation' },
      { id: 'proj_2', name: 'Project 2', stage: 'mvp' },
    ];

    mockRequireAuth.mockResolvedValue(mockUser);
    mockGetProjectsByUserId.mockResolvedValue(mockProjects);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockProjects);
  });

  it('should return empty array when user has no projects', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'user_123' });
    mockGetProjectsByUserId.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual([]);
  });

  it('should return 401 when not authenticated', async () => {
    const AuthError = (await import('@/lib/auth')).AuthError;
    mockRequireAuth.mockRejectedValue(new AuthError());

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 500 on database error', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'user_123' });
    mockGetProjectsByUserId.mockRejectedValue(new Error('Database error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });
});

describe('POST /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a project with default milestones', async () => {
    const mockUser = { id: 'user_123' };
    const mockProject = { id: 'proj_new', name: 'New Project', stage: 'ideation' };

    mockRequireAuth.mockResolvedValue(mockUser);
    mockCreateProject.mockResolvedValue(mockProject);
    mockCreateMilestones.mockResolvedValue([]);
    mockCreateActivity.mockResolvedValue({});

    const request = new NextRequest('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Project', stage: 'ideation' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockProject);
    expect(mockCreateProject).toHaveBeenCalledWith({
      userId: 'user_123',
      name: 'New Project',
      description: undefined,
      stage: 'ideation',
      metadata: undefined,
    });
    expect(mockCreateMilestones).toHaveBeenCalled();
    expect(mockCreateActivity).toHaveBeenCalledWith({
      userId: 'user_123',
      projectId: 'proj_new',
      type: 'project_created',
      data: { projectName: 'New Project', stage: 'ideation' },
    });
  });

  it('should return 400 when name is missing', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'user_123' });

    const request = new NextRequest('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ stage: 'ideation' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Name and stage are required');
  });

  it('should return 400 when stage is missing', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'user_123' });

    const request = new NextRequest('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Project' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Name and stage are required');
  });

  it('should return 401 when not authenticated', async () => {
    const AuthError = (await import('@/lib/auth')).AuthError;
    mockRequireAuth.mockRejectedValue(new AuthError());

    const request = new NextRequest('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', stage: 'ideation' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it('should create project with optional fields', async () => {
    const mockUser = { id: 'user_123' };
    const mockProject = {
      id: 'proj_new',
      name: 'Full Project',
      description: 'A detailed description',
      stage: 'mvp',
      metadata: { key: 'value' },
    };

    mockRequireAuth.mockResolvedValue(mockUser);
    mockCreateProject.mockResolvedValue(mockProject);
    mockCreateMilestones.mockResolvedValue([]);
    mockCreateActivity.mockResolvedValue({});

    const request = new NextRequest('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Full Project',
        stage: 'mvp',
        description: 'A detailed description',
        metadata: { key: 'value' },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(mockCreateProject).toHaveBeenCalledWith({
      userId: 'user_123',
      name: 'Full Project',
      description: 'A detailed description',
      stage: 'mvp',
      metadata: { key: 'value' },
    });
  });
});
