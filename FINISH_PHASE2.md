# Phase 2 완료 가이드

## 현재 상태: 23/24 완료 (95.8%)

### ✅ 완료된 작업

- Supabase 클라이언트 설정
- 모든 데이터베이스 마이그레이션 파일 생성 (5개)
- TypeScript 타입 정의
- Notion API 클라이언트
- Chunking 및 Embedding 시스템
- MMR Retriever 구현
- Answer Composer 구현
- NextAuth 제거 (단일 사용자 모드)

### ⚠️ 남은 작업: T015 (5분 소요)

Supabase에서 SQL을 실행하기만 하면 됩니다!

---

## T015 완료하기 (5분)

### 1. Supabase Dashboard 접속

- https://supabase.com
- 프로젝트 선택

### 2. SQL Editor 열기

- 좌측 메뉴에서 "SQL Editor" 클릭
- "New query" 클릭

### 3. 순서대로 SQL 실행

#### 파일 1: pgvector extension 활성화

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

→ "Run" 버튼 클릭

#### 파일 2: notion_pages 테이블

`database/migrations/001_create_notion_pages.sql` 파일의 **전체 내용** 복사해서 실행

#### 파일 3: notion_blocks 테이블 (중요! pgvector)

`database/migrations/002_create_notion_blocks.sql` 파일의 **전체 내용** 복사해서 실행

#### 파일 4: chat 테이블들

`database/migrations/003_create_chat_tables.sql` 파일의 **전체 내용** 복사해서 실행

#### 파일 5: collections 테이블들

`database/migrations/004_create_collections.sql` 파일의 **전체 내용** 복사해서 실행

#### 파일 6: sync_jobs 테이블

`database/migrations/005_create_sync_jobs.sql` 파일의 **전체 내용** 복사해서 실행

#### 파일 7: Vector search function

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

## 확인 방법

Supabase Dashboard → Table Editor에서 8개 테이블 확인:

- ✅ notion_pages
- ✅ notion_blocks (pgvector 포함)
- ✅ chat_sessions
- ✅ chat_messages
- ✅ chat_citations
- ✅ collections
- ✅ collection_conversations
- ✅ sync_jobs

---

## 완료 후

마이그레이션이 성공적으로 완료되면:

1. `tasks.md`에서 T015를 체크하세요
2. 알려주세요: "Phase 2 완료!"
3. `/speckit.implement` 명령어로 Phase 3 (MVP) 시작합니다

---

**참고**:

- 환경변수는 이미 `.env.local`에 설정하셨다고 하셨으니 다음 단계로 갈 수 있습니다
- 단, Supabase 마이그레이션은 반드시 실행해야 합니다!

