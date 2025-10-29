# 에러 해결 가이드

## 현재 발생한 에러: `/api/chat` 500 Internal Server Error

### 🔍 원인 분석

콘솔 로그를 보면:

```
POST /api/chat 500 in 859ms
Error in chat endpoint
```

**주요 원인:**

1. ✅ Supabase에 블록 데이터는 있음 (3개)
2. ❌ 하지만 **임베딩(embedding)이 0개** → 벡터 검색 실패

### 🛠️ 해결 방법

#### 방법 1: 임베딩 추가 스크립트 실행 (권장)

```bash
# 기존 블록에 임베딩 추가
pnpm tsx scripts/fix-missing-embeddings.ts
```

#### 방법 2: 테스트 데이터 다시 추가

```bash
# 전체 테스트 데이터 추가 (임베딩 포함)
pnpm tsx scripts/add-test-data.ts
```

**주의:** `.env.local` 파일이 있어야 합니다!

#### 방법 3: 수동으로 임베딩 추가

Supabase Dashboard에서 SQL 실행:

```sql
-- 1. 현재 상태 확인
SELECT page_id, block_id,
       CASE WHEN embedding IS NULL THEN '없음' ELSE '있음' END as embedding_status
FROM notion_blocks;

-- 2. 임베딩이 없는 블록 확인
SELECT COUNT(*) as blocks_without_embedding
FROM notion_blocks
WHERE embedding IS NULL;
```

---

## 🔍 단계별 디버깅

### 1단계: 환경 변수 확인

`.env.local` 파일이 있는지, 그리고 다음 변수들이 설정되어 있는지 확인:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
OPENAI_API_KEY=sk-xxx
```

### 2단계: Supabase 데이터 확인

```bash
# 셋업 체크 스크립트 실행 (환경 변수 확인 포함)
pnpm tsx scripts/check-setup.ts
```

### 3단계: 개발 서버 로그 확인

브라우저 개발자 도구 → Network 탭:

1. `/api/chat` 요청 클릭
2. Response 탭에서 에러 메시지 확인
3. Console에서 자세한 에러 스택 확인

### 4단계: 서버 로그 확인

터미널에서 Next.js 개발 서버 로그를 확인:

- `Error in chat endpoint` 뒤에 나오는 상세 에러 메시지 확인
- `MMR retrieval failed` 또는 `Vector search failed` 메시지 확인

---

## 🔧 일반적인 에러 원인

### 에러 1: "Vector search failed: function match_blocks does not exist"

**원인**: Supabase에 `match_blocks` 함수가 없음

**해결**:

```sql
-- Supabase Dashboard SQL Editor에서 실행
-- database/migrations/006_create_vector_search_function.sql 내용 실행
```

### 에러 2: "No candidates found for query"

**원인**:

- 임베딩 데이터가 없음
- 또는 유사도 임계값(0.5)이 너무 높음

**해결**:

1. 임베딩 데이터 추가: `pnpm tsx scripts/add-test-data.ts`
2. 또는 임계값 낮추기 (코드 수정 필요)

### 에러 3: "supabaseUrl is required"

**원인**: `.env.local` 파일이 없거나 환경 변수가 로드되지 않음

**해결**:

1. `.env.local` 파일 존재 확인
2. `dotenv.config({ path: ".env.local" })`가 스크립트에 있는지 확인

---

## ✅ 빠른 해결 체크리스트

```
□ 1. .env.local 파일 존재 확인
□ 2. Supabase 환경 변수 설정 확인
□ 3. OpenAI API 키 설정 확인
□ 4. 임베딩 데이터 추가 스크립트 실행
   → pnpm tsx scripts/fix-missing-embeddings.ts
□ 5. 브라우저 새로고침 후 다시 테스트
□ 6. 개발 서버 로그에서 상세 에러 확인
```

---

## 📞 다음 단계

위의 해결 방법을 시도한 후에도 에러가 발생하면:

1. **브라우저 Console**의 전체 에러 메시지 확인
2. **서버 로그**의 상세 에러 확인
3. **Network 탭**에서 Response body 확인

이 정보를 제공해주시면 더 정확한 해결책을 제시할 수 있습니다!
