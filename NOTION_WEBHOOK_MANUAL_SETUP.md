# Notion Webhook 수동 설정 가이드

## ⚠️ 중요: Notion MCP로는 Webhook을 자동 생성할 수 없습니다

Notion API에는 Webhook을 프로그래밍 방식으로 생성하는 기능이 없습니다.
**Notion Integration 설정 페이지에서 수동으로 설정**해야 합니다.

---

## 📋 설정 단계

### 1단계: Preview 배포 완료 확인

먼저 Preview 배포가 완료되어야 합니다.

배포 후 받은 URL 예시:

```
https://notion-rag-git-001-concept-rag-chatbot-username.vercel.app
```

### 2단계: Webhook URL 구성

배포된 URL에 `/api/webhooks/notion`을 추가:

```
https://your-preview-url.vercel.app/api/webhooks/notion
```

### 3단계: Notion Integration 설정 페이지 접속

1. 브라우저에서 접속:

   ```
   https://www.notion.so/my-integrations
   ```

2. 사용 중인 Integration 선택:
   - "Personal RAC" 또는 설정한 Integration 이름 클릭

### 4단계: Webhook 생성

1. Integration 설정 페이지에서 **"웹훅"** 또는 **"Webhooks"** 탭 클릭

2. **"구독 생성하기"** 또는 **"Create Subscription"** 버튼 클릭

3. 모달 창에서 정보 입력:

   **웹훅 URL:**

   ```
   https://your-preview-url.vercel.app/api/webhooks/notion
   ```

   ⚠️ **중요**: URL 끝에 `/` (슬래시)를 붙이지 마세요!

   **API 버전:**
   - 드롭다운에서 `2025-09-03` 선택 (또는 최신 버전)

   **들을 이벤트를 선택하세요:**

   페이지 이벤트 (필수):
   - ✅ `page.created` - 페이지 생성
   - ✅ `page.updated` - 페이지 수정
   - ✅ `page.deleted` - 페이지 삭제

   데이터베이스 이벤트 (선택):
   - ⬜ `database.updated` - 데이터베이스 구조 변경
   - ⬜ `database.query_changed` - 쿼리 변경

4. **"구독 생성하기"** 또는 **"Create Subscription"** 버튼 클릭

5. **Webhook Secret 복사**
   - 생성 완료 후 나타나는 Secret을 복사하세요
   - ⚠️ 이 Secret은 한 번만 표시되므로 반드시 복사하세요!

### 5단계: 환경 변수 설정

#### 로컬 개발 (`.env.local`):

```env
NOTION_WEBHOOK_SECRET=복사한_webhook_secret_여기에_붙여넣기
```

#### Vercel Preview 환경:

1. Vercel Dashboard 접속: https://vercel.com/dashboard
2. 프로젝트 선택
3. Settings → Environment Variables
4. Add Variable 클릭
5. 입력:
   - **Name**: `NOTION_WEBHOOK_SECRET`
   - **Value**: 복사한 Webhook Secret
   - **Environment**: ✅ Preview 체크
6. Save

---

## ✅ 테스트

### 1. Notion에서 테스트 페이지 생성

1. Notion에서 새 페이지 생성 (또는 기존 페이지 수정)
2. 저장

### 2. Vercel Logs 확인

Vercel Dashboard → Project → Functions → Logs:

```
Notion webhook received { event_type: 'page.created', object_type: 'page' }
Processing page event { type: 'page.created', page_id: '...' }
Syncing page from webhook { pageId: '...' }
Page synced from webhook { pageId: '...', chunks: 5 }
```

### 3. 챗봇 테스트

배포된 Preview 환경에서:

1. 챗봇에 접속
2. "가장 최근 글은?" 또는 "방금 만든 페이지는?" 질문
3. 새로 만든 페이지가 응답에 포함되는지 확인

---

## 🔍 문제 해결

### Webhook이 오지 않음

**확인 사항:**

1. ✅ URL이 정확한가? (HTTPS, `/` 없음)
2. ✅ Notion Integration이 해당 페이지에 접근 권한이 있는가?
3. ✅ Vercel 함수가 정상적으로 배포되었는가?

**해결:**

- Vercel Logs에서 Webhook 수신 여부 확인
- Notion Integration 설정에서 페이지 권한 확인

### Signature 검증 실패

**원인**: `NOTION_WEBHOOK_SECRET` 환경 변수가 설정되지 않았거나 틀림

**해결:**

- Vercel Dashboard에서 환경 변수 확인
- Webhook Secret이 정확히 복사되었는지 확인

### 페이지가 동기화되지 않음

**확인 사항:**

1. Vercel Logs에서 에러 메시지 확인
2. Notion API 키 권한 확인
3. Supabase 연결 확인

---

## 📝 현재 구현 상태

✅ **구현 완료:**

- Webhook 엔드포인트: `app/api/webhooks/notion/route.ts`
- Signature 검증
- 페이지 동기화 로직
- 삭제 처리

📋 **설정 필요:**

- Notion Integration에서 Webhook 수동 생성
- Webhook Secret 환경 변수 추가

---

## 💡 참고

**Notion API 제한사항:**

- Webhook은 Integration 설정 페이지에서만 생성 가능
- Webhook Secret은 한 번만 표시됨 (복사 필수!)
- HTTPS URL만 지원 (로컬 테스트는 ngrok 필요)

**다음 단계:**

1. Preview 배포 완료 후 URL 확인
2. 위 가이드에 따라 Webhook 생성
3. Secret 환경 변수 설정
4. 테스트 페이지 생성으로 동작 확인
