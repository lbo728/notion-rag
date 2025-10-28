# Data Model: Notion RAG Chatbot

**Created**: 2025-10-28  
**Purpose**: Define data models for Notion pages, chat sessions, collections, and sync jobs  
**Database**: Supabase PostgreSQL with pgvector extension

## Overview

The data model consists of four main entity types:

- **Notion Pages/Blocks**: Source documents and chunks with embeddings
- **Chat Sessions**: User conversations with messages and citations
- **Collections**: User-created bookmarks for saved conversations
- **Sync Jobs**: Execution records for incremental Notion synchronization

## Entity Definitions

### 1. Notion Page

**Table**: `notion_pages`

Stores metadata about Notion pages synced into the system.

```sql
CREATE TABLE notion_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id TEXT NOT NULL UNIQUE,        -- Notion page ID
  title TEXT,
  url TEXT NOT NULL,
  properties JSONB,                    -- tags, status, editor metadata
  last_edited_time TIMESTAMPTZ,
  last_edited_by TEXT,
  created_time TIMESTAMPTZ,
  created_by TEXT,
  parent_page_id TEXT,                 -- For page hierarchy
  workspace_id TEXT,                    -- Notion workspace ID
  synced_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  INDEX idx_last_edited_time (last_edited_time),
  INDEX idx_page_id (page_id)
);
```

**Validation Rules**:

- `page_id` must be unique
- `url` must be valid Notion URL
- `last_edited_time` must be ISO 8601 format
- `properties` must contain: tags (array), status (string), editor (string)

**State Transitions**:

- **New**: Page first encountered during sync
- **Updated**: `last_edited_time` changed since last sync
- **Deleted**: Page not found in current Notion workspace

---

### 2. Notion Block/Chunk

**Table**: `notion_blocks`

Stores parsed text chunks with embeddings for semantic search.

```sql
CREATE TABLE notion_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id TEXT NOT NULL REFERENCES notion_pages(page_id),
  block_id TEXT NOT NULL,              -- Notion block ID
  block_type TEXT,                     -- paragraph, heading, list_item, etc.
  content TEXT NOT NULL,                -- Parsed text content
  embedding vector(1536),              -- OpenAI embedding (text-embedding-3-small)
  metadata JSONB,                       -- original_block_format, tokens, overlap_info
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_page_block UNIQUE (page_id, block_id)
);

-- pgvector index for similarity search
CREATE INDEX idx_embedding_vector ON notion_blocks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**Validation Rules**:

- `embedding` dimension must be 1536 (OpenAI text-embedding-3-small)
- `content` must not be empty
- `page_id` and `block_id` together must be unique
- `metadata.tokens` must be within range (100-1000 tokens per chunk)

**Chunking Logic**:

- Variable-length based on paragraph/header boundaries
- 20-30% overlap between chunks to preserve context
- Preserve block-level attribution (pageId, blockId)
- Group related blocks (heading + paragraphs) into ~500 token chunks

---

### 3. Chat Session

**Table**: `chat_sessions`

Stores user conversations with message history and retrieval metadata.

```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,               -- NextAuth user ID
  session_name TEXT,                   -- Optional session name
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,      -- Track token usage
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  INDEX idx_user_id (user_id),
  INDEX idx_started_at (started_at)
);
```

**Validation Rules**:

- `user_id` must be valid authenticated user
- `session_name` is optional, max 100 characters
- `message_count` must be non-negative
- `total_tokens` tracks OpenAI token usage

**State Transitions**:

- **Active**: Session in progress (ended_at is NULL)
- **Ended**: User ended session (ended_at is set)
- **Archived**: Moved to collection (archived flag)

---

### 4. Chat Message

**Table**: `chat_messages`

Stores individual messages in a conversation.

```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,                   -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  INDEX idx_session_id (session_id),
  INDEX idx_role (role)
);
```

**Validation Rules**:

- `role` must be either 'user' or 'assistant'
- `content` must not be empty
- `session_id` must reference valid session

**Message Types**:

- **User Message**: User's question/prompt
- **Assistant Message**: Bot's response with citations

---

### 5. Chat Citation

**Table**: `chat_citations`

Stores source citations for each assistant message (minimum 2 per response).

```sql
CREATE TABLE chat_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES notion_blocks(id),
  page_id TEXT NOT NULL,
  block_id_text TEXT NOT NULL,        -- Notion block ID
  title TEXT,
  url TEXT NOT NULL,
  snippet TEXT,                        -- Excerpt from chunk
  relevance_score FLOAT,               -- Retrieval relevance score
  created_at TIMESTAMPTZ DEFAULT now(),
  INDEX idx_message_id (message_id),
  INDEX idx_block_id (block_id)
);
```

**Validation Rules**:

- Each assistant message must have at least 2 citations (Constitution Principle II)
- `url` must be valid Notion page URL
- `relevance_score` must be between 0 and 1
- `page_id` and `block_id_text` must reference valid Notion content

---

### 6. Collection

**Table**: `collections`

Stores user-created topic-based collections (bookmarks) for organizing saved conversations.

```sql
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  conversation_count INTEGER DEFAULT 0,
  INDEX idx_user_id (user_id)
);
```

**Validation Rules**:

- `name` must be unique per user
- `description` is optional, max 500 characters
- `user_id` must be valid authenticated user

---

### 7. Collection Conversation

**Table**: `collection_conversations`

Junction table linking conversations to collections with tags.

```sql
CREATE TABLE collection_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  tags TEXT[],                          -- Array of tags for search/filtering
  notes TEXT,                           -- User's optional notes
  saved_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_collection_session UNIQUE (collection_id, session_id),
  INDEX idx_collection_id (collection_id),
  INDEX idx_session_id (session_id)
);

