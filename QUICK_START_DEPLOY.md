# 빠른 배포 가이드

## 🚀 1단계: Vercel 로그인

터미널에서 실행:

```bash
pnpm vercel login
```

브라우저가 열리면 Vercel 계정으로 로그인하세요.

---

## 📦 2단계: Preview 배포

로그인 완료 후:

```bash
pnpm run deploy:preview
```

또는:

```bash
pnpm vercel
```

**배포 질문에 답변:**

- Set up and deploy? → **Y**
- Which scope? → 본인의 계정 선택
- Link to existing project? → **N** (첫 배포인 경우)
- Project name? → `notion-rag` (또는 원하는 이름)
- Directory? → **.** (Enter로 기본값)
- Override settings? → **N**

배포 완료 후 **URL이 표시됩니다**:

```
https://notion-rag-git-001-concept-rag-chatbot-username.vercel.app
```

이 URL을 복사하세요! 🎉

---

## 🔗 3단계: Notion Webhook 설정

### 배포 URL 확인

배포 완료 후 받은 URL을 사용하여 Webhook URL 구성:

```
https://your-preview-url.vercel.app/api/webhooks/notion
```

### Notion Integration 설정

1. **Notion Integration 페이지 접속:**

   ```
   https://www.notion.so/my-integrations
   ```

2. **Integration 선택** (예: "Personal RAC")

3. **"웹훅" 또는 "Webhooks" 탭** 클릭

4. **"구독 생성하기"** 클릭

5. **정보 입력:**
   - **URL**: 배포된 URL + `/api/webhooks/notion`
     ```
     https://your-preview-url.vercel.app/api/webhooks/notion
     ```
   - **API 버전**: `2025-09-03`
   - **이벤트 선택**:
     - ✅ 페이지 > page.created
     - ✅ 페이지 > page.updated
     - ✅ 페이지 > page.deleted

6. **"구독 생성하기"** 클릭

7. **Webhook Secret 복사** (한 번만 표시됨!)

### 환경 변수 설정

#### 로컬 개발:

`.env.local`에 추가:

```env
NOTION_WEBHOOK_SECRET=복사한_secret_여기
```

#### Vercel Preview:

1. **Vercel Dashboard** 접속
2. **프로젝트 선택**
3. **Settings → Environment Variables**
4. **Add Variable**:
   - Name: `NOTION_WEBHOOK_SECRET`
   - Value: 복사한 Secret
   - Environment: ✅ **Preview** 체크
5. **Save**

---

## ✅ 4단계: 테스트

### Webhook 테스트:

1. **Notion에서 새 페이지 생성**
2. **Vercel Logs 확인**:
   - Dashboard → Functions → Logs
   - "Notion webhook received" 메시지 확인
3. **챗봇 테스트**:
   - 배포된 URL 접속
   - "가장 최근 글은?" 질문
   - 새 페이지가 응답에 포함되는지 확인

---

## 📝 추가 환경 변수 설정 (필수)

Vercel Dashboard → Settings → Environment Variables:

**Preview 환경에 추가할 변수들:**

| 변수 이름                       | 값 예시                     |
| ------------------------------- | --------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://xxx.supabase.co`   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...`                    |
| `SUPABASE_SERVICE_ROLE_KEY`     | `eyJ...`                    |
| `NOTION_API_KEY`                | `secret_xxx`                |
| `OPENAI_API_KEY`                | `sk-proj-xxx`               |
| `NOTION_WEBHOOK_SECRET`         | (Webhook 생성 시 복사한 값) |

각 변수 추가 시 **Preview 환경**을 체크하세요!

---

## 🎯 한 줄 요약

```bash
# 1. 로그인
pnpm vercel login

# 2. 배포
pnpm run deploy:preview

# 3. URL 복사 후 Notion Integration에서 Webhook 설정
# 4. Webhook Secret을 Vercel 환경 변수에 추가
```

자세한 내용은 `NOTION_WEBHOOK_MANUAL_SETUP.md` 참고하세요!


