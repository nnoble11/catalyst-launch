import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationBell } from '@/components/dashboard/NotificationBell';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('should render bell icon', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    render(<NotificationBell />);

    // Wait for fetch to complete
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should fetch notifications on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    render(<NotificationBell />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/notifications');
    });
  });

  it('should show unread count badge when there are unread notifications', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              id: 'n1',
              title: 'Test',
              message: 'Test message',
              type: 'info',
              isRead: false,
              createdAt: new Date(),
            },
            {
              id: 'n2',
              title: 'Test 2',
              message: 'Test message 2',
              type: 'success',
              isRead: false,
              createdAt: new Date(),
            },
          ],
        }),
    });

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('should show 9+ when more than 9 unread notifications', async () => {
    const notifications = Array(12)
      .fill(null)
      .map((_, i) => ({
        id: `n${i}`,
        title: `Test ${i}`,
        message: `Message ${i}`,
        type: 'info',
        isRead: false,
        createdAt: new Date(),
      }));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: notifications }),
    });

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByText('9+')).toBeInTheDocument();
    });
  });

  it('should not show badge when all notifications are read', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              id: 'n1',
              title: 'Test',
              message: 'Test message',
              type: 'info',
              isRead: true,
              createdAt: new Date(),
            },
          ],
        }),
    });

    render(<NotificationBell />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Badge should not be visible (no unread count)
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('should show "Notifications" label in dropdown', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    render(<NotificationBell />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const button = screen.getByRole('button');
    await user.click(button);

    // Use getAllByText since there's both sr-only and visible "Notifications"
    const notificationElements = screen.getAllByText('Notifications');
    expect(notificationElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should show "No notifications yet" when empty', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    render(<NotificationBell />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const button = screen.getByRole('button');
    await user.click(button);

    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
  });

  it('should render notification titles in dropdown', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              id: 'n1',
              title: 'Milestone Completed',
              message: 'You completed Build MVP',
              type: 'success',
              isRead: false,
              createdAt: new Date(),
            },
          ],
        }),
    });

    render(<NotificationBell />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const button = screen.getByRole('button');
    await user.click(button);

    expect(screen.getByText('Milestone Completed')).toBeInTheDocument();
    expect(screen.getByText('You completed Build MVP')).toBeInTheDocument();
  });

  it('should mark notification as read when clicked', async () => {
    const user = userEvent.setup();

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: 'n1',
                title: 'Test Notification',
                message: 'Test message',
                type: 'info',
                isRead: false,
                createdAt: new Date(),
              },
            ],
          }),
      })
      .mockResolvedValueOnce({ ok: true }); // For marking as read

    render(<NotificationBell />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/notifications');
    });

    const button = screen.getByRole('button');
    await user.click(button);

    const notification = screen.getByText('Test Notification');
    await user.click(notification);

    expect(mockFetch).toHaveBeenCalledWith('/api/notifications/n1/read', {
      method: 'POST',
    });
  });

  it('should update local state after marking as read', async () => {
    const user = userEvent.setup();

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: 'n1',
                title: 'Test Notification',
                message: 'Test message',
                type: 'info',
                isRead: false,
                createdAt: new Date(),
              },
            ],
          }),
      })
      .mockResolvedValueOnce({ ok: true });

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument(); // Unread badge
    });

    const button = screen.getByRole('button');
    await user.click(button);

    const notification = screen.getByText('Test Notification');
    await user.click(notification);

    // Badge should disappear after marking as read
    await waitFor(() => {
      expect(screen.queryByText('1')).not.toBeInTheDocument();
    });
  });

  it('should show "X new" badge in dropdown header', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              id: 'n1',
              title: 'Test',
              message: 'Test',
              type: 'info',
              isRead: false,
              createdAt: new Date(),
            },
            {
              id: 'n2',
              title: 'Test 2',
              message: 'Test 2',
              type: 'info',
              isRead: false,
              createdAt: new Date(),
            },
            {
              id: 'n3',
              title: 'Test 3',
              message: 'Test 3',
              type: 'info',
              isRead: true,
              createdAt: new Date(),
            },
          ],
        }),
    });

    render(<NotificationBell />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const button = screen.getByRole('button');
    await user.click(button);

    expect(screen.getByText('2 new')).toBeInTheDocument();
  });

  it('should handle fetch error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<NotificationBell />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch notifications:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('should handle mark as read error gracefully', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: 'n1',
                title: 'Error Test Title',
                message: 'Error Test Message',
                type: 'info',
                isRead: false,
                createdAt: new Date(),
              },
            ],
          }),
      })
      .mockRejectedValueOnce(new Error('Failed to mark as read'));

    render(<NotificationBell />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const button = screen.getByRole('button');
    await user.click(button);

    const notification = screen.getByText('Error Test Title');
    await user.click(notification);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to mark notification as read:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('should have accessible name for screen readers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    render(<NotificationBell />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Check for sr-only element with screen reader text
    const srOnlyElements = document.querySelectorAll('.sr-only');
    const hasNotificationText = Array.from(srOnlyElements).some(
      el => el.textContent === 'Notifications'
    );
    expect(hasNotificationText).toBe(true);
  });
});
