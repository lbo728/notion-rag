# Notion Webhook 설정 가이드

## 📋 개요

Notion Webhook을 사용하면 **실시간으로** 페이지 변경사항을 감지하고 자동으로 동기화할 수 있습니다.

**장점:**

- ✅ 실시간 동기화 (Cron 대비)
- ✅ 불필요한 API 호출 최소화
- ✅ 변경된 페이지만 동기화

**단점:**

- ⚠️ 공개 HTTPS URL 필요 (로컬 테스트는 어려움)
- ⚠️ Webhook 시크릿 관리 필요

---

## 🔧 설정 방법

### 1단계: 애플리케이션 배포 (프로덕션 환경)

Webhook은 **공개 HTTPS URL**이 필요하므로 로컬 환경에서는 작동하지 않습니다.

**Vercel 배포:**

```bash
# Vercel CLI로 배포 (무료 티어 가능)
vercel
```

**또는 GitHub 연동:**

- GitHub 리포지토리 → Vercel 프로젝트 연결
- 자동 배포 활성화

배포 후 URL 확인: `https://your-project.vercel.app`

---

### 2단계: Notion Integration에서 Webhook 생성

1. **Notion 통합 설정 페이지 접속**
   - https://www.notion.so/my-integrations
   - 사용 중인 Integration 선택

2. **Webhook 생성**
   - "웹훅" 탭 클릭
   - "구독 생성하기" 클릭

3. **Webhook URL 입력**

   ```
   https://your-domain.com/api/webhooks/notion
   ```

   - 배포한 도메인 사용
   - 예: `https://notion-rag.vercel.app/api/webhooks/notion`

4. **API 버전 선택**
   - `2025-09-03` (또는 최신 버전)

5. **이벤트 선택**
   - ✅ **페이지** (모든 하위 이벤트)
     - `page.created`
     - `page.updated`
     - `page.deleted`
   - ✅ **데이터베이스** (필요 시)
     - 데이터베이스 구조 변경 감지

6. **생성 완료**
   - Webhook Secret 복사
   - `.env.local`에 추가:
     ```
     NOTION_WEBHOOK_SECRET=your_webhook_secret_here
     ```

---

### 3단계: 환경 변수 설정

`.env.local`에 추가:

```env
# Notion Webhook Secret (웹훅 생성 시 발급)
NOTION_WEBHOOK_SECRET=notion_signature_secret_here
```

**Vercel 배포 시:**

- Vercel Dashboard → Project Settings → Environment Variables
- `NOTION_WEBHOOK_SECRET` 추가

---

### 4단계: 테스트

1. **Notion에서 새 페이지 생성**
   - '짧은 글쓰기' 데이터베이스에 새 글 추가

2. **Webhook 수신 확인**
   - Vercel Logs에서 확인:
     ```bash
     vercel logs --follow
     ```
   - 또는 Vercel Dashboard → Functions → Logs

3. **동기화 확인**
   - 챗봇에 질문: "가장 최근 글은?"
   - 새로 만든 글이 즉시 반환되어야 함

---

## 🔍 Webhook 동작 방식

### 이벤트 처리:

1. **페이지 생성/수정** (`page.created`, `page.updated`)
   - 즉시 해당 페이지 동기화
   - 임베딩 생성 및 벡터 DB 업데이트

2. **페이지 삭제** (`page.deleted`)
   - Supabase에서 해당 페이지 및 블록 삭제

3. **데이터베이스 변경** (`database.updated`)
   - 로그만 기록 (필요 시 전체 동기화 가능)

---

## 🛡️ 보안

### Signature 검증:

Webhook 엔드포인트는 Notion이 보낸 요청인지 확인합니다:

```typescript
// 자동으로 검증됨 (NOTION_WEBHOOK_SECRET 설정 시)
verifyNotionSignature(body, signature, secret);
```

**중요:**

- `NOTION_WEBHOOK_SECRET`를 반드시 설정하세요
- 프로덕션에서는 절대 하드코딩하지 마세요

---

## 🔄 Cron vs Webhook 비교

| 방식              | 지연 시간  | 설정 난이도 | 비용         | 추천                  |
| ----------------- | ---------- | ----------- | ------------ | --------------------- |
| **Webhook**       | 즉시 (0초) | 보통        | 무료         | ⭐⭐⭐ 실시간 필요 시 |
| **Vercel Cron**   | 최대 10분  | 쉬움        | 무료 (Hobby) | ⭐⭐ 간단하게         |
| **Supabase Cron** | 최대 10분  | 어려움      | 무료         | ⭐ Supabase 집중 시   |

---

## 💡 권장 조합

**최적의 전략: Webhook + Cron 하이브리드**

1. **Webhook**: 실시간 동기화 (주 방식)
2. **Cron (10분)**: Webhook 누락 대비 백업

이렇게 하면:

- ✅ 대부분의 경우 즉시 동기화
- ✅ Webhook 실패 시에도 최대 10분 내 복구

---

## 🐛 트러블슈팅

### 문제: Webhook이 동작하지 않음

**원인 1**: 로컬 환경에서 테스트

- **해결**: 프로덕션 환경에서만 작동 (공개 HTTPS URL 필요)

**원인 2**: Signature 검증 실패

- **해결**: `NOTION_WEBHOOK_SECRET` 확인

**원인 3**: URL 오류

- **해결**: Webhook URL이 정확한지 확인 (마지막에 `/` 없어야 함)

### 문제: Webhook은 오지만 동기화 안 됨

**확인 사항:**

1. Vercel Logs에서 에러 메시지 확인
2. Notion API 키 권한 확인
3. 페이지 접근 권한 확인

---

## 📝 로컬 테스트 (개발용)

로컬에서 Webhook을 테스트하려면:

1. **ngrok 사용** (무료):

   ```bash
   # ngrok 설치
   brew install ngrok

   # Next.js 서버 실행 (포트 3000)
   pnpm dev

   # 다른 터미널에서
   ngrok http 3000
   # 나온 URL 사용: https://xxxx.ngrok.io/api/webhooks/notion
   ```

2. **Webhook URL을 ngrok URL로 설정**
   - Notion Integration → Webhook → URL 업데이트

---

## ✅ 체크리스트

- [ ] 애플리케이션 배포 완료 (Vercel 등)
- [ ] Notion Integration에서 Webhook 생성
- [ ] Webhook URL 설정 (`/api/webhooks/notion`)
- [ ] 이벤트 선택 (페이지 생성/수정/삭제)
- [ ] `NOTION_WEBHOOK_SECRET` 환경 변수 설정
- [ ] 테스트: Notion에서 새 페이지 생성
- [ ] Vercel Logs에서 Webhook 수신 확인
- [ ] 챗봇에서 최신 글 검색 테스트


