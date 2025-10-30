# Notion 워크스페이스 연동 가이드

현재 Notion API로 페이지를 찾을 수 없는 상태입니다. 다음 단계를 따라 설정해주세요.

## 🔐 Notion Integration 접근 권한 설정

### 1단계: Notion Integration 확인

1. [Notion Integrations 페이지](https://www.notion.so/my-integrations) 접속
2. 사용 중인 Integration 확인 (API 키에 해당하는 Integration)

### 2단계: 워크스페이스 접근 권한 부여

**방법 A: 특정 페이지에 권한 부여**

1. "짧은 글쓰기" 페이지에서:
   - 우측 상단 `···` 메뉴 클릭
   - `Connections` 선택
   - Integration 추가 (API 키에 해당하는 Integration 선택)

**방법 B: 전체 워크스페이스 권한 부여**

1. Notion 설정 → `Connections` → `Add connections`
2. 사용 중인 Integration 추가

## 📄 Page ID로 직접 동기화

페이지 ID를 알고 있다면 직접 동기화할 수 있습니다:

1. Notion에서 "짧은 글쓰기" 페이지 열기
2. URL에서 Page ID 추출:
   ```
   https://www.notion.so/짧은-글쓰기-XXXXXXXX-YYYY-YYYY-YYYY-YYYYYYYYYYYY
                                  ↑ 여기가 Page ID (하이픈 포함)
   ```
3. 스크립트 실행:
   ```bash
   pnpm tsx scripts/sync-specific-page.ts <page-id>
   ```

## 🔍 페이지 찾기

모든 페이지를 나열하려면:

```bash
# 모든 페이지 나열
pnpm tsx scripts/find-notion-page.ts

# 특정 키워드로 검색
pnpm tsx scripts/find-notion-page.ts "짧은"
```

## ✅ 동기화 확인

동기화가 완료되면 브라우저에서 테스트:

```
질문: "짧은 글쓰기 페이지의 가장 최근 글 1개의 제목은?"
```

---

## 🚨 해결되지 않는 경우

1. **Integration이 워크스페이스를 볼 수 없음**
   - Integration을 워크스페이스에 연결해야 합니다
2. **페이지를 찾을 수 없음**
   - Page ID를 직접 사용하세요
   - 또는 Integration에 해당 페이지 접근 권한이 있는지 확인

3. **API 키 오류**
   - `.env.local`의 `NOTION_API_KEY`가 올바른지 확인
   - Integration의 Internal Integration Token을 사용해야 합니다
