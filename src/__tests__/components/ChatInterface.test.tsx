import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInterface } from '@/components/ai/ChatInterface';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(7),
});

describe('ChatInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('should render empty state when no messages', () => {
    render(<ChatInterface conversationId="conv_123" />);

    expect(screen.getByText('AI Startup Coach')).toBeInTheDocument();
    expect(
      screen.getByText(/I'm here to help you build your startup/)
    ).toBeInTheDocument();
  });

  it('should render initial messages', () => {
    const initialMessages = [
      { id: 'msg_1', role: 'user' as const, content: 'Hello' },
      { id: 'msg_2', role: 'assistant' as const, content: 'Hi there!' },
    ];

    render(
      <ChatInterface conversationId="conv_123" initialMessages={initialMessages} />
    );

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('should render textarea for input', () => {
    render(<ChatInterface conversationId="conv_123" />);

    const textarea = screen.getByPlaceholderText(
      /Ask me anything about your startup/
    );
    expect(textarea).toBeInTheDocument();
  });

  it('should render send button', () => {
    render(<ChatInterface conversationId="conv_123" />);

    const sendButton = screen.getByRole('button');
    expect(sendButton).toBeInTheDocument();
  });

  it('should disable send button when input is empty', () => {
    render(<ChatInterface conversationId="conv_123" />);

    const sendButton = screen.getByRole('button');
    expect(sendButton).toBeDisabled();
  });

  it('should enable send button when input has text', async () => {
    const user = userEvent.setup();
    render(<ChatInterface conversationId="conv_123" />);

    const textarea = screen.getByPlaceholderText(
      /Ask me anything about your startup/
    );
    await user.type(textarea, 'Hello');

    const sendButton = screen.getByRole('button');
    expect(sendButton).not.toBeDisabled();
  });

  it('should clear input after sending message', async () => {
    const user = userEvent.setup();

    // Mock successful responses
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode('data: {"content":"Hello"}\n\n'),
              })
              .mockResolvedValueOnce({ done: true, value: undefined }),
          }),
        },
      });

    render(<ChatInterface conversationId="conv_123" />);

    const textarea = screen.getByPlaceholderText(
      /Ask me anything about your startup/
    ) as HTMLTextAreaElement;
    await user.type(textarea, 'Hello');

    const sendButton = screen.getByRole('button');
    await user.click(sendButton);

    await waitFor(() => {
      expect(textarea.value).toBe('');
    });
  });

  it('should show user message after sending', async () => {
    const user = userEvent.setup();

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ done: true, value: undefined }),
          }),
        },
      });

    render(<ChatInterface conversationId="conv_123" />);

    const textarea = screen.getByPlaceholderText(
      /Ask me anything about your startup/
    );
    await user.type(textarea, 'Test message');

    const sendButton = screen.getByRole('button');
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  it('should call onMessageSent callback', async () => {
    const user = userEvent.setup();
    const onMessageSent = vi.fn();

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValueOnce({ done: true, value: undefined }),
          }),
        },
      });

    render(
      <ChatInterface conversationId="conv_123" onMessageSent={onMessageSent} />
    );

    const textarea = screen.getByPlaceholderText(
      /Ask me anything about your startup/
    );
    await user.type(textarea, 'Hello');

    const sendButton = screen.getByRole('button');
    await user.click(sendButton);

    await waitFor(() => {
      expect(onMessageSent).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user',
          content: 'Hello',
        })
      );
    });
  });

  it('should send message on Enter key', async () => {
    const user = userEvent.setup();

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValueOnce({ done: true, value: undefined }),
          }),
        },
      });

    render(<ChatInterface conversationId="conv_123" />);

    const textarea = screen.getByPlaceholderText(
      /Ask me anything about your startup/
    );
    await user.type(textarea, 'Enter test{Enter}');

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('should not send message on Shift+Enter', async () => {
    const user = userEvent.setup();

    render(<ChatInterface conversationId="conv_123" />);

    const textarea = screen.getByPlaceholderText(
      /Ask me anything about your startup/
    );
    await user.type(textarea, 'Line 1{Shift>}{Enter}{/Shift}Line 2');

    // Should not trigger fetch since Shift+Enter is for new lines
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should display keyboard hint text', () => {
    render(<ChatInterface conversationId="conv_123" />);

    expect(
      screen.getByText(/Press Enter to send, Shift\+Enter for new line/)
    ).toBeInTheDocument();
  });

  it('should handle API error gracefully', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: false });

    render(<ChatInterface conversationId="conv_123" />);

    const textarea = screen.getByPlaceholderText(
      /Ask me anything about your startup/
    );
    await user.type(textarea, 'Test');

    const sendButton = screen.getByRole('button');
    await user.click(sendButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Sorry, I encountered an error/)
      ).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('should include projectId in API request when provided', async () => {
    const user = userEvent.setup();

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValueOnce({ done: true, value: undefined }),
          }),
        },
      });

    render(<ChatInterface conversationId="conv_123" projectId="proj_456" />);

    const textarea = screen.getByPlaceholderText(
      /Ask me anything about your startup/
    );
    await user.type(textarea, 'Hello');

    const sendButton = screen.getByRole('button');
    await user.click(sendButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/chat/stream',
        expect.objectContaining({
          body: expect.stringContaining('"projectId":"proj_456"'),
        })
      );
    });
  });
});
