# 최소 환경변수 설정 (간단 버전)

## 단일 사용자 개발 모드용

### .env.local 파일 생성

```bash
cd /Users/byungskersmacbook/Documents/00_project/notion-rag
touch .env.local
```

다음 내용을 `.env.local`에 넣으세요:

```env
# ===========================================
# 필수 3개 (Supabase)
# ===========================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# ===========================================
# 필수 2개 (API Keys)
# ===========================================
NOTION_API_KEY=secret_your_notion_integration_token
OPENAI_API_KEY=sk-your_openai_api_key

# ===========================================
# 선택사항 (기본값으로도 작동)
# ===========================================
NEXTAUTH_SECRET=dev_secret_key_12345
NEXTAUTH_URL=http://localhost:3000
```

---

## 키 발급 방법

### 1. Supabase (2분)
1. https://supabase.com → 새 프로젝트 생성
2. Settings → API → Keys 복사
3. URL, anon key, service_role key 복사

### 2. Notion API (3분)
1. https://www.notion.so/my-integrations
2. New integration 생성
3. Integration token 복사 (secret_로 시작)

### 3. OpenAI API (1분)
1. https://platform.openai.com/api-keys
2. 새 키 생성
3. 키 복사 (sk-로 시작)

---

## Google OAuth 불필요!

단일 사용자 개발 모드에서는 인증 없이 진행 가능합니다.

변경된 설정:
- ✅ NextAuth 제거
- ✅ 간단한 인증 체크만
- ✅ 개발 모드: 인증 자동 통과

---

## 빠른 시작

```bash
# 1. 환경변수 파일 생성
nano .env.local
# (위 내용 붙여넣기)

# 2. 개발 서버 시작
pnpm dev

# 3. 브라우저에서 확인
# http://localhost:3000
```

---

## 체크리스트

- [ ] `.env.local` 파일 생성
- [ ] Supabase 3개 키 입력
- [ ] Notion API Key 입력
- [ ] OpenAI API Key 입력
- [ ] `pnpm dev` 실행 성공
- [ ] http://localhost:3000 접속 가능

**완료되면**: `/speckit.implement` 명령어로 계속 진행!

