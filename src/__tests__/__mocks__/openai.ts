import { vi } from 'vitest';

// Mock chat completion response
export const mockChatCompletion = {
  id: 'chatcmpl-123',
  object: 'chat.completion',
  created: Date.now(),
  model: 'gpt-4o',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'This is a test response from the AI.',
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 10,
    completion_tokens: 20,
    total_tokens: 30,
  },
};

// Mock structured output response
export const mockStructuredOutput = {
  summary: 'Test summary',
  insights: ['Insight 1', 'Insight 2'],
  suggestedTasks: [
    { title: 'Task 1', description: 'Description 1', priority: 'high' },
  ],
  nextSteps: ['Step 1', 'Step 2'],
};

// Mock streaming chunks
export const mockStreamChunks = [
  { choices: [{ delta: { content: 'Hello' } }] },
  { choices: [{ delta: { content: ' ' } }] },
  { choices: [{ delta: { content: 'World' } }] },
  { choices: [{ delta: {} }] }, // Final chunk with no content
];

// Create async iterator for streaming
async function* createMockStream() {
  for (const chunk of mockStreamChunks) {
    yield chunk;
  }
}

// Mock OpenAI client
export const mockOpenAIClient = {
  chat: {
    completions: {
      create: vi.fn().mockImplementation(async (options) => {
        if (options.stream) {
          return createMockStream();
        }
        if (options.response_format?.type === 'json_object') {
          return {
            ...mockChatCompletion,
            choices: [
              {
                ...mockChatCompletion.choices[0],
                message: {
                  role: 'assistant',
                  content: JSON.stringify(mockStructuredOutput),
                },
              },
            ],
          };
        }
        return mockChatCompletion;
      }),
    },
  },
};

// Mock the OpenAI constructor
export const MockOpenAI = vi.fn(() => mockOpenAIClient);

export default MockOpenAI;
