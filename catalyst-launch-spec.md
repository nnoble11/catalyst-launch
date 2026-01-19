# Catalyst Launch — Technical Project Specification

**Version**: 1.0  
**Last Updated**: January 2026  
**Project Type**: AI Co-Founder Platform  
**Target**: Self-paced startup accelerator from idea → launch

---

## Executive Summary

Catalyst Launch is an AI-powered anticipatory assistant that guides founders through ideation → MVP → GTM. The core differentiator is **proactive intelligence**: the AI initiates conversations based on user context, behavior patterns, and integrated data sources (calendar, meetings, tasks) to surface the right work at the right time.

**Not a course. Not a tool library. An AI co-founder.**

---

## Technical Architecture

### Tech Stack

```yaml
Frontend:
  Framework: Next.js 14+ (App Router)
  Language: TypeScript
  Styling: Tailwind CSS
  UI Components: shadcn/ui
  State Management: React Context + Zustand (for complex state)
  
Backend:
  Runtime: Node.js 20+
  Framework: Express.js or tRPC (for type safety)
  Language: TypeScript
  
Database:
  Primary: PostgreSQL 15+
  Vector Store: Pinecone or Weaviate (for AI context/embeddings)
  Caching: Redis (session + API response caching)
  
AI Layer:
  Provider: OpenAI API (GPT-4 Turbo) or Anthropic Claude API
  Fallback: Support both, A/B test effectiveness
  Embeddings: OpenAI text-embedding-3-small
  
Authentication:
  Service: Clerk or Auth0
  Method: Email + OAuth (Google, GitHub)
  
Hosting:
  Frontend: Vercel
  Backend: Railway or Render
  Database: Neon (serverless Postgres) or Railway
  
Integrations:
  Calendar: Google Calendar API
  Meeting Intelligence: Granola API + Otter.ai
  Task Management: Notion API, Linear API
  Automation: Zapier/Make.com for rapid connections
  
Analytics:
  Product: PostHog (self-hosted or cloud)
  Logging: Better Stack or Axiom
```

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │  AI Chat     │  │ Integrations │      │
│  │  & Roadmap   │  │  Interface   │  │    Hub       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │ API Calls
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   REST API   │  │  WebSocket   │  │   Webhook    │      │
│  │   Endpoints  │  │   Server     │  │   Handler    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  PostgreSQL │  │ Vector DB   │  │   Redis     │
│  (User Data)│  │ (Embeddings)│  │   (Cache)   │
└─────────────┘  └─────────────┘  └─────────────┘
         ▲               ▲               ▲
         │               │               │
         └───────────────┴───────────────┘
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
┌─────────────────┐            ┌─────────────────┐
│  AI Orchestration│            │   Integration   │
│      Engine      │            │     Layer       │
│  - Context Mgmt  │            │  - Calendar     │
│  - Task Suggest. │            │  - Meetings     │
│  - Doc Gen       │            │  - Tasks        │
└─────────────────┘            └─────────────────┘
```

---

## Database Schema

### Core Tables

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  current_stage VARCHAR(50) -- 'ideation', 'mvp', 'gtm'
);

-- Projects (User's Startup Ideas)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  stage VARCHAR(50) NOT NULL, -- 'ideation', 'mvp', 'gtm'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB -- Flexible storage for custom fields
);

-- Milestones
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  stage VARCHAR(50) NOT NULL,
  order_index INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  metadata JSONB, -- AI model used, tokens, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- User Activities (for context engine)
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  activity_type VARCHAR(100) NOT NULL, -- 'meeting', 'task_completed', 'doc_created'
  activity_data JSONB NOT NULL,
  source VARCHAR(50), -- 'calendar', 'granola', 'manual'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Integrations
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL, -- 'google_calendar', 'granola', 'notion'
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  metadata JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Generated Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL, -- 'pitch_deck', 'prd', 'gtm_plan'
  title VARCHAR(255) NOT NULL,
  content JSONB NOT NULL, -- Structured document data
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Idea Leaderboard
CREATE TABLE public_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100),
  upvotes INTEGER DEFAULT 0,
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_milestones_project_id ON milestones(project_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX idx_integrations_user_id ON integrations(user_id);
```

