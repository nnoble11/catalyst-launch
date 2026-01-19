import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectCard } from '@/components/dashboard/ProjectCard';

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// Mock the constants
vi.mock('@/config/constants', () => ({
  STAGE_LABELS: {
    ideation: 'Ideation',
    mvp: 'MVP',
    gtm: 'Go to Market',
  },
}));

describe('ProjectCard', () => {
  const mockProject = {
    id: 'proj_123',
    name: 'Test Project',
    description: 'This is a test project description',
    stage: 'ideation' as const,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    milestones: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render project name', () => {
    render(<ProjectCard project={mockProject} />);

    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('should render project description', () => {
    render(<ProjectCard project={mockProject} />);

    expect(
      screen.getByText('This is a test project description')
    ).toBeInTheDocument();
  });

  it('should not render description when null', () => {
    const projectWithoutDescription = {
      ...mockProject,
      description: null,
    };

    render(<ProjectCard project={projectWithoutDescription} />);

    expect(
      screen.queryByText('This is a test project description')
    ).not.toBeInTheDocument();
  });

  it('should render stage badge', () => {
    render(<ProjectCard project={mockProject} />);

    expect(screen.getByText('Ideation')).toBeInTheDocument();
  });

  it('should render MVP stage badge', () => {
    const mvpProject = { ...mockProject, stage: 'mvp' as const };
    render(<ProjectCard project={mvpProject} />);

    expect(screen.getByText('MVP')).toBeInTheDocument();
  });

  it('should render GTM stage badge', () => {
    const gtmProject = { ...mockProject, stage: 'gtm' as const };
    render(<ProjectCard project={gtmProject} />);

    expect(screen.getByText('Go to Market')).toBeInTheDocument();
  });

  it('should show Archived badge when project is not active', () => {
    const archivedProject = { ...mockProject, isActive: false };
    render(<ProjectCard project={archivedProject} />);

    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('should not show Archived badge when project is active', () => {
    render(<ProjectCard project={mockProject} />);

    expect(screen.queryByText('Archived')).not.toBeInTheDocument();
  });

  it('should link to project detail page', () => {
    render(<ProjectCard project={mockProject} />);

    const link = screen.getByRole('link', { name: 'Test Project' });
    expect(link).toHaveAttribute('href', '/projects/proj_123');
  });

  it('should render milestone progress when milestones exist', () => {
    const projectWithMilestones = {
      ...mockProject,
      milestones: [
        { id: 'm1', title: 'Task 1', isCompleted: true },
        { id: 'm2', title: 'Task 2', isCompleted: false },
      ],
    };

    render(<ProjectCard project={projectWithMilestones} />);

    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('1/2 milestones')).toBeInTheDocument();
  });

  it('should render milestone titles', () => {
    const projectWithMilestones = {
      ...mockProject,
      milestones: [
        { id: 'm1', title: 'Define Problem', isCompleted: true },
        { id: 'm2', title: 'User Research', isCompleted: false },
      ],
    };

    render(<ProjectCard project={projectWithMilestones} />);

    expect(screen.getByText('Define Problem')).toBeInTheDocument();
    expect(screen.getByText('User Research')).toBeInTheDocument();
  });

  it('should show "+X more milestones" when more than 3 milestones', () => {
    const projectWithManyMilestones = {
      ...mockProject,
      milestones: [
        { id: 'm1', title: 'Task 1', isCompleted: true },
        { id: 'm2', title: 'Task 2', isCompleted: false },
        { id: 'm3', title: 'Task 3', isCompleted: false },
        { id: 'm4', title: 'Task 4', isCompleted: false },
        { id: 'm5', title: 'Task 5', isCompleted: false },
      ],
    };

    render(<ProjectCard project={projectWithManyMilestones} />);

    expect(screen.getByText('+2 more milestones')).toBeInTheDocument();
  });

  it('should not render progress when no milestones', () => {
    render(<ProjectCard project={mockProject} />);

    expect(screen.queryByText('Progress')).not.toBeInTheDocument();
  });

  it('should calculate 100% progress when all milestones completed', () => {
    const projectComplete = {
      ...mockProject,
      milestones: [
        { id: 'm1', title: 'Task 1', isCompleted: true },
        { id: 'm2', title: 'Task 2', isCompleted: true },
      ],
    };

    render(<ProjectCard project={projectComplete} />);

    expect(screen.getByText('2/2 milestones')).toBeInTheDocument();
  });

  it('should calculate 0% progress when no milestones completed', () => {
    const projectNoProgress = {
      ...mockProject,
      milestones: [
        { id: 'm1', title: 'Task 1', isCompleted: false },
        { id: 'm2', title: 'Task 2', isCompleted: false },
      ],
    };

    render(<ProjectCard project={projectNoProgress} />);

    expect(screen.getByText('0/2 milestones')).toBeInTheDocument();
  });

  it('should call onDelete when delete is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(<ProjectCard project={mockProject} onDelete={onDelete} />);

    // Open dropdown menu
    const menuButton = screen.getByRole('button');
    await user.click(menuButton);

    // Click delete option
    const deleteOption = screen.getByText('Delete Project');
    await user.click(deleteOption);

    expect(onDelete).toHaveBeenCalledWith('proj_123');
  });

  it('should render dropdown menu with View Details option', async () => {
    const user = userEvent.setup();

    render(<ProjectCard project={mockProject} />);

    const menuButton = screen.getByRole('button');
    await user.click(menuButton);

    expect(screen.getByText('View Details')).toBeInTheDocument();
  });

  it('should render dropdown menu with Edit Project option', async () => {
    const user = userEvent.setup();

    render(<ProjectCard project={mockProject} />);

    const menuButton = screen.getByRole('button');
    await user.click(menuButton);

    expect(screen.getByText('Edit Project')).toBeInTheDocument();
  });

  it('should link to edit page from dropdown', async () => {
    const user = userEvent.setup();

    render(<ProjectCard project={mockProject} />);

    const menuButton = screen.getByRole('button');
    await user.click(menuButton);

    const editLink = screen.getByText('Edit Project');
    expect(editLink.closest('a')).toHaveAttribute(
      'href',
      '/projects/proj_123/edit'
    );
  });

  it('should show updated time', () => {
    render(<ProjectCard project={mockProject} />);

    // Check that "Updated" text exists (exact time depends on current date)
    expect(screen.getByText(/Updated.*ago/)).toBeInTheDocument();
  });
});
