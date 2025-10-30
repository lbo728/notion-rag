# Preview 배포 가이드

## 🚀 현재 브랜치로 Preview 배포

현재 브랜치: `001-concept-rag-chatbot`

이 브랜치로 Vercel Preview 배포를 진행합니다.

---

## 방법 1: Vercel CLI로 배포 (권장)

### 1단계: Vercel CLI 설치 (필요시)

```bash
npm i -g vercel
```

### 2단계: 로그인

```bash
vercel login
```

### 3단계: Preview 배포

```bash
# Preview 환경으로 배포 (자동으로 브랜치명 기반 URL 생성)
vercel

# 또는 명시적으로 Preview 지정
vercel --preview
```

배포 후 URL이 표시됩니다:

```
https://notion-rag-git-001-concept-rag-chatbot-username.vercel.app
```

---

## 방법 2: GitHub 연동 (자동 배포)

### 1단계: 변경사항 커밋 및 푸시

```bash
# 변경사항 커밋
git add .
git commit -m "feat: add webhook and cron support for real-time sync"

# 푸시
git push origin 001-concept-rag-chatbot
```

### 2단계: Vercel Dashboard에서 프로젝트 생성

1. https://vercel.com/dashboard 접속
2. "Add New Project" 클릭
3. GitHub 리포지토리 선택
4. 프로젝트 설정:
   - Framework Preset: Next.js
   - Root Directory: `.` (기본값)
   - Environment Variables: (나중에 설정)

### 3단계: 자동 배포 확인

브랜치를 푸시하면 자동으로 Preview 배포가 시작됩니다.

---

## 📋 배포 후 확인 사항

### 1. 배포 URL 확인

배포가 완료되면:

- Vercel Dashboard → Deployments에서 URL 확인
- 또는 CLI 출력에서 URL 확인

### 2. 환경 변수 설정

Vercel Dashboard → Settings → Environment Variables:

**Preview 환경에 필요한 변수:**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NOTION_API_KEY`
- `OPENAI_API_KEY`

각 변수 추가 시 **Preview 환경**을 체크하세요.

### 3. 애플리케이션 테스트

배포된 URL로 접속:

```
https://your-preview-url.vercel.app
```

기능 확인:

- [ ] 홈페이지 로드 확인
- [ ] Sync 버튼 동작 확인
- [ ] 챗봇 동작 확인

---

## 🔗 Notion Webhook 설정

Preview 배포 완료 후, Notion Webhook을 설정하세요:

### 1. Webhook URL 확인

Preview 배포 후 나온 URL로 Webhook URL 구성:

```
https://your-preview-url.vercel.app/api/webhooks/notion
```

### 2. Webhook 설정 스크립트 실행

```bash
pnpm tsx scripts/setup-notion-webhook.ts
```

이 스크립트는 필요한 정보를 출력해줍니다.

### 3. Notion Integration에서 Webhook 생성

1. https://www.notion.so/my-integrations 접속
2. 사용 중인 Integration 선택
3. "웹훅" 탭 클릭
4. "구독 생성하기" 클릭
5. 정보 입력:
   - **URL**: `https://your-preview-url.vercel.app/api/webhooks/notion`
   - **API 버전**: `2025-09-03`
   - **이벤트**:
     - ✅ 페이지 > page.created
     - ✅ 페이지 > page.updated
     - ✅ 페이지 > page.deleted
6. Webhook Secret 복사
7. Vercel Dashboard에서 `NOTION_WEBHOOK_SECRET` 환경 변수 추가 (Preview 환경)

---

## ✅ 체크리스트

### 배포 전

- [ ] 변경사항 커밋 (선택사항, Preview는 미커밋 상태로도 배포 가능)
- [ ] Vercel CLI 설치 및 로그인

### 배포 중

- [ ] `vercel` 명령 실행 또는 GitHub 푸시
- [ ] 배포 URL 확인

### 배포 후

- [ ] 환경 변수 설정 (Vercel Dashboard)
- [ ] 애플리케이션 접속 테스트
- [ ] Notion Webhook URL 확인 및 설정
- [ ] Webhook Secret 환경 변수 추가

---

## 🐛 문제 해결

### 문제: Vercel CLI가 없음

```bash
npm i -g vercel
```

### 문제: 로그인 실패

```bash
vercel login
# 브라우저에서 로그인 완료
```

### 문제: 환경 변수 누락

Vercel Dashboard → Settings → Environment Variables에서 확인

---

## 🎯 다음 단계

Preview 배포 완료 후:

1. ✅ Webhook 설정 (위 가이드 참고)
2. ✅ Notion에서 테스트 페이지 생성
3. ✅ Webhook 동작 확인 (Vercel Logs)
4. ✅ 챗봇에서 최신 글 검색 테스트