---

## API Endpoints

### Authentication
```
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

### Projects
```
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
DELETE /api/projects/:id
```

### Milestones
```
GET    /api/projects/:id/milestones
POST   /api/projects/:id/milestones
PATCH  /api/milestones/:id
PATCH  /api/milestones/:id/complete
```

### AI Chat
```
GET    /api/conversations
POST   /api/conversations
GET    /api/conversations/:id/messages
POST   /api/conversations/:id/messages
WS     /api/chat/stream (WebSocket for real-time AI responses)
```

### AI Actions
```
POST   /api/ai/analyze-context     # Analyze user context, suggest next actions
POST   /api/ai/generate-document   # Generate pitch deck, PRD, etc.
POST   /api/ai/daily-checkin       # Initiate daily check-in flow
POST   /api/ai/suggest-tasks       # Get AI task suggestions
```

### Integrations
```
GET    /api/integrations
POST   /api/integrations/google-calendar/connect
POST   /api/integrations/granola/connect
DELETE /api/integrations/:id
GET    /api/integrations/calendar/events
POST   /api/integrations/calendar/sync
```

### Documents
```
GET    /api/documents
POST   /api/documents/generate
GET    /api/documents/:id
PATCH  /api/documents/:id
DELETE /api/documents/:id
```

### Public Features
```
GET    /api/ideas/leaderboard
POST   /api/ideas
POST   /api/ideas/:id/upvote
```

---

## Core System Components

### 1. AI Orchestration Engine

**Location**: `/src/services/ai/orchestrator.ts`

**Responsibilities**:
- Manage AI context window (user history, recent activities, project state)
- Route requests to appropriate AI prompt templates
- Handle streaming responses
- Track token usage and costs

**Key Functions**:
```typescript
interface AIOrchestrator {
  analyzeUserContext(userId: string): Promise<ContextAnalysis>;
  suggestNextActions(userId: string, projectId: string): Promise<ActionSuggestion[]>;
  generateDocument(type: DocumentType, context: ProjectContext): Promise<Document>;
  initiateCheckIn(userId: string): Promise<CheckInPrompt>;
  streamChatResponse(conversationId: string, message: string): AsyncGenerator<string>;
}
```

**Context Analysis Flow**:
1. Query recent activities (last 7 days)
2. Get current project milestones & completion status
3. Pull latest calendar events + meeting notes
4. Generate embeddings of user's work
5. Search vector DB for relevant patterns
6. Synthesize into actionable insights

---

### 2. Context Engine

**Location**: `/src/services/context/engine.ts`

**Responsibilities**:
- Aggregate data from integrations (calendar, meetings, tasks)
- Build comprehensive user context for AI
- Detect patterns (stalls, momentum, pivots)
- Trigger proactive notifications

**Data Sources**:
```typescript
interface UserContext {
  recentActivities: Activity[];      // Last 14 days
  upcomingEvents: CalendarEvent[];   // Next 7 days
  projectState: {
    stage: 'ideation' | 'mvp' | 'gtm';
    completedMilestones: number;
    totalMilestones: number;
    lastActivity: Date;
  };
  integrationData: {
    recentMeetings: MeetingInsight[];
    openTasks: Task[];
  };
  behaviorPatterns: {
    avgDailyActivity: number;
    longestStreak: number;
    currentStreak: number;
  };
}
```

**Trigger Logic**:
```typescript
// Example: Detect stall
if (daysSinceLastActivity > 5 && project.stage === 'mvp') {
  triggerNotification({
    type: 'stall_detected',
    message: "No progress in 5 days—let's diagnose blockers",
    priority: 'high'
  });
}

