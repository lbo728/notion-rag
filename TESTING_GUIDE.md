# 로컬 테스트 가이드

현재까지 구현된 기능들 중에서 로컬 웹에서 테스트 가능한 항목들을 정리했습니다.

## ✅ 테스트 가능한 기능 목록

### 1. **Chat UI (단일/멀티턴 대화)** ✅
**위치**: `http://localhost:3000/`

**테스트 가능 항목:**
- ✅ 메시지 입력 및 전송
- ✅ 사용자/어시스턴트 메시지 표시
- ✅ Citation 링크 표시 (최소 2개)
- ✅ Session ID 표시 (헤더)
- ✅ "New Chat" 버튼으로 세션 초기화
- ✅ 멀티턴 대화 (컨텍스트 유지)

**테스트 방법:**
1. 개발 서버 실행: `pnpm dev`
2. 브라우저에서 `http://localhost:3000` 접속
3. 채팅 입력창에 질문 입력
4. 응답 확인

**필수 사전 조건:**
- 테스트 데이터가 Supabase에 있어야 함 (아래 참고)

---

### 2. **Chat API (`/api/chat`)** ✅
**엔드포인트**: `POST http://localhost:3000/api/chat`

**테스트 가능 항목:**
- ✅ 단일 질문/답변
- ✅ Session ID로 멀티턴 대화
- ✅ Streaming 응답 (선택사항)
- ✅ Citation 생성 (최소 2개)

**테스트 방법 (REST Client 사용):**
```http
### 단일 질문
POST http://localhost:3000/api/chat
Content-Type: application/json

{
  "query": "프로젝트 설정에 대해 알려줘"
}

### 멀티턴 대화
POST http://localhost:3000/api/chat
Content-Type: application/json

{
  "query": "더 자세히 설명해줘",
  "session_id": "위에서 받은 session_id"
}
```

---

### 3. **Sync API** ✅

#### 3-1. Sync Trigger (`/api/sync/trigger`)
**엔드포인트**: `POST http://localhost:3000/api/sync/trigger?mode=full`

**테스트 가능 항목:**
- ✅ 전체 동기화 (full sync)
- ✅ 증분 동기화 (incremental sync)
- ✅ 배경 작업 실행

**테스트 방법:**
```http
POST http://localhost:3000/api/sync/trigger?mode=full
POST http://localhost:3000/api/sync/trigger?mode=incremental
```

**필수 사전 조건:**
- Notion API 키 필요 (`.env.local`에 설정)
- 실제 Notion 워크스페이스 접근 권한

#### 3-2. Sync Status (`/api/sync/status`)
**엔드포인트**: `GET http://localhost:3000/api/sync/status`

**테스트 가능 항목:**
- ✅ 최신 sync job 상태 조회
- ✅ 마지막 동기화 시간 확인
- ✅ 처리된 페이지/블록/임베딩 수 확인

---

### 4. **Sync UI 컴포넌트** ✅
**위치**: 메인 페이지 헤더 및 푸터

**테스트 가능 항목:**
- ✅ "Full Sync" / "Incremental Sync" 버튼
- ✅ Sync 상태 표시 (실시간 업데이트)
- ✅ 마지막 sync 타임스탬프
- ✅ Sync 작업 진행 상태 (running/completed/failed)

---

### 5. **Session 관리 (Multi-turn Context)** ✅
**테스트 가능 항목:**
- ✅ Session ID 자동 생성 및 유지
- ✅ 대화 기록 자동 저장 (Supabase)
- ✅ 최근 10개 메시지 컨텍스트 활용
- ✅ "New Chat"으로 세션 초기화

---

## 🚧 테스트 불가능한 기능 (아직 미구현)

- ❌ **Collections/Bookmarks** (Phase 6 - 아직 미구현)
- ❌ **Scheduled Sync 자동 실행** (스케줄러는 구현되었지만 수동 시작 필요)
- ❌ **인증 (OAuth)** (현재 단일 사용자 모드)

---

## 📋 테스트를 위한 사전 준비사항

