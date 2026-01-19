# Catalyst Launch - Comprehensive Unit Test Protocol

## Overview

This document outlines the complete testing strategy for the Catalyst Launch application, covering all testable components across the stack.

---

## Table of Contents

1. [Testing Stack Setup](#1-testing-stack-setup)
2. [API Routes (16 Endpoints)](#2-api-routes)
3. [Database Queries (37 Functions)](#3-database-queries)
4. [Services](#4-services)
5. [AI Clients](#5-ai-clients)
6. [Auth Utilities](#6-auth-utilities)
7. [React Components](#7-react-components)
8. [Mocking Strategies](#8-mocking-strategies)
9. [Test File Structure](#9-test-file-structure)
10. [Priority Matrix](#10-priority-matrix)

---

## 1. Testing Stack Setup

### Required Dependencies

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react msw
```

### Configuration Files

**vitest.config.ts**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/__tests__/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**src/__tests__/setup.ts**
```typescript
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global mocks
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));
```

---

## 2. API Routes

### 2.1 Projects API

| Endpoint | Method | Auth | Test Cases |
|----------|--------|------|------------|
| `/api/projects` | GET | Yes | Fetch user projects, empty list, auth failure |
| `/api/projects` | POST | Yes | Create project, validation errors, default milestones |
| `/api/projects/[id]` | GET | Yes | Fetch single, not found, unauthorized |
| `/api/projects/[id]` | PATCH | Yes | Partial update, ownership check |
| `/api/projects/[id]` | DELETE | Yes | Delete cascade, ownership check |

**Key Test Scenarios:**
```typescript
describe('POST /api/projects', () => {
  it('should create project with default milestones', async () => {
    // Mock requireAuth, createProject, createMilestones, createActivity
    // Verify 5 milestones created for 'ideation' stage
  });

  it('should return 400 when name missing', async () => {
    // Send request without name
    // Expect 400 status
  });

  it('should return 401 when unauthenticated', async () => {
    // Mock requireAuth to throw AuthError
    // Expect 401 status
  });
});
```

### 2.2 Milestones API

| Endpoint | Method | Test Cases |
|----------|--------|------------|
| `/api/projects/[id]/milestones` | GET | List milestones, ordering |
| `/api/projects/[id]/milestones` | POST | Create, validation |
| `/api/projects/[id]/milestones` | PATCH | Update, completion logging |
| `/api/projects/[id]/milestones` | DELETE | Delete single |

**Critical Test: Milestone Completion**
```typescript
it('should set completedAt and log activity when marking complete', async () => {
  // PATCH with isCompleted: true
  // Verify completedAt is set
  // Verify createActivity called with 'milestone_completed'
});
```

### 2.3 Conversations API

| Endpoint | Method | Test Cases |
|----------|--------|------------|
| `/api/conversations` | GET | With/without projectId filter |
| `/api/conversations` | POST | Create with default title |
| `/api/conversations/[id]/messages` | GET | Fetch with limit, authorization |
| `/api/conversations/[id]/messages` | POST | Create message, validation |

### 2.4 Chat Streaming API

| Endpoint | Method | Test Cases |
|----------|--------|------------|
| `/api/chat/stream` | POST | Stream response, save message, provider selection |

**Critical Test: SSE Streaming**
```typescript
it('should stream response and save to database', async () => {
  // Mock streamChat to yield chunks
  // Verify SSE format: event: text\ndata: {...}\n\n
  // Verify createMessage called with full response
  // Verify createActivity logged
});
```

### 2.5 Documents API

| Endpoint | Method | Test Cases |
|----------|--------|------------|
| `/api/documents` | GET | By projectId, by documentId |
| `/api/documents/generate` | POST | Each document type, AI failure |

**Document Types to Test:**
- `pitch-deck`: 10 sections
- `prd`: 10 sections
- `gtm-plan`: 11 sections

### 2.6 AI Analysis API

| Endpoint | Method | Test Cases |
|----------|--------|------------|
| `/api/ai/analyze-context` | POST | Context building, AI response |
| `/api/ai/daily-checkin` | POST | Check-in generation |
| `/api/ai/suggest-tasks` | POST | Task suggestions, count param |

### 2.7 Notifications API

| Endpoint | Method | Test Cases |
|----------|--------|------------|
| `/api/notifications` | GET | Unread filter, limit |
| `/api/notifications` | POST | Create with type |
| `/api/notifications` | PATCH | Mark all read |
| `/api/notifications/[id]/read` | POST | Mark single read |

### 2.8 User API

| Endpoint | Method | Test Cases |
|----------|--------|------------|
| `/api/user/preferences` | GET | Fetch preferences |
| `/api/user/preferences` | PATCH | Merge preferences |
| `/api/user/onboarding` | POST | Update status |

### 2.9 Ideas API

| Endpoint | Method | Test Cases |
|----------|--------|------------|
| `/api/ideas` | POST | Anonymous submission, authenticated |
| `/api/ideas/leaderboard` | GET | Sorted by votes |
| `/api/ideas/leaderboard` | POST | Upvote |

### 2.10 Integrations API

| Endpoint | Method | Test Cases |
|----------|--------|------------|
| `/api/integrations` | GET | Filter sensitive tokens |

---

## 3. Database Queries

### 3.1 User Queries

| Function | Input | Output | Mock Strategy |
|----------|-------|--------|---------------|
| `getUserByClerkId` | clerkId | User \| undefined | Mock findFirst |
| `createUser` | data | User | Mock insert + returning |
| `updateUser` | userId, data | User | Mock update + returning |

### 3.2 Project Queries

| Function | Mock Requirements |
|----------|-------------------|
| `getProjectsByUserId` | Return array with milestones |
| `getProjectById` | Return single project with milestones |
| `createProject` | Return created project |
| `updateProject` | Return updated project |
| `deleteProject` | Verify cascade behavior |

### 3.3 Milestone Queries

| Function | Key Test Cases |
|----------|----------------|
| `getMilestonesByProjectId` | Verify ordering by `order` ASC |
| `createMilestone` | Date parsing for dueDate |
| `createMilestones` | Batch insert |
| `updateMilestone` | Partial updates, completedAt |
| `deleteMilestone` | Single delete |

### 3.4 Conversation & Message Queries

| Function | Key Test Cases |
|----------|----------------|
| `getConversationsByUserId` | Filter by projectId, ordering |
| `getConversationById` | Include messages |
| `createConversation` | Default title |
| `getMessagesByConversationId` | Limit, ordering ASC |
| `createMessage` | Metadata inclusion |

### 3.5 Activity Queries

| Function | Key Test Cases |
|----------|----------------|
| `getActivitiesByUserId` | Limit, ordering DESC |
| `getRecentActivities` | Date threshold (7 days) |
| `createActivity` | Type validation |

### 3.6 Document Queries

| Function | Key Test Cases |
|----------|----------------|
| `getDocumentsByProjectId` | Ordering |
| `getDocumentById` | Single fetch |
| `createDocument` | Content as JSONB |
| `updateDocument` | Version increment |

### 3.7 Notification Queries

| Function | Key Test Cases |
|----------|----------------|
| `getNotificationsByUserId` | unreadOnly filter |
| `createNotification` | Default type 'info' |
| `markNotificationAsRead` | Update isRead |
| `markAllNotificationsAsRead` | Bulk update |

### 3.8 Integration Queries

| Function | Key Test Cases |
|----------|----------------|
| `getIntegrationsByUserId` | List integrations |
| `getIntegrationByProvider` | Provider filter |
| `upsertIntegration` | Insert or update |
| `deleteIntegration` | Single delete |

### 3.9 Idea Queries

| Function | Key Test Cases |
|----------|----------------|
| `getIdeasLeaderboard` | Sort by votes DESC |
| `createIdea` | Optional userId |
| `upvoteIdea` | Increment votes |

---

## 4. Services

### 4.1 AI Orchestrator (`/src/services/ai/orchestrator.ts`)

**Function: `streamChat`**
```typescript
describe('streamChat', () => {
  it('should route to OpenAI provider by default', async () => {
    const chunks = [];
    for await (const chunk of streamChat(messages, context, 'openai')) {
      chunks.push(chunk);
    }
    expect(mockOpenAI.streamChatCompletion).toHaveBeenCalled();
  });

  it('should route to Anthropic when specified', async () => {
    // Verify Anthropic SDK called
    // Verify system message extracted for Anthropic
  });

  it('should build contextual prompt with project info', async () => {
    // Verify buildContextualPrompt called with context
  });
});
```

### 4.2 Context Engine (`/src/services/context/engine.ts`)

**Function: `buildUserContext`**
```typescript
describe('buildUserContext', () => {
  it('should fetch recent activities for last 7 days', async () => {
    // Verify getRecentActivities called with 7
  });

  it('should include project and milestones when projectId provided', async () => {
    // Verify getProjectById and getMilestonesByProjectId called
  });

  it('should detect patterns from activities', async () => {
    // Verify detectPatterns called
  });
});
```

**Function: `detectPatterns`**
```typescript
describe('detectPatterns', () => {
  it('should detect "inactive" when no activities', () => {
    const patterns = detectPatterns([], []);
    expect(patterns).toContainEqual(expect.objectContaining({ type: 'inactive' }));
  });

  it('should detect "momentum" with 5+ activities', () => {
    const activities = Array(5).fill({ type: 'chat_message' });
    const patterns = detectPatterns(activities, []);
    expect(patterns).toContainEqual(expect.objectContaining({ type: 'momentum' }));
  });

  it('should detect "milestone_near" at 80% completion', () => {
    const milestones = [
      { isCompleted: true },
      { isCompleted: true },
      { isCompleted: true },
      { isCompleted: true },
      { isCompleted: false },
    ];
    const patterns = detectPatterns([], milestones);
    expect(patterns).toContainEqual(expect.objectContaining({ type: 'milestone_near' }));
  });
});
```

### 4.3 Context Analyzer (`/src/services/context/analyzer.ts`)

**Functions to Test:**
- `analyzeContext`: Returns ContextAnalysis with summary, insights, tasks
- `generateDailyCheckIn`: Returns greeting, reflection, focus, motivation

### 4.4 Document Generator (`/src/services/documents/generator.ts`)

```typescript
describe('generateDocument', () => {
  it('should generate pitch-deck with 10 sections', async () => {
    const result = await generateDocument(userId, projectId, 'pitch-deck');
    expect(result.sections).toHaveLength(10);
  });

  it('should save document to database', async () => {
    await generateDocument(userId, projectId, 'prd');
    expect(mockCreateDocument).toHaveBeenCalled();
  });

  it('should log document_generated activity', async () => {
    await generateDocument(userId, projectId, 'gtm-plan');
    expect(mockCreateActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'document_generated' })
    );
  });
});
```

### 4.5 Notification Sender (`/src/services/notifications/sender.ts`)

| Function | Expected Type | Test Verification |
|----------|---------------|-------------------|
| `sendMilestoneCompletedNotification` | 'success' | Template includes milestone name |
| `sendDailyCheckInReminder` | 'reminder' | ActionUrl is '/chat' |
| `sendStallWarning` | 'warning' | Template includes project name |
| `sendDocumentReadyNotification` | 'success' | ActionUrl includes projectId |
| `sendSuggestion` | 'suggestion' | Custom message passed through |

### 4.6 Streaming Service (`/src/services/ai/streaming.ts`)

```typescript
describe('createSSEStream', () => {
  it('should format text events correctly', () => {
    const { stream, sendText } = createSSEStream();
    sendText('Hello');
    // Verify output: 'event: text\ndata: {"content":"Hello"}\n\n'
  });

  it('should format done event', () => {
    const { sendDone } = createSSEStream();
    sendDone();
    // Verify output: 'event: done\ndata: {}\n\n'
  });

  it('should format error event', () => {
    const { sendError } = createSSEStream();
    sendError('Test error');
    // Verify output includes error message
  });
});

describe('parseSSEEvent', () => {
  it('should parse text event', () => {
    const event = { data: '{"content":"Hello"}' };
    const result = parseSSEEvent(event);
    expect(result).toEqual({ type: 'text', content: 'Hello' });
  });

  it('should handle malformed JSON', () => {
    const event = { data: 'invalid' };
    const result = parseSSEEvent(event);
    expect(result).toBeNull();
  });
});
```

---

## 5. AI Clients

### 5.1 OpenAI Client (`/src/lib/ai/openai.ts`)

```typescript
describe('generateChatCompletion', () => {
  it('should use gpt-4o model by default', async () => {
    await generateChatCompletion(messages);
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o' })
    );
  });

  it('should apply default temperature 0.7', async () => {
    await generateChatCompletion(messages);
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0.7 })
    );
  });
});

describe('streamChatCompletion', () => {
  it('should yield text chunks from stream', async () => {
    // Mock streaming response
    const chunks = [];
    for await (const chunk of streamChatCompletion(messages)) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual(['Hello', ' World']);
  });
});

describe('generateStructuredOutput', () => {
  it('should use JSON response format', async () => {
    await generateStructuredOutput(messages, {});
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        response_format: { type: 'json_object' },
      })
    );
  });

  it('should parse JSON response', async () => {
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: '{"key":"value"}' } }],
    });
    const result = await generateStructuredOutput(messages, {});
    expect(result).toEqual({ key: 'value' });
  });
});
```

### 5.2 Anthropic Client (`/src/lib/ai/anthropic.ts`)

```typescript
describe('generateChatCompletion', () => {
  it('should pass systemPrompt as separate parameter', async () => {
    await generateChatCompletion(messages, 'System prompt');
    expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ system: 'System prompt' })
    );
  });

  it('should filter out system role from messages', async () => {
    const messagesWithSystem = [
      { role: 'system', content: 'System' },
      { role: 'user', content: 'Hello' },
    ];
    await generateChatCompletion(messagesWithSystem);
    // Verify only user message passed
  });
});