// Example: Post-meeting action
if (recentMeetings.length > 0 && recentMeetings[0].topic.includes('user interview')) {
  suggestAction({
    type: 'synthesize_feedback',
    message: "You just talked to a user—let's capture insights and update your roadmap"
  });
}
```

---

### 3. Proactive Notification System

**Location**: `/src/services/notifications/scheduler.ts`

**Notification Types**:
- **Daily Digest** (9am user timezone): Focus for the day
- **Real-Time Triggers**: Post-meeting, milestone completion, stall detection
- **Weekly Review** (Friday 4pm): Progress summary + strategic nudges

**Delivery Channels**:
- In-app notifications
- Email (for critical items)
- Optional: SMS/Slack (future)

**Implementation**:
```typescript
// Cron job for daily digest
cron.schedule('0 9 * * *', async () => {
  const users = await getActiveUsers();
  for (const user of users) {
    const context = await contextEngine.getUserContext(user.id);
    const digest = await aiOrchestrator.generateDailyDigest(context);
    await notificationService.send(user.id, digest);
  }
});

// Event-driven for real-time
eventBus.on('meeting.completed', async (event) => {
  const suggestion = await aiOrchestrator.suggestNextActions(event.userId, event.projectId);
  await notificationService.sendRealTime(event.userId, suggestion);
});
```

---

### 4. Integration Layer

**Location**: `/src/services/integrations/`

**Structure**:
```
integrations/
├── base/
│   └── Integration.interface.ts
├── calendar/
│   ├── GoogleCalendarIntegration.ts
│   └── CalendarSync.service.ts
├── meetings/
│   ├── GranolaIntegration.ts
│   └── OtterIntegration.ts
└── tasks/
    ├── NotionIntegration.ts
    └── LinearIntegration.ts
