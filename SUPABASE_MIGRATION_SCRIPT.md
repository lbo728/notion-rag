# Supabase 마이그레이션 실행 가이드

## 현재 문제

Supabase MCP가 권한 없음 에러를 반환합니다. MCP 설정이 필요합니다.

## 해결 방법 2가지

### 방법 1: Supabase Dashboard에서 직접 실행 (추천)

1. **Supabase Dashboard 접속**
   - https://supabase.com
   - 프로젝트 선택

2. **SQL Editor 열기**
   - 좌측 메뉴: SQL Editor
   - "New query" 클릭

3. **아래 내용을 순서대로 복사해서 실행**

#### Step 1: pgvector 활성화

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

#### Step 2: notion_pages 테이블

`database/migrations/001_create_notion_pages.sql` **전체 내용** 복사해서 실행

#### Step 3: notion_blocks 테이블 (pgvector)

`database/migrations/002_create_notion_blocks.sql` **전체 내용** 복사해서 실행

#### Step 4: chat 테이블들

`database/migrations/003_create_chat_tables.sql` **전체 내용** 복사해서 실행

#### Step 5: collections 테이블들

`database/migrations/004_create_collections.sql` **전체 내용** 복사해서 실행

#### Step 6: sync_jobs 테이블

`database/migrations/005_create_sync_jobs.sql` **전체 내용** 복사해서 실행

#### Step 7: Vector search function

```sql
CREATE OR REPLACE FUNCTION match_blocks (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  page_id text,
  block_id text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    notion_blocks.id,
    notion_blocks.page_id,
    notion_blocks.block_id,
    notion_blocks.content,
    notion_blocks.metadata,
    1 - (notion_blocks.embedding <=> query_embedding) as similarity
  FROM notion_blocks
  WHERE 1 - (notion_blocks.embedding <=> query_embedding) > match_threshold
  ORDER BY notion_blocks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

### 방법 2: Supabase MCP 설정 (선택)

만약 MCP를 사용하고 싶다면:

1. `.codex/config.toml` 파일 확인 및 수정
2. Supabase 프로젝트 ID 및 Service Role Key 설정
3. MCP 서버 재시작

**현재 MCP 상태**: 권한 없음 - 직접 실행이 더 빠릅니다.

---

## 확인 방법

Supabase Dashboard → Table Editor에서 확인:

- ✅ notion_pages
- ✅ notion_blocks (pgvector column 확인)
- ✅ chat_sessions
- ✅ chat_messages
- ✅ chat_citations
- ✅ collections
- ✅ collection_conversations
- ✅ sync_jobs

---

## 빠른 실행 (Copy & Paste)

아래 명령어로 모든 파일 내용을 한 번에 확인:

```bash
# migration 파일들 확인
cat database/migrations/*.sql
```

**추천**: Supabase Dashboard에서 각 파일 내용을 복사해서 실행하는 것이 가장 안전합니다.

