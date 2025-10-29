# GitHub에 푸시하기

## 현재 상태
- ✅ 원격 저장소 설정됨: https://github.com/lbo728/notion-rag.git
- ✅ 커밋 완료
- ⏳ 리포지토리 푸시 대기

## 단계별 진행

### 1. GitHub에서 리포지토리 생성
1. https://github.com/new 접속
2. 리포지토리 이름: **notion-rag**
3. Public으로 설정
4. **Initialize this repository with a README 체크 해제** (중요!)
5. Create repository 클릭

### 2. 푸시 실행
리포지토리 생성 후 아래 명령어 실행:

```bash
git push -u origin 001-concept-rag-chatbot
```

## 또는 GitHub CLI 사용 (선택)
lbo728 계정으로 로그인 후:

```bash
gh auth login
# lbo728 계정으로 로그인

gh repo create lbo728/notion-rag --public --source=. --remote=origin
```