```

**Base Interface**:
```typescript
interface Integration {
  connect(userId: string, authCode: string): Promise<void>;
  disconnect(userId: string): Promise<void>;
  sync(userId: string): Promise<SyncResult>;
  fetchData(userId: string, params: FetchParams): Promise<any>;
}
```

**Google Calendar Integration**:
```typescript
class GoogleCalendarIntegration implements Integration {
  async sync(userId: string): Promise<SyncResult> {
    const integration = await getIntegration(userId, 'google_calendar');
    const events = await googleCalendar.events.list({
      auth: integration.accessToken,
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 50
    });
    
    // Store events as activities
    for (const event of events.data.items) {
      await createActivity({
        userId,
        activityType: 'calendar_event',
        activityData: {
          title: event.summary,
          start: event.start.dateTime,
          attendees: event.attendees
        },
        source: 'google_calendar'
      });
    }
    
    return { synced: events.data.items.length };
  }
}
```

---

### 5. Document Generation System

**Location**: `/src/services/documents/generator.ts`

**Supported Document Types**:
1. Pitch Deck (slides in JSON format → export to PDF/PPT)
2. Product Requirements Document (PRD)
3. User Interview Script
4. Go-to-Market Plan
5. Financial Model (basic unit economics)

**Generation Flow**:
```typescript
async function generateDocument(
  type: DocumentType,
  projectContext: ProjectContext
): Promise<Document> {
  // 1. Build document-specific prompt
  const prompt = buildDocumentPrompt(type, projectContext);
  
  // 2. Call AI API with structured output
  const aiResponse = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      { role: 'system', content: DOCUMENT_SYSTEM_PROMPTS[type] },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' }
  });
  
  // 3. Parse and validate structure
  const documentData = JSON.parse(aiResponse.choices[0].message.content);
  validateDocumentStructure(type, documentData);
  
  // 4. Save to database
  const document = await createDocument({
    userId: projectContext.userId,
    projectId: projectContext.projectId,
    documentType: type,
    content: documentData
  });
  
  return document;
}
```

**Example Prompt (Pitch Deck)**:
```typescript
const PITCH_DECK_PROMPT = `
Generate a 10-slide investor pitch deck in JSON format for the following startup:

Company: ${project.name}
Description: ${project.description}
Stage: ${project.stage}
Target Market: ${project.targetMarket}
Problem: ${project.problemStatement}
Solution: ${project.solutionStatement}

Return JSON with this structure:
{
  "slides": [
    {
      "slideNumber": 1,
      "title": "string",
      "content": ["bullet point 1", "bullet point 2"],
      "speakerNotes": "string"
    }
  ]
}

Slides should cover: Problem, Solution, Market Size, Product, Business Model, Traction, Competition, Team, Financials, Ask.
`;
```

---

### 6. Milestone Tracking System

**Location**: `/src/services/milestones/tracker.ts`

**Default Milestones by Stage**:

```typescript
const DEFAULT_MILESTONES = {
  ideation: [
    { title: 'Problem validated through user research', order: 1 },
    { title: 'Target customer profile defined', order: 2 },
    { title: 'Competitive landscape analyzed', order: 3 },
    { title: 'Unique value proposition articulated', order: 4 },
    { title: 'Initial business model hypothesized', order: 5 }
  ],
  mvp: [
    { title: 'MVP feature set defined', order: 1 },
    { title: 'Tech stack selected', order: 2 },
    { title: 'First version built and deployed', order: 3 },
    { title: '10+ user tests completed', order: 4 },
    { title: 'Product-market fit signals identified', order: 5 }
  ],
  gtm: [
    { title: 'Positioning and messaging finalized', order: 1 },
    { title: 'Launch channels selected', order: 2 },
    { title: 'Marketing assets created', order: 3 },
    { title: 'First 100 users acquired', order: 4 },
    { title: 'Unit economics validated', order: 5 }
  ]
};
```

**Progress Calculation**:
```typescript
function calculateProgress(projectId: string): ProgressMetrics {
  const milestones = getMilestones(projectId);
  const completed = milestones.filter(m => m.completed).length;
  const total = milestones.length;
  
  return {
    completionRate: completed / total,
    currentMilestone: milestones.find(m => !m.completed),
    estimatedDaysToComplete: calculateVelocity(projectId) * (total - completed),
    momentum: calculateMomentum(projectId) // based on recent completion rate
  };
}
```

---

## File Structure

```
catalyst-launch/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Main dashboard
│   │   │   ├── projects/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx      # Project detail
│   │   │   │   │   └── chat/
│   │   │   │   │       └── page.tsx  # AI chat for project
│   │   │   ├── integrations/
│   │   │   └── documents/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── projects/
│   │   │   ├── ai/
│   │   │   ├── integrations/
│   │   │   └── webhooks/
│   │   └── layout.tsx
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── dashboard/
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── MilestoneProgress.tsx
│   │   │   └── ActivityFeed.tsx
│   │   ├── ai/
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── SuggestedActions.tsx
│   │   │   └── DocumentPreview.tsx
│   │   └── integrations/
│   │       └── IntegrationCard.tsx
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── client.ts             # Postgres client
│   │   │   ├── schema.ts             # Drizzle ORM schema
│   │   │   └── queries/
│   │   ├── ai/
│   │   │   ├── openai.ts             # OpenAI client
│   │   │   ├── anthropic.ts          # Claude client
│   │   │   └── prompts/              # Prompt templates
│   │   ├── auth/
│   │   │   └── clerk.ts
│   │   └── utils/
│   │
│   ├── services/
│   │   ├── ai/
│   │   │   ├── orchestrator.ts
│   │   │   ├── embeddings.ts
│   │   │   └── streaming.ts
│   │   ├── context/
│   │   │   ├── engine.ts
│   │   │   └── analyzer.ts
│   │   ├── notifications/
│   │   │   ├── scheduler.ts
│   │   │   └── sender.ts
│   │   ├── integrations/
│   │   │   ├── base/
│   │   │   ├── calendar/
│   │   │   ├── meetings/
│   │   │   └── tasks/
│   │   ├── documents/
│   │   │   ├── generator.ts
│   │   │   └── templates/
│   │   └── milestones/
│   │       └── tracker.ts
│   │
│   ├── types/
│   │   ├── database.ts
│   │   ├── ai.ts
│   │   └── integrations.ts
│   │
│   └── config/
│       ├── ai.ts
│       ├── integrations.ts
│       └── constants.ts
│
├── prisma/                           # Or drizzle/
│   └── schema.prisma
│
├── public/
│   └── assets/
│
├── .env.example
├── .env.local
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

---

## Environment Variables

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/catalyst_launch

# Redis
REDIS_URL=redis://localhost:6379

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Vector Database (Pinecone)
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX=catalyst-launch

