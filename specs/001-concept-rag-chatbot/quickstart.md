# Quickstart: Notion RAG Chatbot

**Created**: 2025-10-28  
**Purpose**: Quick start guide for setting up and running the Notion RAG Chatbot  
**Target**: Developers setting up the project locally

## Prerequisites

- Node.js 20+ and npm/yarn/pnpm
- Notion workspace with API access (Integration token)
- Supabase account (free tier is sufficient)
- OpenAI API key
- Google account (for NextAuth)

## Setup (10 minutes)

### 1. Clone and Install

```bash
# Clone repository
git clone <repository-url>
cd notion-rag

# Install dependencies
pnpm install  # or npm install, yarn install

# Install Supabase CLI (optional, for local development)
npm install -g supabase
```

### 2. Environment Configuration

Create `.env.local` file in project root:

```bash
# Notion API
NOTION_API_KEY=secret_your_notion_integration_token
NOTION_WORKSPACE_ID=your_workspace_id

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=sk-your_openai_api_key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_generate_with_openssl

# Google OAuth (for NextAuth)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Optional: Deployment
VERCEL_URL=your_deployment_url  # or FIREBASE_PROJECT_ID
```

**Security Note**: Never commit `.env.local` to version control. Add to `.gitignore`.

---

### 3. Database Setup

#### Option A: Supabase Cloud (Recommended)

1. Create project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Run migration script (see `database/migrations/001_initial.sql`)
4. Enable pgvector extension: `CREATE EXTENSION IF NOT EXISTS vector;`

#### Option B: Local Supabase (Self-hosted)

```bash
# Initialize Supabase locally
supabase init
supabase start

# Run migrations
supabase db push

# Access local dashboard at http://localhost:54323
```

---

### 4. Run Database Migrations

```bash
# Using Supabase CLI (if local)
supabase db reset

# Or manually run SQL from database/migrations/
```

**Required Tables**:

- `notion_pages`
- `notion_blocks`
- `chat_sessions`
- `chat_messages`
- `chat_citations`
- `collections`
- `collection_conversations`
- `sync_jobs`

---

### 5. Start Development Server

```bash
# Start Next.js dev server
pnpm dev  # or npm run dev

# App runs at http://localhost:3000
```

---

## First Run

### 1. Authenticate

1. Navigate to `http://localhost:3000/sign-in`
2. Sign in with Google
3. Complete OAuth flow
4. Redirected to chat interface

### 2. Configure Notion Connection

1. Go to Settings → Notion Integration
2. Enter your Notion API key
3. Test connection: "Connect to Notion"
4. Verify workspace appears in sync status

### 3. Trigger Initial Sync

**Manual Sync** (Recommended for first run):

1. Go to Settings → Sync
2. Click "Start Sync"
3. Wait for progress indicator
4. Check sync job status in dashboard

**Expected**:

- Pages processed: All pages in workspace
- Blocks processed: ~5-10 per page (variable)
- Embeddings created: ~5-10 per page (1536 dimensions)
- Duration: 2-5 minutes for 100 pages

### 4. Test Chat Interface

1. Go to Chat interface
2. Ask a question: "What is [topic] from my notes?"
3. Verify:
   - Response includes summary + quote format
   - Minimum 2 citation links appear
   - Links are clickable and open Notion pages
   - Response time <3 seconds (P95)

---

## API Endpoints

### Chat API

```typescript
POST /api/chat
Content-Type: application/json

{
  "message": "What are embeddings used for?",
  "session_id": "optional-existing-session-id"
}

Response:
{
  "id": "message-id",
  "content": "Embeddings are used for [summary]...",
  "citations": [
    {
      "title": "Vector Embeddings",
      "url": "https://notion.so/page-id",
      "snippet": "...",
      "relevance_score": 0.92
    }
  ]
}
```

### Sync API

```typescript
// Trigger manual sync
POST /api/sync/trigger
Authorization: Bearer <session_token>

Response:
{
  "job_id": "sync-job-id",
  "status": "running",
  "started_at": "2025-10-28T12:00:00Z"
}

// Check sync status
GET /api/sync/status/:job_id

Response:
{
  "status": "completed",
  "pages_processed": 25,
  "blocks_processed": 250,
  "embeddings_created": 250,
  "completed_at": "2025-10-28T12:03:00Z"
}
```

### Collections API

```typescript
// Create collection
POST /api/collections
{
  "name": "ML Basics",
  "description": "Machine learning concepts"
}

// Save conversation to collection
POST /api/collections/:id/conversations
{
  "session_id": "session-id",
  "tags": ["algorithms", "embeddings"]
}
```

---

## Monitoring

### Dashboard Access

- **Local**: `http://localhost:3000/dashboard`
- **Supabase**: Project Dashboard → Logs

### Key Metrics

1. **Sync Status**: Last successful sync timestamp
2. **Chat Volume**: Requests per day
3. **Response Time**: P50, P95, P99 latencies
4. **Citation Coverage**: Average citations per response
5. **Quality**: Accuracy@k, failure rate

### Logging

```bash
# View logs (local development)
tail -f logs/notion-sync.log

# Supabase logs
supabase db logs  # if using local Supabase
```

**Log Location**:

- Application logs: `stdout` (Next.js dev server)
- Error logs: `logs/error.log`
- Sync logs: `logs/sync-*.log`

---

## Troubleshooting

### Common Issues

#### 1. Authentication Failure

**Symptom**: "Sign in" redirects to error page

**Solution**:

- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`
- Check Google OAuth consent screen configuration
- Ensure redirect URI matches `NEXTAUTH_URL`

#### 2. Notion Sync Fails

**Symptom**: "Failed to sync Notion workspace"

**Solution**:

- Verify `NOTION_API_KEY` is correct
- Check Notion Integration has "Read" permissions
- Ensure workspace is shared with integration
- Check Notion API rate limits (3 req/s)

#### 3. No Embeddings Generated

**Symptom**: "No results found" in chat

**Solution**:

- Run initial sync: Settings → Sync → Start Sync
- Verify `OPENAI_API_KEY` is valid
- Check Supabase connection (pgvector extension enabled)
- Review sync logs for errors

#### 4. Slow Response Times

**Symptom**: Responses take >5 seconds

**Solution**:

- Check embedding dimensions match (1536 for text-embedding-3-small)
- Optimize pgvector index: `CREATE INDEX ... USING ivfflat`
- Enable caching with `revalidateTag`
- Review batch size for embeddings (512-1024 tokens)

---

## Next Steps

1. **Customize UI**: Modify `app/components/chat/` for branding
2. **Add Collections**: Implement collection management features
3. **Optimize Sync**: Tune chunking strategy for your content
4. **Deploy**: Follow deployment guide (Vercel or Firebase)

---

## Production Deployment

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Link Supabase project
```

### Firebase Deployment

```bash
# Install Firebase CLI
npm i -g firebase-tools

# Initialize and deploy
firebase init
firebase deploy
```

---

**Quickstart Complete**: You're ready to build your personal knowledge archive!

For detailed implementation, see `plan.md` and `spec.md`.
