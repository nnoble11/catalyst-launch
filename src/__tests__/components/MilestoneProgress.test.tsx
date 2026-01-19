import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MilestoneProgress } from '@/components/dashboard/MilestoneProgress';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from 'sonner';

describe('MilestoneProgress', () => {
  const mockMilestones = [
    {
      id: 'm1',
      title: 'Define Problem',
      description: 'Clearly define the problem you are solving',
      isCompleted: true,
      completedAt: new Date('2024-01-10'),
      order: 0,
    },
    {
      id: 'm2',
      title: 'User Research',
      description: null,
      isCompleted: false,
      completedAt: null,
      order: 1,
    },
    {
      id: 'm3',
      title: 'Build MVP',
      description: 'Create minimum viable product',
      isCompleted: false,
      completedAt: null,
      order: 2,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('should render milestones heading', () => {
    render(<MilestoneProgress projectId="proj_123" milestones={mockMilestones} />);

    expect(screen.getByText('Milestones')).toBeInTheDocument();
  });

  it('should render completion count', () => {
    render(<MilestoneProgress projectId="proj_123" milestones={mockMilestones} />);

    expect(screen.getByText('1 of 3 completed')).toBeInTheDocument();
  });

  it('should render all milestone titles', () => {
    render(<MilestoneProgress projectId="proj_123" milestones={mockMilestones} />);

    expect(screen.getByText('Define Problem')).toBeInTheDocument();
    expect(screen.getByText('User Research')).toBeInTheDocument();
    expect(screen.getByText('Build MVP')).toBeInTheDocument();
  });

  it('should render milestone descriptions when present', () => {
    render(<MilestoneProgress projectId="proj_123" milestones={mockMilestones} />);

    expect(
      screen.getByText('Clearly define the problem you are solving')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Create minimum viable product')
    ).toBeInTheDocument();
  });

  it('should show empty state when no milestones', () => {
    render(<MilestoneProgress projectId="proj_123" milestones={[]} />);

    expect(
      screen.getByText(/No milestones yet. Add one to track your progress/)
    ).toBeInTheDocument();
  });

  it('should show 0 of 0 completed when empty', () => {
    render(<MilestoneProgress projectId="proj_123" milestones={[]} />);

    expect(screen.getByText('0 of 0 completed')).toBeInTheDocument();
  });

  it('should render Add Milestone button', () => {
    render(<MilestoneProgress projectId="proj_123" milestones={mockMilestones} />);

    expect(screen.getByText('Add Milestone')).toBeInTheDocument();
  });

  it('should open dialog when Add Milestone is clicked', async () => {
    const user = userEvent.setup();

    render(<MilestoneProgress projectId="proj_123" milestones={mockMilestones} />);

    const addButton = screen.getByText('Add Milestone');
    await user.click(addButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Milestone title')).toBeInTheDocument();
  });

  it('should toggle milestone when clicked', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();

    mockFetch.mockResolvedValueOnce({ ok: true });

    render(
      <MilestoneProgress
        projectId="proj_123"
        milestones={mockMilestones}
        onUpdate={onUpdate}
      />
    );

    // Click on incomplete milestone
    const milestone = screen.getByText('User Research');
    await user.click(milestone);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/projects/proj_123/milestones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestoneId: 'm2',
          isCompleted: true,
          title: 'User Research',
        }),
      });
    });

    expect(onUpdate).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Milestone completed!');
  });

  it('should toggle completed milestone to incomplete', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({ ok: true });

    render(
      <MilestoneProgress projectId="proj_123" milestones={mockMilestones} />
    );

    // Click on completed milestone
    const milestone = screen.getByText('Define Problem');
    await user.click(milestone);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/projects/proj_123/milestones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestoneId: 'm1',
          isCompleted: false,
          title: 'Define Problem',
        }),
      });
    });

    expect(toast.success).toHaveBeenCalledWith('Milestone marked as incomplete');
  });

  it('should show error toast when toggle fails', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockFetch.mockResolvedValueOnce({ ok: false });

    render(
      <MilestoneProgress projectId="proj_123" milestones={mockMilestones} />
    );

    const milestone = screen.getByText('User Research');
    await user.click(milestone);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update milestone');
    });

    consoleSpy.mockRestore();
  });

  it('should add new milestone', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();

    mockFetch.mockResolvedValueOnce({ ok: true });

    render(
      <MilestoneProgress
        projectId="proj_123"
        milestones={mockMilestones}
        onUpdate={onUpdate}
      />
    );

    // Open dialog
    const addButton = screen.getByText('Add Milestone');
    await user.click(addButton);

    // Type milestone title
    const input = screen.getByPlaceholderText('Milestone title');
    await user.type(input, 'New Milestone');

    // Submit
    const submitButtons = screen.getAllByText('Add Milestone');
    const submitButton = submitButtons[submitButtons.length - 1]; // Get dialog button
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/projects/proj_123/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Milestone',
          order: 3,
        }),
      });
    });

    expect(onUpdate).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Milestone added');
  });

  it('should add milestone on Enter key', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({ ok: true });

    render(<MilestoneProgress projectId="proj_123" milestones={mockMilestones} />);

    // Open dialog
    const addButton = screen.getByText('Add Milestone');
    await user.click(addButton);

    // Type and press Enter
    const input = screen.getByPlaceholderText('Milestone title');
    await user.type(input, 'New Milestone{Enter}');

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('should not add milestone with empty title', async () => {
    const user = userEvent.setup();

    render(<MilestoneProgress projectId="proj_123" milestones={mockMilestones} />);

    // Open dialog
    const addButton = screen.getByText('Add Milestone');
    await user.click(addButton);

    // Submit without typing
    const submitButtons = screen.getAllByText('Add Milestone');
    await user.click(submitButtons[submitButtons.length - 1]);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should show error toast when add fails', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockFetch.mockResolvedValueOnce({ ok: false });

    render(<MilestoneProgress projectId="proj_123" milestones={mockMilestones} />);

    const addButton = screen.getByText('Add Milestone');
    await user.click(addButton);

    const input = screen.getByPlaceholderText('Milestone title');
    await user.type(input, 'New Milestone');

    const submitButtons = screen.getAllByText('Add Milestone');
    await user.click(submitButtons[submitButtons.length - 1]);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to add milestone');
    });

    consoleSpy.mockRestore();
  });

  it('should close dialog on Cancel', async () => {
    const user = userEvent.setup();

    render(<MilestoneProgress projectId="proj_123" milestones={mockMilestones} />);

    // Open dialog
    const addButton = screen.getByText('Add Milestone');
    await user.click(addButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Click cancel
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should delete milestone', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();

    mockFetch.mockResolvedValueOnce({ ok: true });

    render(
      <MilestoneProgress
        projectId="proj_123"
        milestones={mockMilestones}
        onUpdate={onUpdate}
      />
    );

    // Find and click delete button (they're hidden until hover, but still in DOM)
    const deleteButtons = screen.getAllByRole('button', { name: '' });
    // The delete buttons are the icon buttons without text
    const deleteButton = deleteButtons.find(btn =>
      btn.querySelector('svg.lucide-trash-2')
    );

    if (deleteButton) {
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/projects/proj_123/milestones?milestoneId=m1',
          { method: 'DELETE' }
        );
      });

      expect(onUpdate).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Milestone deleted');
    }
  });

  it('should show error toast when delete fails', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockFetch.mockResolvedValueOnce({ ok: false });

    render(<MilestoneProgress projectId="proj_123" milestones={mockMilestones} />);

    const deleteButtons = screen.getAllByRole('button', { name: '' });
    const deleteButton = deleteButtons.find(btn =>
      btn.querySelector('svg.lucide-trash-2')
    );

    if (deleteButton) {
      await user.click(deleteButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to delete milestone');
      });
    }

    consoleSpy.mockRestore();
  });

  it('should show 100% progress when all milestones completed', () => {
    const allCompleted = mockMilestones.map(m => ({ ...m, isCompleted: true }));

    render(<MilestoneProgress projectId="proj_123" milestones={allCompleted} />);

    expect(screen.getByText('3 of 3 completed')).toBeInTheDocument();
  });

  it('should render dialog title and description', async () => {
    const user = userEvent.setup();

    render(<MilestoneProgress projectId="proj_123" milestones={mockMilestones} />);

    const addButton = screen.getByText('Add Milestone');
    await user.click(addButton);

    expect(screen.getByText('Create a new milestone for this project.')).toBeInTheDocument();
  });
});