describe('streamChatCompletion', () => {
  it('should yield text from content_block_delta events', async () => {
    // Mock Anthropic stream events
    // Verify text_delta extraction
  });
});
```

### 5.3 Prompts System (`/src/lib/ai/prompts/system.ts`)

```typescript
describe('buildContextualPrompt', () => {
  it('should include base system prompt', () => {
    const prompt = buildContextualPrompt({ stage: 'ideation' });
    expect(prompt).toContain('AI-powered startup coach');
  });

  it('should include stage-specific guidance', () => {
    const prompt = buildContextualPrompt({ stage: 'mvp' });
    expect(prompt).toContain('MVP');
    expect(prompt).toContain('core features');
  });

  it('should include project name when provided', () => {
    const prompt = buildContextualPrompt({
      stage: 'ideation',
      projectName: 'TestApp',
    });
    expect(prompt).toContain('TestApp');
  });

  it('should list pending milestones', () => {
    const prompt = buildContextualPrompt({
      stage: 'ideation',
      milestones: [
        { title: 'Task 1', isCompleted: false },
        { title: 'Task 2', isCompleted: true },
      ],
    });
    expect(prompt).toContain('Task 1');
    expect(prompt).not.toContain('Task 2'); // Completed
  });
});

describe('getStageSpecificPrompt', () => {
  it.each([
    ['ideation', 'problem validation'],
    ['mvp', 'core features'],
    ['gtm', 'pricing'],
  ])('should return relevant prompt for %s stage', (stage, expectedContent) => {
    const prompt = getStageSpecificPrompt(stage);
    expect(prompt.toLowerCase()).toContain(expectedContent);
  });
});
```

---

## 6. Auth Utilities

### 6.1 Auth Functions (`/src/lib/auth.ts`)

```typescript
describe('getCurrentUser', () => {
  it('should return null when not authenticated', async () => {
    mockClerkAuth.mockResolvedValue({ userId: null });
    const user = await getCurrentUser();
    expect(user).toBeNull();
  });

  it('should return existing user from database', async () => {
    mockClerkAuth.mockResolvedValue({ userId: 'clerk_123' });
    mockGetUserByClerkId.mockResolvedValue({ id: 'db_user_1' });

    const user = await getCurrentUser();
    expect(user).toEqual({ id: 'db_user_1' });
  });

  it('should create user when not in database', async () => {
    mockClerkAuth.mockResolvedValue({ userId: 'clerk_123' });
    mockGetUserByClerkId.mockResolvedValue(undefined);
    mockClerkCurrentUser.mockResolvedValue({
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'Test',
      lastName: 'User',
      imageUrl: 'https://example.com/avatar.jpg',
    });
    mockCreateUser.mockResolvedValue({ id: 'new_user' });

    const user = await getCurrentUser();
    expect(mockCreateUser).toHaveBeenCalledWith({
      clerkId: 'clerk_123',
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.jpg',
    });
  });

  it('should handle race condition on user creation', async () => {
    mockClerkAuth.mockResolvedValue({ userId: 'clerk_123' });
    mockGetUserByClerkId
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: 'existing_user' });
    mockClerkCurrentUser.mockResolvedValue({ emailAddresses: [{ emailAddress: 'test@example.com' }] });
    mockCreateUser.mockRejectedValue(new Error('Duplicate key'));

    const user = await getCurrentUser();
    expect(user).toEqual({ id: 'existing_user' });
  });
});

