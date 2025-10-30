# Vercel 환경별 배포 가이드 (Prod/Dev/Test)

## 📋 Vercel 환경 관리 방법

Vercel은 **3가지 환경**을 자동으로 구분합니다:

1. **Production** (프로덕션)
   - 메인 브랜치 (`main` 또는 `master`)
   - 커스텀 도메인 연결 가능
   - 상용 데이터 사용

2. **Preview** (프리뷰/테스트)
   - 모든 다른 브랜치
   - Pull Request 생성 시 자동 배포
   - 테스트/개발 환경으로 사용

3. **Development** (개발)
   - `vercel dev` 명령으로 로컬 개발
   - 또는 특정 브랜치를 Development로 지정 가능

---

## 🎯 환경별 설정 전략

### 방법 1: Branch-based (자동, 권장) ⭐⭐⭐

**자동 환경 분리:**

- `main` 브랜치 → Production
- 다른 브랜치 → Preview
- 환경 변수는 Vercel Dashboard에서 각 환경별로 설정

**장점:**

- Git 브랜치로 자동 분리
- PR 생성 시 자동 Preview 배포
- 간단하고 직관적

**설정:**

1. **GitHub 리포지토리 연결**

   ```bash
   vercel link
   ```

2. **Vercel Dashboard에서 환경 변수 설정**
   - Project Settings → Environment Variables
   - 각 변수마다 환경 선택:
     - ✅ Production
     - ✅ Preview
     - ✅ Development

3. **Branch 전략**
   ```
   main          → Production 배포
   develop       → Preview 배포 (테스트)
   feature/xxx   → Preview 배포 (개발)
   ```

---

### 방법 2: Custom Branch 설정

특정 브랜치를 Development/Test로 고정 가능:

1. **Vercel Dashboard**
   - Settings → Git
   - "Production Branch" 설정: `main`
   - 특정 브랜치를 Development로 지정 가능

---

## 📁 환경별 설정 예시

### `.env.production` (Vercel Production 환경 변수)

```env
# Production
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod_anon_key
SUPABASE_SERVICE_ROLE_KEY=prod_service_key
NOTION_API_KEY=prod_notion_key
OPENAI_API_KEY=prod_openai_key

# Production Webhook URL
NOTION_WEBHOOK_SECRET=prod_webhook_secret
CRON_SECRET=prod_cron_secret

# Production Domain
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

### `.env.preview` (Vercel Preview 환경 변수)

```env
# Preview/Test (별도 Supabase 프로젝트 사용 권장)
NEXT_PUBLIC_SUPABASE_URL=https://test-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=test_anon_key
SUPABASE_SERVICE_ROLE_KEY=test_service_key
NOTION_API_KEY=test_notion_key
OPENAI_API_KEY=test_openai_key

# Preview Webhook (또는 테스트용)
NOTION_WEBHOOK_SECRET=test_webhook_secret
CRON_SECRET=test_cron_secret

# Preview Domain (자동 생성되지만 명시 가능)
NEXT_PUBLIC_APP_URL=https://notion-rag-xxx.vercel.app
```

### `.env.development` (로컬 개발)

```env
# Local Development
NEXT_PUBLIC_SUPABASE_URL=https://local-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=local_anon_key
SUPABASE_SERVICE_ROLE_KEY=local_service_key
NOTION_API_KEY=local_notion_key
OPENAI_API_KEY=local_openai_key

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🔧 Vercel 설정 방법

### Step 1: 환경 변수 추가 (Vercel Dashboard)

1. **Vercel Dashboard 접속**
   - https://vercel.com/dashboard
   - 프로젝트 선택

2. **Settings → Environment Variables**

3. **각 변수 추가 시 환경 선택**

   ```
   변수 이름: NEXT_PUBLIC_SUPABASE_URL
   값: https://prod-project.supabase.co
   환경:
     ✅ Production
     ☐ Preview
     ☐ Development
   ```

4. **반복**
   - 모든 환경 변수를 각 환경별로 설정

---

### Step 2: Branch 전략 설정

```bash
# Production 브랜치 (메인)
git checkout main
git push origin main
# → 자동으로 Production 배포

# Development/Test 브랜치
git checkout -b develop
git push origin develop
# → 자동으로 Preview 배포
# → URL: https://notion-rag-git-develop-xxx.vercel.app
```

---