# Google Calendar
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google-calendar/callback

# Granola (Meeting Intelligence)
GRANOLA_API_KEY=...

# Notion
NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...

# Analytics (PostHog)
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Email (Resend)
RESEND_API_KEY=re_...
```

---

## MVP Implementation Roadmap

### Phase 1: Foundation (Weeks 1-3)

**Week 1: Setup & Authentication**
- [ ] Initialize Next.js project with TypeScript + Tailwind
- [ ] Set up PostgreSQL database (local + Neon)
- [ ] Integrate Clerk authentication
- [ ] Create base database schema
- [ ] Set up Vercel deployment pipeline

**Week 2: Core UI & Data Models**
- [ ] Build dashboard layout
- [ ] Create project CRUD operations
- [ ] Implement milestone system
- [ ] Design and build onboarding flow
- [ ] Set up React Context for global state

**Week 3: AI Integration Basics**
- [ ] Set up OpenAI/Anthropic API client
- [ ] Build basic chat interface
- [ ] Create prompt template system
- [ ] Implement conversation storage
- [ ] Add streaming response support

---

### Phase 2: Intelligence Layer (Weeks 4-6)

**Week 4: Context Engine**
- [ ] Build activity tracking system
- [ ] Create context aggregation service
- [ ] Implement pattern detection logic
- [ ] Set up Redis caching for context

**Week 5: AI Orchestration**
- [ ] Build AI orchestrator service
- [ ] Create document generation system (3 templates)
- [ ] Implement task suggestion logic
- [ ] Add daily check-in flow

**Week 6: Proactive Features**
- [ ] Build notification scheduler
- [ ] Implement trigger system (meetings, stalls, etc.)
- [ ] Create notification UI components
- [ ] Set up email delivery (Resend)

---

### Phase 3: Integrations (Weeks 7-9)

**Week 7: Google Calendar**
- [ ] Implement OAuth flow
- [ ] Build sync service
- [ ] Create activity ingestion from events
- [ ] Add calendar event display in dashboard

**Week 8: Meeting Intelligence**
- [ ] Integrate Granola API
- [ ] Build meeting insight extraction
- [ ] Create post-meeting AI prompts
- [ ] Add meeting notes to context

**Week 9: Task Management (Notion/Linear)**
- [ ] Implement Notion OAuth
- [ ] Build task sync service
- [ ] Create bidirectional task creation
- [ ] Add task completion tracking

---

### Phase 4: Polish & Launch Prep (Weeks 10-12)

**Week 10: Document Templates & UX**
- [ ] Complete all 5 document templates
- [ ] Build document preview/export
- [ ] Implement progress visualization
- [ ] Add onboarding tutorial

**Week 11: Idea Leaderboard & Social**
- [ ] Build public idea submission
- [ ] Create leaderboard UI
- [ ] Implement upvoting system
- [ ] Add social sharing features

**Week 12: Testing & Optimization**
- [ ] Load testing & performance optimization
- [ ] Bug fixes and edge case handling
- [ ] Set up analytics tracking (PostHog)
- [ ] Write deployment documentation
- [ ] Launch to private beta users

---

## Key Implementation Details

### AI Prompt Engineering

**System Prompt Template** (Anticipatory Assistant):
```typescript
const SYSTEM_PROMPT = `You are an AI co-founder for ${user.name}'s startup, ${project.name}.

Your role is to:
1. Proactively identify what the founder should work on next
2. Anticipate blockers before they occur
3. Suggest concrete actions based on recent context
4. Be opinionated but collaborative

Current Context:
- Stage: ${project.stage}
- Last Activity: ${lastActivity}
- Recent Meetings: ${recentMeetings}
- Completed Milestones: ${completedMilestones}/${totalMilestones}

Communication Style:
- Direct and action-oriented
- Use "we" language (co-founder, not assistant)
- Be specific, not generic
- Focus on the next 1-3 actions, not overwhelming lists

Never say "I notice" or "Based on the data" - you're a co-founder, not an observer.`;
```

**Example Action Prompt**:
```typescript
const ACTION_PROMPT = `Based on this context, what are the 1-3 most important things we should focus on today?

Recent Activity:
${JSON.stringify(recentActivity, null, 2)}

Current Blockers:
${blockers}

Consider:
- What's blocking progress?
- What's the fastest path to the next milestone?
- What external dependencies exist?

Format: Return JSON array of actions with 'title', 'reasoning', 'urgency' (high/medium/low)`;
```

---

### WebSocket Implementation for Real-Time AI

```typescript
// /src/app/api/chat/stream/route.ts
import { createParser } from 'eventsource-parser';

