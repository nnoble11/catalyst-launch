import { vi } from 'vitest';

// Mock message response
export const mockMessageResponse = {
  id: 'msg_123',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: 'This is a test response from Claude.',
    },
  ],
  model: 'claude-sonnet-4-20250514',
  stop_reason: 'end_turn',
  usage: {
    input_tokens: 10,
    output_tokens: 20,
  },
};

// Mock streaming events
export const mockStreamEvents = [
  { type: 'message_start', message: { id: 'msg_123' } },
  { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hello' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: ' ' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'World' } },
  { type: 'content_block_stop', index: 0 },
  { type: 'message_stop' },
];

// Create async iterator for streaming
async function* createMockStream() {
  for (const event of mockStreamEvents) {
    yield event;
  }
}

// Mock Anthropic client
export const mockAnthropicClient = {
  messages: {
    create: vi.fn().mockResolvedValue(mockMessageResponse),
    stream: vi.fn().mockReturnValue({
      [Symbol.asyncIterator]: () => createMockStream(),
    }),
  },
};

// Mock the Anthropic constructor
export const MockAnthropic = vi.fn(() => mockAnthropicClient);

export default MockAnthropic;
