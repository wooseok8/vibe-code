# Vibe Coding - 세팅 가이드

## 배포 구조

```
로컬 코드 → GitHub (wooseok8/vibe-code) → GitHub Pages (자동 배포)
                                          → Vercel (자동 배포)
```

- **GitHub Pages**: https://wooseok8.github.io/vibe-code/
- **Vercel**: https://vibe-code-umber.vercel.app/

---

## 이 세팅은 최초 1회만 진행

아래 작업은 레포지터리를 처음 만들 때 한 번만 하면 됩니다.
새 프로젝트를 추가할 때마다 반복할 필요 없습니다.

### 1단계 — 로컬 폴더를 GitHub 레포에 연결

```powershell
cd "C:\my-project\10. study\vibe coding"

git init
git remote add origin https://github.com/wooseok8/vibe-code.git
git config user.name "wooseok8"
git config user.email "wooseok0427@gmail.com"

git add .
git commit -m "init: vibe coding projects"
git branch -M main
git push -u origin main
```

### 2단계 — GitHub Pages 설정

1. https://github.com/wooseok8/vibe-code 접속
2. **Settings** → **Pages**
3. Source: `Deploy from a branch`
4. Branch: `main` / `/ (root)` → **Save**
5. 1~2분 후 배포 완료

### 3단계 — Vercel 연결

1. https://vercel.com 접속 → GitHub으로 로그인
2. **Add New Project** → `vibe-code` 레포 선택 → **Import**
3. 설정 변경 없이 **Deploy** 클릭
4. 완료 후 URL 생성됨

---

## 새 프로젝트 추가 방법 (반복 작업)

### 폴더 구조

```
vibe coding/
├── index.html          ← 전체 프로젝트 목록 (메인 페이지)
├── 01-project-name/
│   └── index.html
├── 02-project-name/
│   └── index.html
└── ...
```

### 추가 절차

```powershell
# 1. 새 프로젝트 폴더 생성 후 코드 작성

# 2. 푸시
git add .
git commit -m "add: 프로젝트명"
git push
```

→ GitHub Pages와 Vercel 모두 자동으로 업데이트됩니다.