### Step 3: vercel.json 설정 (환경별 Cron)

`vercel.json`을 업데이트하여 환경별 설정 가능:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "*/10 * * * *"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

---

## 🌍 실제 사용 시나리오

### 시나리오 1: 개발 → 테스트 → 프로덕션

```bash
# 1. 개발 브랜치에서 작업
git checkout -b feature/new-feature
# 코드 수정
git push origin feature/new-feature
# → Preview 배포 (자동 테스트 환경)

# 2. PR 생성
# → Preview 배포 URL로 테스트
# → 코드 리뷰

# 3. main 브랜치로 병합
git checkout main
git merge feature/new-feature
git push origin main
# → Production 배포 (자동)
```

### 시나리오 2: 환경별 다른 데이터베이스

**Production:**

- Supabase Production 프로젝트
- 실제 Notion 워크스페이스
- 실제 사용자 데이터

**Preview/Test:**

- Supabase Test 프로젝트
- 테스트용 Notion 워크스페이스 (또는 같은 워크스페이스, 다른 데이터베이스)
- 테스트 데이터만

---

## 📝 환경 변수 관리 Best Practices

### 1. 환경별 다른 Supabase 프로젝트 사용 (권장)

```
Production:
  Supabase Project: notion-rag-prod
  Database: 실제 데이터

Preview:
  Supabase Project: notion-rag-preview
  Database: 테스트 데이터

Development:
  Supabase Project: notion-rag-dev (또는 로컬)
  Database: 개발 데이터
```

**이유:**

- ✅ 환경 간 데이터 격리
- ✅ 테스트가 프로덕션에 영향 없음
- ✅ 각 환경별 독립적 운영

### 2. 환경별 Notion Integration (선택)

```
Production:
  Notion Integration: Production용
  Webhook URL: https://prod-domain.com/api/webhooks/notion

Preview:
  Notion Integration: Test용 (또는 같은 Integration)
  Webhook URL: https://preview-url.vercel.app/api/webhooks/notion
```

---

## 🔐 보안 고려사항

### 환경별 Secret 관리:

1. **Production Secrets**
   - 가장 엄격한 보안
   - 최소 권한 원칙
   - 별도 Notion Integration 권장

2. **Preview Secrets**
   - 테스트용 키 사용 가능
   - Production 키와 분리

3. **Development Secrets**
   - 로컬 개발용
   - `.env.local` 사용 (Git에 커밋하지 않음)

---

## 🚀 빠른 시작

### 1. 첫 배포 (Production)

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel --prod

# 또는 GitHub 연동 후 자동 배포
# main 브랜치 push 시 자동 Production 배포
```

### 2. Preview 환경 설정

```bash
# develop 브랜치 생성 및 배포
git checkout -b develop
git push origin develop
# → 자동 Preview 배포
```

### 3. 환경 변수 설정

Vercel Dashboard:

- Project Settings → Environment Variables
- 각 변수마다 Production/Preview/Development 선택

---

## 📊 환경별 URL 구조

### Production

```
https://your-custom-domain.com
또는
https://notion-rag.vercel.app
```

### Preview

```
https://notion-rag-git-branch-name-username.vercel.app
예: https://notion-rag-git-develop-user.vercel.app
```

### Development (로컬)

```
http://localhost:3000
```

---

## ✅ 체크리스트

### Production 환경

- [ ] Vercel 프로젝트 생성 및 연결
- [ ] Production 환경 변수 설정 (모든 변수)
- [ ] 커스텀 도메인 연결 (선택)
- [ ] Production 브랜치 (`main`) 설정
- [ ] Notion Webhook Production URL 설정

### Preview/Test 환경

- [ ] Preview 환경 변수 설정
- [ ] Test용 Supabase 프로젝트 생성 (선택)
- [ ] Preview 브랜치 전략 수립
- [ ] Preview 배포 자동화 확인

### Development 환경

- [ ] 로컬 `.env.local` 파일 설정
- [ ] `vercel dev` 테스트 (선택)

---

## 🎯 추천 브랜치 전략

```
main            → Production (프로덕션)
develop         → Preview (통합 테스트)
feature/*       → Preview (기능 개발)
hotfix/*        → Preview → Production (긴급 수정)
```

이렇게 하면:

- `main`에만 merge → Production 배포
- PR 생성 → 자동 Preview 배포
- 자동으로 환경 분리 ✅
