# MCP를 통한 Supabase 마이그레이션 실행 방법

## 현재 상황

Supabase MCP는 설정되어 있지만 (`~/.cursor/mcp.json`에 Supabase MCP URL 설정됨),
Cursor 환경에서 Supabase MCP 도구에 직접 접근할 수 없습니다.

## 해결 방법

### 방법 1: Supabase Dashboard에서 실행 (✅ 추천)

1. **Supabase Dashboard 접속**
   - https://supabase.com
   - 프로젝트 ID: `ojdehxixshysvznouqhv` 선택

2. **SQL Editor 열기**
   - 좌측 메뉴 → SQL Editor
   - "New query" 클릭

3. **완전한 마이그레이션 스크립트 실행**

   파일 위치: `database/migrations/007_complete_migration.sql`

   이 파일의 전체 내용을 복사하여 Supabase SQL Editor에 붙여넣고 실행하세요.

4. **실행 확인**

   Supabase Dashboard → Table Editor에서 다음 테이블들을 확인:
   - ✅ notion_pages
   - ✅ notion_blocks (pgvector column 확인)
   - ✅ chat_sessions
   - ✅ chat_messages
   - ✅ chat_citations
   - ✅ collections
   - ✅ collection_conversations
   - ✅ sync_jobs

---

### 방법 2: Node.js 스크립트로 실행 (대안)

환경 변수가 설정되어 있다면, 아래와 같은 Node.js 스크립트를 사용할 수 있습니다:

```bash
# migration runner 스크립트 생성
node scripts/run-migration.js
```

하지만 현재 환경 변수가 설정되어 있지 않으므로, Supabase Dashboard에서 직접 실행하는 것이 가장 간단합니다.

---

## 마이그레이션 파일 위치

- 📁 `database/migrations/007_complete_migration.sql` ← **이 파일을 사용하세요**

이 파일에는 다음이 포함되어 있습니다:

1. pgvector 확장 활성화
2. notion_pages 테이블
3. notion_blocks 테이블 (pgvector)
4. chat_sessions, chat_messages, chat_citations 테이블
5. collections, collection_conversations 테이블
6. sync_jobs 테이블
7. match_blocks() 벡터 검색 함수

---

## 빠른 실행

```bash
# 마이그레이션 파일 내용 확인
cat database/migrations/007_complete_migration.sql

# Supabase Dashboard SQL Editor에 복사해서 실행
```

---

## 참고사항

MCP는 현재 다음 서버만 설정되어 있습니다:

- Nx MCP (사용 가능)
- Supabase MCP (설정되어 있지만 Cursor 환경에서 도구가 노출되지 않음)

따라서 **Supabase Dashboard에서 직접 실행하는 것이 가장 빠르고 안전한 방법**입니다.

