# Phase 2: 남은 작업 가이드

## 현재 상태: 21/24 완료 (87.5%)

### ⚠️ 남은 작업 2개

## Task T015: Run database migrations and verify Supabase pgvector extension

### 단계별 가이드

#### 1. Supabase 프로젝트 생성 (5분)

```bash
# 1. Supabase 웹사이트 방문: https://supabase.com
# 2. "New Project" 클릭
# 3. 프로젝트 이름 입력: notion-rag-chatbot
# 4. 데이터베이스 비밀번호 설정 (기억해두세요!)
# 5. Region 선택: 가장 가까운 지역
# 6. "Create new project" 클릭 (1-2분 대기)
```

#### 2. Supabase 프로젝트 설정

프로젝트 생성 완료 후:

1. Settings → API → API Keys 복사
   - `URL` (예: https://xxx.supabase.co)
   - `anon public` key
   - `service_role` key

#### 3. .env.local 파일 생성

```bash
cd /Users/byungskersmacbook/Documents/00_project/notion-rag
cp .env.local.example .env.local
```

`.env.local` 파일에 다음 내용 입력:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Notion API
NOTION_API_KEY=secret_your_notion_integration_token

# OpenAI
OPENAI_API_KEY=sk-your_openai_api_key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_random_string_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

#### 4. Database Migrations 실행

**옵션 A: Supabase Dashboard 사용 (추천)**

1. Supabase Dashboard → SQL Editor
2. 아래 파일들을 순서대로 실행:

**파일 1**: `database/migrations/001_create_notion_pages.sql`

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create notion_pages table (파일 내용 복사해서 실행)
```

**파일 2**: `database/migrations/002_create_notion_blocks.sql`

```sql
-- (파일 내용 복사해서 실행)
```

**파일 3**: `database/migrations/003_create_chat_tables.sql`

```sql
-- (파일 내용 복사해서 실행)
```

**파일 4**: `database/migrations/004_create_collections.sql`

```sql
-- (파일 내용 복사해서 실행)
```

**파일 5**: `database/migrations/005_create_sync_jobs.sql`

```sql
-- (파일 내용 복사해서 실행)
```

**추가로 실행**: Vector search function

```sql
-- lib/retrieval/vector-store.ts의 CREATE_MATCH_BLOCKS_FUNCTION 내용 실행
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

**옵션 B: CLI 사용 (Supabase CLI 설치 필요)**

```bash
# Supabase CLI 설치
npm install -g supabase

# Supabase 로그인
supabase login

# Database migrations 실행
supabase db push
```

#### 5. 검증

Supabase Dashboard → Table Editor에서 확인:

- `notion_pages` 테이블 존재
- `notion_blocks` 테이블 존재
- `chat_sessions`, `chat_messages`, `chat_citations` 테이블 존재
- `collections`, `collection_conversations` 테이블 존재
- `sync_jobs` 테이블 존재

---

## Task T027: Setup NextAuth with Google provider

### 단계별 가이드

#### 1. Google OAuth 설정 (5분)

1. Google Cloud Console 방문: https://console.cloud.google.com
2. 프로젝트 생성 (또는 기존 프로젝트 선택)
3. API 및 서비스 → OAuth 동의 화면 설정:
   - 사용자 유형: 외부
   - 앱 이름: "Notion RAG Chatbot"
   - 지원 이메일 입력
   - 범위 추가: `openid`, `profile`, `email`
4. 저장 및 계속 → 테스트 사용자 추가 (본인 이메일)
5. 사용자 인증 정보 → OAuth 2.0 클라이언트 ID 생성:
   - 애플리케이션 유형: 웹 애플리케이션
   - 이름: Next.js App
   - 승인된 리디렉션 URI:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://your-domain.vercel.app/api/auth/callback/google` (나중)
6. 클라이언트 ID와 Secret 복사

#### 2. .env.local에 추가

위에서 만든 `.env.local` 파일에:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

#### 3. NextAuth 설정 파일 생성

이미 다음 파일이 있어야 함: `lib/auth/nextauth.ts`

만약 없다면 생성 필요. 파일 내용은 아래와 같습니다:

```typescript
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
```

#### 4. API route 생성

`app/api/auth/[...nextauth]/route.ts` 파일 생성:

```typescript
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { authOptions } from "@/lib/auth/nextauth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

---

## 체크리스트

Phase 2 완료를 위한 체크리스트:

- [ ] Supabase 프로젝트 생성됨
- [ ] `.env.local` 파일 생성 및 모든 키 설정
- [ ] Database migrations 5개 모두 실행됨
- [ ] pgvector extension 활성화 확인
- [ ] match_blocks function 생성됨
- [ ] Google OAuth 설정 완료
- [ ] NextAuth 설정 파일 생성됨
- [ ] API route 생성됨
- [ ] `pnpm dev` 실행하여 서버 시작 성공

---

## 빠른 시작 명령어

모든 설정 완료 후:

```bash
# 1. Dependencies가 제대로 설치되어 있는지 확인
pnpm install

# 2. Development server 시작
pnpm dev

# 3. 브라우저에서 확인
# http://localhost:3000
```

---

## 문제 해결

### Supabase 연결 에러

- `.env.local` 파일이 올바른지 확인
- Supabase 프로젝트가 활성화되어 있는지 확인
- Anon key가 올바른지 확인

### Google OAuth 에러

- Google Console에서 redirect URI가 정확한지 확인
- 테스트 사용자로 등록된 이메일로 로그인 시도
- 클라이언트 ID/Secret이 올바른지 확인

### Migration 에러

- pgvector extension이 활성화되었는지 확인
- SQL 문법이 올바른지 확인 (쉼표, 세미콜론 등)

---

**작업 완료 후**: `/speckit.implement` 명령어로 T015, T027를 체크하고 Phase 3로 진행하세요!