describe('requireAuth', () => {
  it('should return user when authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user_1' });
    const user = await requireAuth();
    expect(user).toEqual({ id: 'user_1' });
  });

  it('should throw AuthError when not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    await expect(requireAuth()).rejects.toThrow(AuthError);
  });
});

describe('AuthError', () => {
  it('should have correct name and message', () => {
    const error = new AuthError();
    expect(error.name).toBe('AuthError');
    expect(error.message).toBe('Unauthorized');
  });

  it('should accept custom message', () => {
    const error = new AuthError('Custom message');
    expect(error.message).toBe('Custom message');
  });
});
```

---

## 7. React Components

### 7.1 ChatInterface (`/src/components/ai/ChatInterface.tsx`)

```typescript
describe('ChatInterface', () => {
  it('should render empty state with welcome message', () => {
    render(<ChatInterface conversationId="conv_1" />);
    expect(screen.getByText(/How can I help/)).toBeInTheDocument();
  });

  it('should display initial messages', () => {
    const messages = [
      { id: '1', role: 'user', content: 'Hello' },
      { id: '2', role: 'assistant', content: 'Hi there!' },
    ];
    render(<ChatInterface conversationId="conv_1" initialMessages={messages} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('should send message on Enter key', async () => {
    render(<ChatInterface conversationId="conv_1" />);
    const input = screen.getByPlaceholderText(/message/i);

    await userEvent.type(input, 'Test message{enter}');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/conversations/conv_1/messages',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should not send on Shift+Enter', async () => {
    render(<ChatInterface conversationId="conv_1" />);
    const input = screen.getByPlaceholderText(/message/i);

    await userEvent.type(input, 'Line 1{shift>}{enter}{/shift}Line 2');

    expect(mockFetch).not.toHaveBeenCalled();
    expect(input).toHaveValue('Line 1\nLine 2');
  });

  it('should disable input while loading', async () => {
    // Trigger message send
    // Verify button is disabled
    // Verify loading indicator shown
  });

  it('should handle streaming response', async () => {
    // Mock SSE stream
    // Verify chunks appear progressively
    // Verify final message saved
  });
});
```

### 7.2 ProjectCard (`/src/components/dashboard/ProjectCard.tsx`)

```typescript
describe('ProjectCard', () => {
  const mockProject = {
    id: 'proj_1',
    name: 'Test Project',
    stage: 'ideation',
    description: 'A test project',
    milestones: [
      { id: 'm1', title: 'Task 1', isCompleted: true },
      { id: 'm2', title: 'Task 2', isCompleted: false },
    ],
  };

  it('should display project name and description', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('A test project')).toBeInTheDocument();
  });

  it('should show stage badge with correct color', () => {
    render(<ProjectCard project={mockProject} />);
    const badge = screen.getByText('Ideation');
    expect(badge).toHaveClass('bg-purple'); // or check style
  });

  it('should calculate progress correctly', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('50%')).toBeInTheDocument(); // 1/2 complete
  });

  it('should show first 3 milestones only', () => {
    const projectWithManyMilestones = {
      ...mockProject,
      milestones: Array(5).fill(null).map((_, i) => ({
        id: `m${i}`,
        title: `Task ${i + 1}`,
        isCompleted: false,
      })),
    };
    render(<ProjectCard project={projectWithManyMilestones} />);
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 3')).toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('should call onDelete when delete clicked', async () => {
    const onDelete = vi.fn();
    render(<ProjectCard project={mockProject} onDelete={onDelete} />);

    // Open dropdown, click delete
    await userEvent.click(screen.getByRole('button', { name: /menu/i }));
    await userEvent.click(screen.getByText(/delete/i));

    expect(onDelete).toHaveBeenCalledWith('proj_1');
  });

  it('should handle project with no milestones', () => {
    const projectNoMilestones = { ...mockProject, milestones: [] };
    render(<ProjectCard project={projectNoMilestones} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
```

### 7.3 NotificationBell (`/src/components/dashboard/NotificationBell.tsx`)

```typescript
describe('NotificationBell', () => {
  it('should fetch notifications on mount', async () => {
    render(<NotificationBell />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/notifications');
    });
  });

  it('should display unread count badge', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        data: [
          { id: '1', isRead: false },
          { id: '2', isRead: false },
          { id: '3', isRead: true },
        ],
      }),
    });

    render(<NotificationBell />);
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('should hide badge when all read', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        data: [{ id: '1', isRead: true }],
      }),
    });

    render(<NotificationBell />);
    await waitFor(() => {
      expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument();
    });
  });

  it('should mark notification as read on click', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        data: [{ id: 'n1', title: 'Test', message: 'Message', isRead: false }],
      }),
    });

    render(<NotificationBell />);
    await waitFor(() => screen.getByText('Test'));

    await userEvent.click(screen.getByText('Test'));

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/notifications/n1/read',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
```

---

## 8. Mocking Strategies

### 8.1 Database Mocks

```typescript
// src/__tests__/__mocks__/db.ts
import { vi } from 'vitest';