-- GIN index for tag array searches
CREATE INDEX idx_tags ON collection_conversations USING GIN (tags);
```

**Validation Rules**:

- Each session can belong to multiple collections
- `tags` must be array of non-empty strings
- `notes` is optional, max 1000 characters
- Unique constraint on collection_id + session_id

---

### 8. Sync Job

**Table**: `sync_jobs`

Stores execution records for incremental Notion synchronization.

```sql
CREATE TABLE sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,               -- 'scheduled' or 'manual' or 'retry'
  status TEXT NOT NULL,                 -- 'running', 'completed', 'failed', 'cancelled'
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  pages_processed INTEGER DEFAULT 0,
  blocks_processed INTEGER DEFAULT 0,
  embeddings_created INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB,                       -- Sync parameters, filtering criteria
  created_at TIMESTAMPTZ DEFAULT now(),
  INDEX idx_status (status),
  INDEX idx_started_at (started_at)
);
```

**Validation Rules**:

- `job_type` must be one of: 'scheduled', 'manual', 'retry'
- `status` must be one of: 'running', 'completed', 'failed', 'cancelled'
- `pages_processed`, `blocks_processed`, `embeddings_created` must be non-negative
- `error_message` must be provided if `status` is 'failed'

**State Transitions**:

- **Created**: Job initialized, status='running'
- **In Progress**: Processing Notion pages
- **Completed**: Successfully processed all changes
- **Failed**: Error occurred, stores error_message
- **Cancelled**: User or system cancelled job

---

## Relationships

### Entity Relationship Diagram

```
notion_pages (1) ←→ (N) notion_blocks
  ↓
  ↓ (1)
  ↓
  ↓ (N)
chat_citations

chat_sessions (1) ←→ (N) chat_messages
  ↓
  ↓ (N)
  ↓
chat_citations