export async function POST(req: Request) {
  const { conversationId, message } = await req.json();
  
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Start AI streaming in background
  (async () => {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: await buildMessages(conversationId, message),
      stream: true
    });

    for await (const chunk of response) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        await writer.write(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
      }
    }
    
    await writer.close();
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

---

### Vector Database for Context Search

```typescript
// /src/services/ai/embeddings.ts
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.index('catalyst-launch');

export async function indexActivity(activity: Activity) {
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: `${activity.activityType}: ${JSON.stringify(activity.activityData)}`
  });

  await index.upsert([{
    id: activity.id,
    values: embedding.data[0].embedding,
    metadata: {
      userId: activity.userId,
      projectId: activity.projectId,
      type: activity.activityType,
      timestamp: activity.createdAt.toISOString()
    }
  }]);
}

export async function findSimilarActivities(query: string, userId: string, limit = 5) {
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query
  });

  const results = await index.query({
    vector: embedding.data[0].embedding,
    filter: { userId },
    topK: limit,
    includeMetadata: true
  });

  return results.matches;
}
```

---

## Testing Strategy

### Unit Tests
```typescript
// Example: Context Engine
describe('ContextEngine', () => {
  it('should detect stall when no activity for 5+ days', async () => {
    const context = await contextEngine.getUserContext(userId);
    const triggers = contextEngine.analyzeTriggers(context);
    
    expect(triggers).toContainEqual({
      type: 'stall_detected',
      priority: 'high'
    });
  });
  
  it('should suggest post-meeting action after user interview', async () => {
    await createActivity({
      userId,
      activityType: 'meeting',
      activityData: { topic: 'user interview', attendees: 1 }
    });
    
    const suggestions = await aiOrchestrator.suggestNextActions(userId, projectId);
    
    expect(suggestions[0].type).toBe('synthesize_feedback');
  });
});
```

### Integration Tests
```typescript
// Example: End-to-end document generation
describe('Document Generation Flow', () => {
  it('should generate pitch deck from project context', async () => {
    const document = await generateDocument('pitch_deck', {
      userId,
      projectId,
      projectData: mockProject
    });
    
    expect(document.content.slides).toHaveLength(10);
    expect(document.content.slides[0].title).toBe('Problem');
  });
});
```

---

## Success Metrics & Analytics

**Track in PostHog**:

```typescript
// User engagement
posthog.capture('project_created', { stage: 'ideation' });
posthog.capture('milestone_completed', { milestone_id, time_to_complete });
posthog.capture('ai_suggestion_accepted', { suggestion_type });
posthog.capture('ai_suggestion_ignored', { suggestion_type });
posthog.capture('document_generated', { document_type });
posthog.capture('integration_connected', { integration_type });

// Funnel tracking
posthog.capture('onboarding_step_completed', { step: 1 });
posthog.capture('first_milestone_completed', { days_since_signup });
posthog.capture('mvp_launched', { days_since_signup });

// AI performance
posthog.capture('ai_response_time', { duration_ms, model });
posthog.capture('ai_token_usage', { tokens, cost_usd });
```

**Dashboard KPIs**:
- DAU/WAU ratio
- Average milestones completed per user
- AI suggestion acceptance rate
- Time from signup → first milestone
- Time from signup → MVP launch
- Integration adoption rate
- Document generation volume

---

## Security Considerations