export const mockDb = {
  query: {
    users: { findFirst: vi.fn() },
    projects: { findFirst: vi.fn(), findMany: vi.fn() },
    // ... other tables
  },
  insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn() })) })),
  update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn() })) })) })),
  delete: vi.fn(() => ({ where: vi.fn() })),
};

vi.mock('@/lib/db/client', () => ({ db: mockDb }));
```

### 8.2 Clerk Mocks

```typescript
// src/__tests__/__mocks__/clerk.ts
import { vi } from 'vitest';

export const mockAuth = vi.fn().mockResolvedValue({ userId: 'test_user_id' });
export const mockCurrentUser = vi.fn().mockResolvedValue({
  id: 'test_user_id',
  emailAddresses: [{ emailAddress: 'test@example.com' }],
  firstName: 'Test',
  lastName: 'User',
});

vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth,
  currentUser: mockCurrentUser,
}));
```

### 8.3 OpenAI Mocks

```typescript
// src/__tests__/__mocks__/openai.ts
import { vi } from 'vitest';

export const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'Test response' } }],
      }),
    },
  },
};

vi.mock('openai', () => ({
  default: vi.fn(() => mockOpenAI),
}));
```

### 8.4 Anthropic Mocks

```typescript
// src/__tests__/__mocks__/anthropic.ts
import { vi } from 'vitest';

