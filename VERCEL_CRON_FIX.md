# Vercel Cron 제한 해결 방법

## ❌ 문제

```
Error: Hobby accounts are limited to daily cron jobs.
This cron expression (*/10 * * * *) would run more than once per day.
```

**원인:**

- Vercel Hobby 플랜은 **하루에 한 번만** 실행 가능한 Cron만 지원
- 현재 설정 (`*/10 * * * *`)은 10분마다 실행 → 하루에 144번 실행
- Pro 플랜 업그레이드 필요 (비용 발생)

---

## ✅ 해결 방법

### 방법 1: Cron을 하루 한 번으로 변경 (권장) ⭐

**현재 설정:**

- 하루에 한 번 실행 (매일 새벽 3시)

**장점:**

- 무료 플랜에서 사용 가능
- Webhook과 조합하면 충분함

**`vercel.json` 수정 완료:**

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 3 * * *" // 매일 새벽 3시
    }
  ]
}
```

---

### 방법 2: Cron 제거하고 Webhook만 사용

**장점:**

- 실시간 동기화 (Webhook)
- 추가 비용 없음

**단점:**

- Webhook 실패 시 수동 동기화 필요

**설정:**

- `vercel.json`에서 `crons` 섹션 제거
- Webhook에만 의존

---

### 방법 3: Pro 플랜 업그레이드

**비용:**

- $20/월

**장점:**

- 원하는 Cron 스케줄 사용 가능
- 더 많은 기능

---

## 💡 추천 전략

**하이브리드 방식 (방법 1 + Webhook):**

1. **Webhook** (주 방식):
   - 실시간 동기화 (페이지 생성/수정 시 즉시)
   - 99%의 경우 충분

2. **Cron** (백업, 하루 한 번):
   - Webhook 누락된 경우 대비
   - 매일 새벽 3시에 한 번 전체 검사

3. **수동 동기화 버튼** (UI):
   - 필요 시 즉시 동기화
   - Preview/Test 환경에서 유용

---

## 📝 현재 설정

**변경 완료:**

- `vercel.json`: Cron을 하루 한 번 (`0 3 * * *`)으로 변경
- 이제 Hobby 플랜에서도 배포 가능!

**다시 배포:**

```bash
pnpm run deploy:preview
```

---

## 🎯 Cron 스케줄 옵션 (Hobby 플랜)

Hobby 플랜에서 사용 가능한 Cron 표현식:

| 스케줄       | 설명                      |
| ------------ | ------------------------- |
| `0 0 * * *`  | 매일 자정                 |
| `0 3 * * *`  | 매일 새벽 3시 (현재 설정) |
| `0 12 * * *` | 매일 정오                 |
| `0 0 * * 1`  | 매주 월요일 자정          |
| `0 0 1 * *`  | 매월 1일 자정             |

**중요:** 하루에 **정확히 한 번만** 실행되어야 함!

---

## ✅ 다음 단계

1. **다시 배포:**

   ```bash
   pnpm run deploy:preview
   ```

2. **Cron이 정상 작동하는지 확인:**
   - Vercel Dashboard → Cron Jobs
   - 다음 실행 시간 확인

3. **Webhook 설정 완료:**
   - Notion Integration에서 Webhook 생성
   - 실시간 동기화 테스트

---

**결론:** Webhook이 주 방식이고, Cron은 백업용으로 하루 한 번이면 충분합니다! 🎉


