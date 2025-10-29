# 다음 단계 가이드

## ✅ 현재까지 완료된 작업

### 1. 데이터베이스 마이그레이션 완료

- ✅ Supabase 프로젝트 생성 및 연결
- ✅ pgvector 확장 활성화
- ✅ 8개 테이블 생성 (notion_pages, notion_blocks, chat_sessions, chat_messages, chat_citations, collections, collection_conversations, sync_jobs)
- ✅ RLS 보안 정책 활성화
- ✅ match_blocks() 벡터 검색 함수 생성

### 2. API 엔드포인트 구현

- ✅ `/api/chat` - 챗봇 API (MMR + GPT-4o-mini)
- ✅ `/api/sync` - Notion 동기화 API (구조만 생성)

### 3. UI 구현

- ✅ 메인 채팅 인터페이스
- ✅ 실시간 메시지 표시
- ✅ 인용 링크 표시
- ✅ 응답 상태 표시

---

## 🚀 다음에 해야 할 작업

### 1. Notion 페이지 동기화 구현 (우선순위: 높음)

현재 상태: 테이블은 있지만 데이터가 없습니다.

#### 구현 단계:

**Step 1: Notion 페이지 목록 가져오기**

```bash
# 파일: app/api/sync/route.ts 수정
```

다음 기능을 추가해야 합니다:

1. Notion API로 페이지 목록 조회
2. notion_pages 테이블에 저장
3. 각 페이지의 블록 가져오기
4. 블록을 청크로 분할
5. 임베딩 생성
6. notion_blocks 테이블에 저장

**Step 2: 배치 처리**

- Notion API rate limit 고려
- 진행 상태 추적 (sync_jobs 테이블 사용)
- 에러 처리 및 재시도 로직

---

### 2. 테스트 데이터 추가

동기화가 복잡하므로, 먼저 테스트용 더미 데이터를 추가해서 챗봇을 테스트할 수 있습니다:

```sql
-- Supabase Dashboard SQL Editor에서 실행
-- 1. 테스트 페이지 추가
INSERT INTO notion_pages (page_id, title, url, workspace_id)
VALUES
  ('test-page-1', 'Getting Started Guide', 'https://notion.so/test-page-1', 'workspace-1'),
  ('test-page-2', 'API Documentation', 'https://notion.so/test-page-2', 'workspace-1');

-- 2. 테스트 블록 추가 (임베딩 없이)
INSERT INTO notion_blocks (page_id, block_id, block_type, content, metadata)
VALUES
  ('test-page-1', 'block-1', 'paragraph', 'This is a test paragraph about project setup.', '{"block_type": "paragraph"}'),
  ('test-page-2', 'block-2', 'paragraph', 'API documentation explains how to use endpoints.', '{"block_type": "paragraph"}');
```

---

### 3. 챗봇 테스트

테스트 데이터를 추가한 후:

1. http://localhost:3000 접속
2. 질문 입력 (예: "프로젝트 설정에 대해 알려줘")
3. 응답 확인

---

## 📝 구현 필요 파일들

### Notion 동기화 구현

```typescript
// lib/sync/notion-sync-service.ts
// 전체 동기화 로직
```

```typescript
// lib/sync/incremental-sync.ts
// 증분 동기화 (10분마다)
```

```typescript
// app/api/sync/route.ts
// 동기화 API 엔드포인트 완전 구현
```

---

## 🔍 환경 변수 확인

`.env.local` 파일에 다음이 설정되어 있는지 확인:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ojdehxixshysvznouqhv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=... # ⚠️ 올바른 키인지 확인 필요

# Notion
NOTION_API_KEY=ntn_...

# OpenAI
OPENAI_API_KEY=sk-proj-...
```

---

## 🎯 우선순위

1. **높음**: Notion 페이지 동기화 구현
2. **중간**: 테스트 데이터로 챗봇 기능 검증
3. **낮음**: UI 개선, 에러 처리 강화

---

## 📚 참고 문서

- `specs/001-concept-rag-chatbot/tasks.md` - 전체 작업 목록
- `lib/notion/` - Notion API 클라이언트 (이미 구현됨)
- `lib/retrieval/mmr-retriever.ts` - MMR 검색 로직 (이미 구현됨)
- `lib/chat/answer-composer.ts` - 답변 생성 로직 (이미 구현됨)