export const mockAnthropic = {
  messages: {
    create: vi.fn().mockResolvedValue({
      content: [{ text: 'Test response' }],
    }),
    stream: vi.fn().mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        yield { type: 'content_block_delta', delta: { text: 'Test' } };
      },
    }),
  },
};

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => mockAnthropic),
}));
```

### 8.5 Fetch Mock for Components

```typescript
// In component tests
beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ success: true, data: {} }),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

---

## 9. Test File Structure

```
src/
├── __tests__/
│   ├── setup.ts                    # Global test setup
│   ├── __mocks__/
│   │   ├── db.ts                   # Database mocks
│   │   ├── clerk.ts                # Clerk auth mocks
│   │   ├── openai.ts               # OpenAI SDK mocks
│   │   └── anthropic.ts            # Anthropic SDK mocks
│   │
│   ├── api/                        # API route tests
│   │   ├── projects.test.ts
│   │   ├── projects-id.test.ts
│   │   ├── milestones.test.ts
│   │   ├── conversations.test.ts
│   │   ├── messages.test.ts
│   │   ├── chat-stream.test.ts
│   │   ├── documents.test.ts
│   │   ├── documents-generate.test.ts
│   │   ├── notifications.test.ts
│   │   ├── preferences.test.ts
│   │   ├── onboarding.test.ts
│   │   ├── ideas.test.ts
│   │   ├── integrations.test.ts
│   │   └── ai/
│   │       ├── analyze-context.test.ts
│   │       ├── suggest-tasks.test.ts
│   │       └── daily-checkin.test.ts
│   │
│   ├── lib/                        # Library tests
│   │   ├── auth.test.ts
│   │   ├── db/
│   │   │   └── queries.test.ts
│   │   └── ai/
│   │       ├── openai.test.ts
│   │       ├── anthropic.test.ts
│   │       └── prompts.test.ts
│   │
│   ├── services/                   # Service tests
│   │   ├── ai/
│   │   │   ├── orchestrator.test.ts
│   │   │   └── streaming.test.ts
│   │   ├── context/
│   │   │   ├── engine.test.ts
│   │   │   └── analyzer.test.ts
│   │   ├── documents/
│   │   │   └── generator.test.ts
│   │   └── notifications/
│   │       └── sender.test.ts
│   │
│   └── components/                 # Component tests
│       ├── ai/
│       │   └── ChatInterface.test.tsx
│       └── dashboard/
│           ├── ProjectCard.test.tsx
│           └── NotificationBell.test.tsx
```