### Data Protection
```typescript
// Encrypt sensitive integration tokens
import crypto from 'crypto';

function encryptToken(token: string): string {
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(process.env.ENCRYPTION_KEY, 'hex'),
    crypto.randomBytes(16)
  );
  return cipher.update(token, 'utf8', 'hex') + cipher.final('hex');
}

function decryptToken(encrypted: string): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(process.env.ENCRYPTION_KEY, 'hex'),
    Buffer.from(encrypted.slice(0, 32), 'hex')
  );
  return decipher.update(encrypted.slice(32), 'hex', 'utf8') + decipher.final('utf8');
}
```

### Rate Limiting
```typescript
// Protect AI endpoints from abuse
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
  analytics: true
});

export async function checkRateLimit(userId: string) {
  const { success, limit, reset } = await ratelimit.limit(`ai:${userId}`);
  if (!success) {
    throw new Error('Rate limit exceeded');
  }
}
```

---

## Deployment Checklist

### Pre-Launch
- [ ] All environment variables set in Vercel
- [ ] Database migrations applied to production
- [ ] SSL certificates configured
- [ ] DNS records set up
- [ ] Rate limiting enabled
- [ ] Error tracking configured (Sentry)
- [ ] Analytics tracking verified
- [ ] Email delivery tested
- [ ] Integration OAuth flows tested end-to-end
- [ ] Load testing completed

### Launch Day
- [ ] Deploy to production
- [ ] Verify all API endpoints
- [ ] Test user signup flow
- [ ] Test AI chat streaming
- [ ] Monitor error rates
- [ ] Check database performance
- [ ] Verify integration webhooks

### Post-Launch
- [ ] Monitor user feedback
- [ ] Track key metrics daily
- [ ] Iterate on AI prompts based on usage
- [ ] Optimize slow queries
- [ ] Plan next feature release

---

## Future Enhancements (Post-MVP)

### V2 Features
- Advanced financial modeling (cap table, fundraising scenarios)
- Team collaboration (multi-user projects)
- White-label for universities/accelerators
- Mobile app (React Native)
- Fundraising CRM (investor tracking, warm intros)
- AI-powered code generation for MVP
- Voice interface for check-ins
- Integration marketplace (100+ tools)

### Platform Intelligence
- Predictive success scoring (which startups will succeed)
- Founder behavior pattern library
- Automated deal sourcing signals for Catalyst Labs
- Peer benchmarking (compare progress to similar startups)

---

## Getting Started (Quick Start)

```bash
# Clone repo
git clone https://github.com/catalyst-labs/catalyst-launch.git
cd catalyst-launch

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Fill in API keys

# Set up database
npm run db:push

# Run development server
npm run dev

# Open http://localhost:3000
```

---

## Support & Documentation

- **Internal Docs**: `/docs` folder in repo
- **API Reference**: Automatically generated from tRPC or OpenAPI
- **Architecture Decisions**: ADR format in `/docs/decisions`

---

## Appendix: AI Prompt Library

### Document Generation Prompts

**Pitch Deck**:
See inline example above in Document Generation System section.

**Product Requirements Document (PRD)**:
```
Generate a comprehensive PRD for ${project.name}.

Context:
- Problem: ${problem}
- Solution: ${solution}
- Target Users: ${targetUsers}
- Stage: ${stage}

Structure the PRD with these sections:
1. Overview (problem, solution, goals)
2. User Personas
3. User Stories & Use Cases
4. Feature Requirements (must-have, nice-to-have)
5. Non-Functional Requirements (performance, security, scalability)
6. Success Metrics
7. Technical Considerations
8. Launch Plan

Return as JSON with sections as keys, content as arrays of paragraphs/bullets.
```

**Go-to-Market Plan**:
```
Create a GTM plan for launching ${project.name}.

Context:
- Product: ${description}
- Target Market: ${targetMarket}
- Stage: ${stage}
- Resources: ${resources}

Include:
1. Positioning & Messaging
2. Target Channels (paid, organic, partnerships)
3. Launch Timeline (30/60/90 day plan)
4. Success Metrics & KPIs
5. Budget Allocation
6. Risk Mitigation

Return as structured JSON.
```

---

**End of Specification**

This document is the single source of truth for building Catalyst Launch MVP. Update as decisions are made and architecture evolves.
