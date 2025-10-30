# RAG 기반 지식 저장소 실시간 최신화 전략

## 🎯 일반적인 RAG 실시간 업데이트 방법

### 1. **Polling/스케줄링** (현재 구현 방식)

- **원리**: 주기적으로(예: 10분마다) 변경사항을 확인
- **장점**:
  - 구현 간단
  - API 제한 관리 용이
- **단점**:
  - 지연 시간 발생 (최대 스케줄 간격만큼)
  - 불필요한 API 호출 가능
- **현재 구현**: ✅ `lib/sync/scheduler.ts`에 10분 간격 스케줄러 구현됨 (하지만 아직 활성화되지 않음)

### 2. **Webhook 방식** (실시간, 권장)

- **원리**: Notion에서 변경 이벤트 발생 시 즉시 웹훅 호출
- **장점**:
  - 실제 실시간 업데이트
  - API 호출 최소화
- **단점**:
  - Notion Webhook 설정 필요
  - 웹훅 엔드포인트 구현 필요
- **현재 구현**: ❌ 미구현

### 3. **수동 트리거** (현재 사용 가능)

- **원리**: 사용자가 "Incremental Sync" 버튼 클릭
- **장점**:
  - 즉시 동기화 가능
  - 비용 절감 (필요할 때만)
- **단점**:
  - 사용자가 직접 실행해야 함
- **현재 구현**: ✅ UI에 버튼 있음

### 4. **증분 동기화 (Incremental Sync)**

- **원리**: 마지막 동기화 이후 변경된 페이지만 동기화
- **장점**:
  - 효율적 (전체 스캔 불필요)
  - 빠른 처리
- **현재 구현**: ✅ `incrementalSyncNotionPages()` 함수 구현됨

---

## 📊 현재 시스템 상태

### ✅ 구현된 것들:

1. **증분 동기화 로직**: `lib/sync/notion-sync-service.ts`의 `incrementalSyncNotionPages()`
2. **스케줄러 함수**: `lib/sync/scheduler.ts`의 `startScheduledSync()` (10분 간격)
3. **수동 동기화 UI**: "Incremental Sync" 버튼

### ⚠️ 현재 문제:

- **스케줄러가 자동으로 시작되지 않음**: Next.js App Router는 서버리스 환경이라 백그라운드 스케줄러 실행이 어려움

---

## 🔧 현재 시스템에서 최신 글을 가져오려면?

### 방법 1: 수동으로 "Incremental Sync" 버튼 클릭 (즉시)

```
1. Notion에 새 글 작성
2. 웹 UI에서 "Incremental Sync" 버튼 클릭
3. 즉시 동기화됨
4. 챗봇에 질문하면 최신 글 반환
```

### 방법 2: 자동 스케줄러 활성화 (10분마다)

- Next.js에서 자동 스케줄러 실행 방법 필요

---

## 🚀 개선 방안

### 옵션 A: Next.js API Route에서 스케줄러 시작

```typescript
// app/api/cron/sync/route.ts
export async function GET() {
  // Vercel Cron이나 외부 서비스에서 호출
  await incrementalSyncNotionPages();
  return Response.json({ success: true });
}
```

### 옵션 B: Vercel Cron Jobs 사용 (배포 시)

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

### 옵션 C: Notion Webhook 구현 (가장 실시간)

```typescript
// app/api/webhooks/notion/route.ts
export async function POST(req: Request) {
  const event = await req.json();
  // 변경된 페이지만 동기화
  await syncSpecificPage(event.page_id);
  return Response.json({ success: true });
}
```

---

## 💡 권장 방식

**개발/로컬 환경**: 수동 동기화 버튼 사용
**프로덕션 환경**: Vercel Cron + Webhook 조합

- 주기적 동기화: Cron (10분마다)
- 실시간 동기화: Webhook (즉시)
