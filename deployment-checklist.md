# 배포 체크리스트: Prod/Dev/Test 환경 설정

## 🎯 빠른 설정 가이드

### 1단계: Vercel 프로젝트 생성

```bash
# Vercel CLI로 로그인 및 프로젝트 생성
npx vercel

# 또는 GitHub 리포지토리 연결
# Vercel Dashboard → Add New Project → GitHub 선택
```

### 2단계: 환경 변수 설정 (Vercel Dashboard)

**Settings → Environment Variables**에서 각 변수 추가:

| 변수 이름                       | Production | Preview | Development |
| ------------------------------- | ---------- | ------- | ----------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | ✅         | ✅      | ✅          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅         | ✅      | ✅          |
| `SUPABASE_SERVICE_ROLE_KEY`     | ✅         | ✅      | ✅          |
| `NOTION_API_KEY`                | ✅         | ✅      | ✅          |
| `OPENAI_API_KEY`                | ✅         | ✅      | ✅          |
| `NOTION_WEBHOOK_SECRET`         | ✅         | ☐       | ☐           |
| `CRON_SECRET`                   | ✅         | ☐       | ☐           |

**각 변수 추가 시:**

- Add Variable 클릭
- 변수 이름 입력
- 값 입력
- 환경 체크박스 선택 (Production / Preview / Development)
- Save

---

## 🌳 브랜치 전략 예시

```
main (production)
  ├── develop (preview/test)
  │   ├── feature/sync-improvements
  │   └── feature/webhook-setup
  └── hotfix/critical-bug
```

**자동 동작:**

- `main` → Production 배포
- `develop` → Preview 배포 (`https://notion-rag-git-develop-user.vercel.app`)
- `feature/*` → Preview 배포 (PR 생성 시)

---

## 🔐 환경별 Supabase 프로젝트 (권장)

### Production

- Supabase Project: `notion-rag-prod`
- 실제 사용자 데이터
- 프로덕션 Webhook

### Preview/Test

- Supabase Project: `notion-rag-preview` (또는 같은 프로젝트 사용)
- 테스트 데이터
- Preview Webhook (또는 Webhook 없이 수동 동기화)

---

## 🚀 배포 워크플로우

### 개발 → 테스트 → 프로덕션

```bash
# 1. 기능 개발 (Preview 자동 배포)
git checkout -b feature/new-feature
# 코드 작성
git push origin feature/new-feature
# → 자동으로 Preview 환경 배포
# → URL: https://notion-rag-git-feature-new-feature-user.vercel.app

# 2. PR 생성 및 리뷰
# → Preview URL로 테스트
# → 코드 리뷰

# 3. Production 배포
git checkout main
git merge feature/new-feature
git push origin main
# → 자동으로 Production 배포
```

---

## ✅ 완료 체크리스트

### Production 설정

- [ ] Vercel 프로젝트 생성 및 GitHub 연결
- [ ] Production 브랜치 설정 (`main`)
- [ ] Production 환경 변수 설정 (모든 변수)
- [ ] 커스텀 도메인 연결 (선택)
- [ ] Notion Webhook Production URL 설정
- [ ] Production 배포 테스트

### Preview/Test 설정

- [ ] Preview 환경 변수 설정
- [ ] Test 브랜치 생성 (`develop`)
- [ ] Preview 배포 자동화 확인
- [ ] Preview URL 테스트

### Development (로컬)

- [ ] `.env.local` 파일 설정
- [ ] 로컬 개발 서버 테스트
- [ ] `vercel dev` 테스트 (선택)

---

## 🔄 환경별 URL 구조

### Production

```
https://your-custom-domain.com
또는
https://notion-rag.vercel.app
```

### Preview

```
https://notion-rag-git-<branch>-<user>.vercel.app

예시:
- develop 브랜치: https://notion-rag-git-develop-lbo728.vercel.app
- feature 브랜치: https://notion-rag-git-feature-xxx-lbo728.vercel.app
```

### Development (로컬)

```
http://localhost:3000
```

---

## 💡 실용 팁

### 1. 환경 변수 자동 공유

Vercel Dashboard에서:

- "Add Variable" → 체크박스로 환경 선택
- 여러 환경에 동시에 추가 가능

### 2. Preview 환경에서 Webhook 테스트

로컬에서 ngrok 사용:

```bash
# 개발 서버 실행
pnpm dev

# 다른 터미널
ngrok http 3000
# 나온 URL을 Notion Webhook에 설정
```

### 3. 환경별 다른 데이터베이스 사용

**권장:**

- Production: 실제 Supabase 프로젝트
- Preview: 테스트용 Supabase 프로젝트 (또는 같은 프로젝트의 다른 스키마)

---

## 📋 현재 프로젝트 상태

### ✅ 이미 구현됨:

- Cron 엔드포인트 (`app/api/cron/sync/route.ts`)
- Webhook 엔드포인트 (`app/api/webhooks/notion/route.ts`)
- `vercel.json` (Cron 설정)

### 📝 Vercel에서 할 일:

1. 프로젝트 생성 및 GitHub 연결
2. 환경 변수 설정 (각 환경별)
3. 브랜치 전략 수립

---

자세한 내용은 `VERCEL_DEPLOYMENT_GUIDE.md` 참고하세요!


