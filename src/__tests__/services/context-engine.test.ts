import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildUserContext } from '@/services/context/engine';

// Mock database queries
const mockGetRecentActivities = vi.fn();
const mockGetProjectById = vi.fn();
const mockGetMilestonesByProjectId = vi.fn();

vi.mock('@/lib/db/queries', () => ({
  getRecentActivities: (userId: string, projectId?: string, days?: number) =>
    mockGetRecentActivities(userId, projectId, days),
  getProjectById: (projectId: string) => mockGetProjectById(projectId),
  getMilestonesByProjectId: (projectId: string) => mockGetMilestonesByProjectId(projectId),
}));

describe('buildUserContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should build context without projectId', async () => {
    const mockActivities = [
      { id: 'act_1', type: 'chat_message', createdAt: new Date() },
    ];

    mockGetRecentActivities.mockResolvedValue(mockActivities);

    const context = await buildUserContext('user_123');

    expect(context.recentActivity).toEqual(mockActivities);
    expect(context.currentProject).toBeNull();
    expect(context.projectMilestones).toEqual([]);
    expect(mockGetRecentActivities).toHaveBeenCalledWith('user_123', undefined, 7);
    expect(mockGetProjectById).not.toHaveBeenCalled();
  });

  it('should build context with projectId', async () => {
    const mockProject = {
      id: 'proj_1',
      userId: 'user_123',
      name: 'Test Project',
      description: 'Test description',
      stage: 'ideation',
      isActive: true,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      milestones: [
        {
          id: 'm1',
          projectId: 'proj_1',
          title: 'Task 1',
          description: null,
          isCompleted: false,
          completedAt: null,
          dueDate: null,
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'm2',
          projectId: 'proj_1',
          title: 'Task 2',
          description: null,
          isCompleted: true,
          completedAt: new Date(),
          dueDate: null,
          order: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    const mockActivities = [{ id: 'act_1', type: 'project_created', userId: 'user_123', projectId: 'proj_1', data: {}, createdAt: new Date() }];

    mockGetRecentActivities.mockResolvedValue(mockActivities);
    mockGetProjectById.mockResolvedValue(mockProject);

    const context = await buildUserContext('user_123', 'proj_1');

    expect(context.currentProject).toBeDefined();
    expect(context.currentProject?.id).toBe('proj_1');
    expect(context.projectMilestones.length).toBe(2);
    expect(mockGetProjectById).toHaveBeenCalledWith('proj_1');
  });

  it('should handle project not found', async () => {
    mockGetRecentActivities.mockResolvedValue([]);
    mockGetProjectById.mockResolvedValue(null);

    const context = await buildUserContext('user_123', 'nonexistent');

    expect(context.currentProject).toBeNull();
    expect(context.projectMilestones).toEqual([]);
  });

  it('should include patterns in context', async () => {
    mockGetRecentActivities.mockResolvedValue([]);
    mockGetProjectById.mockResolvedValue(null);

    const context = await buildUserContext('user_123');

    expect(context.patterns).toBeDefined();
    expect(Array.isArray(context.patterns)).toBe(true);
  });
});

describe('Pattern Detection via buildUserContext', () => {
  it('should detect "inactive" pattern when no activities', async () => {
    mockGetRecentActivities.mockResolvedValue([]);
    mockGetProjectById.mockResolvedValue(null);

    const context = await buildUserContext('user_123');

    const inactivePattern = context.patterns.find(p => p.type === 'inactive');
    expect(inactivePattern).toBeDefined();
    expect(inactivePattern?.confidence).toBe(0.9);
    expect(inactivePattern?.description).toContain('No recent activity');
  });

  it('should detect "momentum" pattern with 5+ activities', async () => {
    const activities = Array(5).fill(null).map((_, i) => ({
      id: `act_${i}`,
      userId: 'user_123',
      projectId: null,
      type: 'chat_message',
      data: {},
      createdAt: new Date(),
    }));

    mockGetRecentActivities.mockResolvedValue(activities);
    mockGetProjectById.mockResolvedValue(null);

    const context = await buildUserContext('user_123');

    const momentumPattern = context.patterns.find(p => p.type === 'momentum');
    expect(momentumPattern).toBeDefined();
    expect(momentumPattern?.confidence).toBe(0.8);
  });

  it('should not detect "momentum" with fewer than 5 activities', async () => {
    const activities = Array(4).fill(null).map((_, i) => ({
      id: `act_${i}`,
      userId: 'user_123',
      projectId: null,
      type: 'chat_message',
      data: {},
      createdAt: new Date(),
    }));

    mockGetRecentActivities.mockResolvedValue(activities);
    mockGetProjectById.mockResolvedValue(null);

    const context = await buildUserContext('user_123');

    const momentumPattern = context.patterns.find(p => p.type === 'momentum');
    expect(momentumPattern).toBeUndefined();
  });

  it('should detect "stall" when milestones exist but none completed recently', async () => {
    const mockProject = {
      id: 'proj_1',
      userId: 'user_123',
      name: 'Test Project',
      description: null,
      stage: 'ideation',
      isActive: true,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      milestones: [
        { id: 'm1', projectId: 'proj_1', title: 'Task 1', description: null, isCompleted: false, completedAt: null, dueDate: null, order: 0, createdAt: new Date(), updatedAt: new Date() },
        { id: 'm2', projectId: 'proj_1', title: 'Task 2', description: null, isCompleted: false, completedAt: null, dueDate: null, order: 1, createdAt: new Date(), updatedAt: new Date() },
      ],
    };

    mockGetRecentActivities.mockResolvedValue([]);
    mockGetProjectById.mockResolvedValue(mockProject);

    const context = await buildUserContext('user_123', 'proj_1');

    const stallPattern = context.patterns.find(p => p.type === 'stall');
    expect(stallPattern).toBeDefined();
    expect(stallPattern?.confidence).toBe(0.7);
  });

  it('should detect "milestone_near" at 80%+ completion', async () => {
    const makeMilestone = (id: string, isCompleted: boolean, order: number) => ({
      id,
      projectId: 'proj_1',
      title: `Task ${id}`,
      description: null,
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
      dueDate: null,
      order,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const mockProject = {
      id: 'proj_1',
      userId: 'user_123',
      name: 'Test Project',
      description: null,
      stage: 'ideation',
      isActive: true,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      milestones: [
        makeMilestone('m1', true, 0),
        makeMilestone('m2', true, 1),
        makeMilestone('m3', true, 2),
        makeMilestone('m4', true, 3),
        makeMilestone('m5', false, 4),
      ],
    };

    mockGetRecentActivities.mockResolvedValue([]);
    mockGetProjectById.mockResolvedValue(mockProject);

    const context = await buildUserContext('user_123', 'proj_1');

    const nearPattern = context.patterns.find(p => p.type === 'milestone_near');
    expect(nearPattern).toBeDefined();
    expect(nearPattern?.confidence).toBe(0.9);
  });

  it('should not detect "milestone_near" at 100% completion', async () => {
    const makeMilestone = (id: string, order: number) => ({
      id,
      projectId: 'proj_1',
      title: `Task ${id}`,
      description: null,
      isCompleted: true,
      completedAt: new Date(),
      dueDate: null,
      order,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const mockProject = {
      id: 'proj_1',
      userId: 'user_123',
      name: 'Test Project',
      description: null,
      stage: 'ideation',
      isActive: true,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      milestones: [
        makeMilestone('m1', 0),
        makeMilestone('m2', 1),
      ],
    };

    mockGetRecentActivities.mockResolvedValue([]);
    mockGetProjectById.mockResolvedValue(mockProject);

    const context = await buildUserContext('user_123', 'proj_1');

    const nearPattern = context.patterns.find(p => p.type === 'milestone_near');
    expect(nearPattern).toBeUndefined();
  });

  it('should not detect "milestone_near" below 80% completion', async () => {
    const makeMilestone = (id: string, isCompleted: boolean, order: number) => ({
      id,
      projectId: 'proj_1',
      title: `Task ${id}`,
      description: null,
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
      dueDate: null,
      order,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const mockProject = {
      id: 'proj_1',
      userId: 'user_123',
      name: 'Test Project',
      description: null,
      stage: 'ideation',
      isActive: true,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      milestones: [
        makeMilestone('m1', true, 0),
        makeMilestone('m2', true, 1),
        makeMilestone('m3', false, 2),
        makeMilestone('m4', false, 3),
        makeMilestone('m5', false, 4),
      ],
    };

    mockGetRecentActivities.mockResolvedValue([]);
    mockGetProjectById.mockResolvedValue(mockProject);

    const context = await buildUserContext('user_123', 'proj_1');

    const nearPattern = context.patterns.find(p => p.type === 'milestone_near');
    expect(nearPattern).toBeUndefined();
  });

  it('should detect multiple patterns simultaneously', async () => {
    const activities = Array(6).fill(null).map((_, i) => ({
      id: `act_${i}`,
      userId: 'user_123',
      projectId: 'proj_1',
      type: 'chat_message',
      data: {},
      createdAt: new Date(),
    }));

    const makeMilestone = (id: string, isCompleted: boolean, order: number) => ({
      id,
      projectId: 'proj_1',
      title: `Task ${id}`,
      description: null,
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
      dueDate: null,
      order,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const mockProject = {
      id: 'proj_1',
      userId: 'user_123',
      name: 'Test Project',
      description: null,
      stage: 'ideation',
      isActive: true,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      milestones: [
        makeMilestone('m1', true, 0),
        makeMilestone('m2', true, 1),
        makeMilestone('m3', true, 2),
        makeMilestone('m4', true, 3),
        makeMilestone('m5', false, 4),
      ],
    };

    mockGetRecentActivities.mockResolvedValue(activities);
    mockGetProjectById.mockResolvedValue(mockProject);

    const context = await buildUserContext('user_123', 'proj_1');

    expect(context.patterns.some(p => p.type === 'momentum')).toBe(true);
    expect(context.patterns.some(p => p.type === 'milestone_near')).toBe(true);
  });
});
