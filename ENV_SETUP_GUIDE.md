# 환경변수 설정 가이드

## 필수 환경변수

### 1. Notion API (필수)

**질문**: Notion MCP를 사용하면 환경변수가 필요한가?
**답변**: 네, **NOTION_API_KEY가 필요합니다**.

Notion API는 Notion 통합(integration) 토큰이 필요합니다:

1. https://www.notion.so/my-integrations 방문
2. "New integration" 클릭
3. 이름 설정: "Notion RAG Chatbot"
4. Capabilities: Select로 변경 (읽기 전용)
5. Submit → Integration token 복사

```env
NOTION_API_KEY=secret_your_integration_token_here
```

**Notion MCP 사용**:

- Cursor의 Notion MCP 기능을 사용하더라도, 백엔드에서는 공식 Notion SDK를 사용합니다
- MCP는 Cursor IDE ↔ Notion 간의 실시간 동기화용
- 앱에서는 환경변수로 Notion API에 접근합니다

### 2. OpenAI API (필수)

**질문**: Langchain으로 OpenAI를 사용하면 OpenAI Key가 필요한가?
**답변**: 네, **OPENAI_API_KEY가 필요합니다**.

Langchain을 사용해도 실제 API 호출은 OpenAI API에 하므로 키가 필요합니다:

1. https://platform.openai.com/api-keys 접속
2. "Create new secret key" 클릭
3. 키 이름 설정하고 복사

```env
OPENAI_API_KEY=sk-proj-your_openai_key_here
```

**현재 구현**: Langchain 없이 OpenAI SDK 직접 사용
**변경 가능**: 원하시면 Langchain으로 전환 가능합니다

### 3. Google OAuth (선택)

**질문**: Google OAuth는 왜 필요한가?
**답변**: 사용자 인증을 위해 필요합니다. 하지만 **생략 가능**합니다.

**Google OAuth 필요한 이유**:

- 현재 spec에서 "knowledge owner" 인증이 정의되어 있음
- 멀티유저 확장성을 고려한 설계

**대안 - 단순 인증 방식**:

- 비밀번호 없는 단일 사용자 모드 (사용자 입력 불필요)
- API key 기반 인증
- NextAuth 없이 직접 세션 관리

**Google OAuth 설정 (필요시)**:

1. Google Cloud Console: https://console.cloud.google.com
2. 프로젝트 선택/생성
3. API 및 서비스 → OAuth 동의 화면
4. 테스트 사용자로 등록된 이메일 추가
5. 사용자 인증 정보 → OAuth 2.0 클라이언트 ID 생성
6. Redirect URI: `http://localhost:3000/api/auth/callback/google`

```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
```

**Google OAuth 생략하기**:
단일 사용자인 경우 NextAuth를 제거하고 간단한 인증 방식 사용 가능:

- API key 기반 인증만
- 또는 인증 없는 개발 모드

### 4. Supabase (필수) - 이미 설정됨 ✅

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 5. NextAuth Secret (필수)

```env
NEXTAUTH_SECRET=generate_random_32_character_string
NEXTAUTH_URL=http://localhost:3000
```

생성 방법:

```bash
openssl rand -hex 32
```

또는 간단히:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 최소 환경변수 구성 (개발 모드)

**Google OAuth 없이 시작**하려면 다음만 필요:

```env
# 필수 (3개)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

NOTION_API_KEY=secret_xxx
OPENAI_API_KEY=sk-proj-xxx

NEXTAUTH_SECRET=random_string
NEXTAUTH_URL=http://localhost:3000
```

**Google OAuth 포함**하려면 추가:

```env
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
```

---

## 빠른 설정 명령어

```bash
cd /Users/byungskersmacbook/Documents/00_project/notion-rag

# .env.local 파일 생성
cat > .env.local << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Notion API
NOTION_API_KEY=secret_your_notion_token

# OpenAI
OPENAI_API_KEY=sk-your_openai_key

# NextAuth
NEXTAUTH_SECRET=$(openssl rand -hex 32)
NEXTAUTH_URL=http://localhost:3000

# Optional: Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
EOF
```

---

## Notion Integration 설정 가이드

### 1. Notion 워크스페이스 연동

1. https://www.notion.so/my-integrations 접속
2. "New integration" 클릭
3. 이름: "Notion RAG Chatbot"
4. 연결할 워크스페이스 선택
5. Capabilities: **Select pages/databases** (읽기 전용이면 충분)
6. Submit

### 2. Integration을 워크스페이스에 연결

1. Notion에서 페이지 열기
2. 우측 상단 `...` 메뉴 → Connections
3. "Notion RAG Chatbot" integration 추가
4. 연결할 페이지/데이터베이스 선택

### 3. Integration Token 복사

1. https://www.notion.so/my-integrations
2. 생성한 integration 클릭
3. "Internal Integration Token" 복사
4. `.env.local`의 `NOTION_API_KEY`에 붙여넣기

---

## 현재 구현 vs 사용자가 원하는 것

### 현재 구현:

- ✅ Notion SDK 직접 사용 (환경변수 필요)
- ✅ OpenAI SDK 직접 사용 (환경변수 필요)
- ⚠️ Google OAuth (선택적)

### 사용자 요청:

- ❓ Notion MCP 사용
- ❓ Langchain으로 OpenAI 사용

**제안**:

1. **Langchain 전환 가능**: 현재 OpenAI SDK → Langchain으로 변경 가능
2. **Notion MCP**: Cursor IDE용 MCP는 별도, 앱에서는 SDK 사용 유지
3. **Google OAuth**: 단일 사용자면 생략 가능, 단순 API key 인증으로 변경

원하시는 방향을 알려주시면 코드를 수정하겠습니다!