### 1. 환경 변수 설정 (`.env.local`)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Notion API (실제 동기화용, 선택사항)
NOTION_API_KEY=your-notion-api-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key
```

### 2. 테스트 데이터 추가 (필수!)

챗봇이 작동하려면 Supabase에 데이터가 있어야 합니다.

**방법 1: 테스트 스크립트 실행** (권장)
```bash
# 테스트용 더미 데이터 추가 (임베딩 포함)
pnpm tsx scripts/add-test-data.ts
```

**방법 2: 실제 Notion 동기화**
```bash
# 브라우저에서 "Full Sync" 버튼 클릭
# 또는 API 호출:
POST http://localhost:3000/api/sync/trigger?mode=full
```

---

## 🧪 단계별 테스트 시나리오

### 시나리오 1: 기본 채팅 테스트 (먼저 실행)

1. **테스트 데이터 추가**
   ```bash
   pnpm tsx scripts/add-test-data.ts
   ```

2. **개발 서버 실행**
   ```bash
   pnpm dev
   ```

3. **브라우저에서 테스트**
   - `http://localhost:3000` 접속
   - 질문: "프로젝트 설정에 대해 알려줘"
   - 응답과 citation 확인

**기대 결과:**
- ✅ 응답 텍스트 표시
- ✅ 최소 2개 citation 링크 표시
- ✅ 응답 시간 < 3초

---

### 시나리오 2: 멀티턴 대화 테스트

1. **첫 번째 질문**
   ```
   "프로젝트 설정에 대해 알려줘"
   ```

2. **두 번째 질문 (컨텍스트 활용)**
   ```
   "환경 변수는 어떻게 설정하나요?"
   ```

**기대 결과:**
- ✅ 두 번째 응답이 첫 번째 맥락을 참조
- ✅ Session ID가 헤더에 표시됨
- ✅ "New Chat" 버튼으로 초기화 가능

---

### 시나리오 3: Sync 기능 테스트

1. **Sync 상태 확인**
   ```http
   GET http://localhost:3000/api/sync/status
   ```

2. **수동 동기화 실행**
   - UI에서 "Full Sync" 버튼 클릭
   - 또는 API: `POST /api/sync/trigger?mode=full`

3. **동기화 상태 모니터링**
   - 푸터의 SyncStatus 컴포넌트 확인
   - 5초마다 자동 업데이트

**기대 결과:**
- ✅ Sync 작업이 시작됨 (status: "running")
- ✅ 완료 후 통계 표시 (pages/blocks/embeddings)

---

## 🔍 문제 해결

### 문제: "I couldn't find relevant information"
**원인**: Supabase에 데이터(임베딩)가 없음  
**해결**: `pnpm tsx scripts/add-test-data.ts` 실행

### 문제: Sync가 작동하지 않음
**원인 1**: Notion API 키 미설정  
**해결**: `.env.local`에 `NOTION_API_KEY` 추가

**원인 2**: Supabase 연결 실패  
**해결**: `.env.local`의 Supabase 설정 확인

### 문제: Citation이 표시되지 않음
**원인**: 임베딩 데이터가 없거나 유사도가 낮음  
**해결**: 테스트 데이터 다시 추가 또는 더 많은 데이터 필요

---

## 📊 현재 구현 상태 요약

| 기능 | 구현 상태 | 테스트 가능 |
|------|----------|------------|
| 단일턴 채팅 | ✅ 완료 | ✅ 가능 |
| 멀티턴 채팅 | ✅ 완료 | ✅ 가능 |
| Citation 표시 | ✅ 완료 | ✅ 가능 |
| Sync UI | ✅ 완료 | ✅ 가능 |
| Sync API | ✅ 완료 | ✅ 가능 |
| 증분 동기화 | ✅ 완료 | ✅ 가능 |
| Collections | ❌ 미구현 | ❌ 불가 |

---

## 🎯 권장 테스트 순서

1. **기본 테스트 데이터 추가** (`scripts/add-test-data.ts`)
2. **단일턴 채팅 테스트** (기본 기능 확인)
3. **멀티턴 채팅 테스트** (컨텍스트 확인)
4. **Sync 기능 테스트** (실제 Notion 데이터, 선택사항)
5. **UI 컴포넌트 확인** (Sync 버튼, Status 표시)

이 순서대로 테스트하시면 현재 구현된 기능들을 모두 확인할 수 있습니다!

