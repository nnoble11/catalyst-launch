# Catalyst Launch

AI-powered startup accelerator platform built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- **AI Startup Coach**: Get personalized guidance powered by OpenAI GPT-4 or Anthropic Claude
- **Project Management**: Track your startup projects with customizable milestones
- **Document Generation**: Generate pitch decks, PRDs, and go-to-market plans
- **Idea Leaderboard**: Share and vote on startup ideas
- **Integrations Hub**: Connect with Google Calendar, Notion, and Slack (coming soon)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Clerk
- **AI**: OpenAI API, Anthropic API
- **State Management**: Zustand

## Prerequisites

- Node.js 18+
- PostgreSQL database (or use Neon free tier)
- Clerk account
- OpenAI API key

## Getting Started

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd catalyst-launch
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key
- `CLERK_SECRET_KEY`: Clerk secret key
- `OPENAI_API_KEY`: OpenAI API key

### 3. Set Up Database

Generate and run database migrations:

```bash
npm run db:generate
npm run db:push
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── (dashboard)/       # Protected dashboard pages
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── dashboard/        # Dashboard-specific components
│   ├── ai/               # AI-related components
│   └── integrations/     # Integration components
├── lib/                   # Utility functions and clients
│   ├── db/               # Database schema and queries
│   └── ai/               # AI client configurations
├── services/              # Business logic services
│   ├── ai/               # AI orchestration
│   ├── context/          # Context engine
│   ├── documents/        # Document generation
│   ├── integrations/     # Integration handlers
│   └── notifications/    # Notification system
├── config/                # App configuration
└── types/                 # TypeScript types
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate database migrations
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Drizzle Studio

## Database Schema

The app uses 9 main tables:
- `users` - User profiles and preferences
- `projects` - Startup projects
- `milestones` - Project milestones
- `conversations` - AI chat conversations
- `messages` - Chat messages
- `activities` - User activity tracking
- `documents` - Generated documents
- `notifications` - In-app notifications
- `ideas` - Leaderboard ideas

## API Keys Setup

### Clerk (Authentication)
1. Create account at [clerk.com](https://clerk.com)
2. Create new application
3. Copy publishable key and secret key

### OpenAI (AI Chat)
1. Get API key from [platform.openai.com](https://platform.openai.com)
2. Ensure you have GPT-4 access

### Optional: Anthropic (Alternative AI)
1. Get API key from [console.anthropic.com](https://console.anthropic.com)

### Database (PostgreSQL)
1. Use [Neon](https://neon.tech) free tier or any PostgreSQL provider
2. Copy the connection string

## License

MIT