---

## 10. Priority Matrix

### P0 - Critical (Must Have)

| Area | Tests | Reason |
|------|-------|--------|
| Auth | `requireAuth`, `getCurrentUser` | Security critical |
| Projects API | CRUD operations | Core functionality |
| Chat Stream | Streaming, message save | Primary feature |
| Document Generation | All 3 types | Key value prop |

### P1 - High (Should Have)

| Area | Tests | Reason |
|------|-------|--------|
| Milestones | Completion flow | User engagement |
| Context Engine | Pattern detection | AI personalization |
| Notifications | Send/read flow | User retention |
| Database Queries | All CRUD | Data integrity |

### P2 - Medium (Nice to Have)

| Area | Tests | Reason |
|------|-------|--------|
| AI Clients | Provider routing | Flexibility |
| Prompts | Template building | Quality control |
| Components | UI interactions | UX consistency |
| Ideas/Leaderboard | Voting | Community feature |

### P3 - Low (Future)

| Area | Tests | Reason |
|------|-------|--------|
| Integrations | OAuth flows | Not fully implemented |
| Edge cases | Boundary conditions | Polish |
| Performance | Load testing | Scale |

---

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific file
npm test -- src/__tests__/api/projects.test.ts

# Run in watch mode
npm test -- --watch

# Run only P0 tests
npm test -- --grep "P0"
```

---

## Coverage Targets

| Category | Target | Rationale |
|----------|--------|-----------|
| API Routes | 90% | Critical paths |
| Services | 85% | Business logic |
| Database Queries | 80% | Data layer |
| Components | 70% | UI logic only |
| Utilities | 95% | Shared code |

---

## Next Steps

1. Install testing dependencies
2. Create vitest.config.ts
3. Set up mock files
4. Implement P0 tests first
5. Add to CI/CD pipeline
6. Expand coverage incrementally