collections (1) ←→ (N) collection_conversations (N) ←→ (1) chat_sessions
```

### Key Relationships

1. **Notion Pages → Blocks**: One page has many blocks/chunks
2. **Chat Sessions → Messages**: One session has many messages (conversation turns)
3. **Messages → Citations**: Each assistant message has minimum 2 citations
4. **Citations → Blocks**: Citations reference specific Notion blocks for source attribution
5. **Collections ↔ Sessions**: Many-to-many relationship via `collection_conversations`
6. **Sync Jobs**: Independent entity tracking sync execution

---

## Data Integrity

### Constraints

- **Foreign Keys**: All references use CASCADE DELETE to maintain referential integrity
- **Unique Constraints**: Prevent duplicate entries (page_id, block_id combinations)
- **Check Constraints**: Validate data ranges (token counts, relevance scores)

### Indexes

- **Performance**: Indexes on frequently queried fields (user_id, session_id, status)
- **Vector Search**: pgvector index on `embedding` column for similarity search
- **Tag Search**: GIN index on `tags` array for collection filtering
- **Time Queries**: Indexes on timestamp fields for sync job filtering

### Triggers

```sql
-- Auto-update updated_at timestamp
CREATE TRIGGER update_notion_pages_updated_at
  BEFORE UPDATE ON notion_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-increment conversation_count on collections
CREATE TRIGGER increment_collection_count
  AFTER INSERT ON collection_conversations
  FOR EACH ROW
  EXECUTE FUNCTION increment_collection_count();
```

---

## Metadata Schema

### Notion Page Properties

```typescript
interface NotionPageProperties {
  tags: string[]; // Tags for categorization
  status: string; // Status field (e.g., "Published", "Draft")
  editor: string; // Last editor name/email
  category?: string; // Optional category
  priority?: string; // Optional priority level
}
```

### Notion Block Metadata

```typescript
interface NotionBlockMetadata {
  original_block_format: string; // Original Notion block type
  tokens: number; // Token count for this chunk
  overlap_info: {
    prev_overlap: number; // Overlap with previous chunk
    next_overlap: number; // Overlap with next chunk
  };
  start_position: number; // Character position in original page
  end_position: number;
}
```

---

## Migration Strategy

### Initial Migration

1. Create base tables (notion_pages, notion_blocks, etc.)
2. Enable pgvector extension: `CREATE EXTENSION vector;`
3. Create indexes (vector, GIN, standard)
4. Create triggers for auto-updates

### Incremental Sync Migration

1. Add `last_sync_time` tracking to notion_pages
2. Add filtering index on `last_edited_time`
3. Add batch processing support in sync_jobs metadata

---

## Query Patterns

### Retrieval Query (MMR)

```sql
-- Maximal Marginal Relevance retrieval with k=8, fetchK=32
SELECT
  nb.id,
  nb.page_id,
  nb.block_id,
  np.title,
  np.url,
  nb.content,
  1 - (nb.embedding <=> query_embedding) as similarity
FROM notion_blocks nb
JOIN notion_pages np ON nb.page_id = np.page_id
ORDER BY nb.embedding <=> query_embedding
LIMIT 32
-- Apply MMR algorithm in application code (fetchK=32)
-- Return top k=8 with diversity penalty
```

### Chat History Query

```sql
-- Get conversation with citations
SELECT
  cm.id,
  cm.role,
  cm.content,
  cm.created_at,
  ARRAY_AGG(
    json_build_object(
      'title', cit.title,
      'url', cit.url,
      'snippet', cit.snippet,
      'relevance', cit.relevance_score
    )
  ) as citations
FROM chat_messages cm
LEFT JOIN chat_citations cit ON cm.id = cit.message_id
WHERE cm.session_id = $1
GROUP BY cm.id, cm.role, cm.content, cm.created_at
ORDER BY cm.created_at;
```

---

## Future Considerations

### Scalability

- **Partitioning**: Partition notion_blocks by page_id if table grows large
- **Archival**: Archive old chat_sessions to reduce query latency
- **Caching**: Cache frequent retrieval queries (Next.js revalidateTag)

### Privacy Enhancements

- **Encryption**: Encrypt sensitive metadata (properties, content)
- **Data Retention**: Automatic cleanup of old sessions after TTL
- **GDPR Compliance**: User data export and deletion capabilities

**Data Model Complete**: Ready for implementation.
