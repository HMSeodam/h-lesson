# Hmseodam Learning Lab — 선과 유식 데모

시작하기: https://hmseodam.github.io/h-lesson

사용자가 제공한 PDF 「선과 유식(cut)-시작하며(1).pdf」 4쪽을 예시로 만든 **반응형 인문학 학습 웹앱 + 인포그래픽 + 퀴즈 + GitHub 게시 도구**입니다.

## 포함 파일

- `index.html`, `styles.css`, `app.js` : PC/모바일 반응형 학습 웹앱
- `content-index.json` : 사이트가 읽는 강의 목록(자동 생성)
- `content/샘플대학교/2026/2학기/선과 유식/week01/lesson.json` : 인포그래픽 블록 + 중간퀴즈 + 최종퀴즈 데이터
- `.../quiz.json` : 퀴즈만 분리한 파일
- `infographic/선과유식_인포그래픽.html` : 단독 인포그래픽 HTML
- `infographic/선과유식_인포그래픽.svg` : 벡터 인포그래픽 파일
- `tools/publisher.py` : 학교/연도/학기/과목/주차를 입력해 새 lesson.json을 등록하고 GitHub push까지 하는 GUI 도구
- `tools/run_publisher_windows.bat` : Windows에서 게시 도구 실행
- `scripts/build_index.py` : `content` 폴더를 검사해 `content-index.json` 자동 생성
- `.github/workflows/pages.yml` : GitHub Pages 자동 배포 Action
- `serve_local.bat` : Windows 로컬 테스트 서버

## 1. 가장 먼저 시험하기

ZIP을 압축 해제한 뒤 Windows에서 `serve_local.bat`을 더블클릭하세요.

브라우저에서 다음 주소가 열립니다.

`http://localhost:8000`

메뉴에서 다음을 시험할 수 있습니다.

1. **한눈에 보기** — 인포그래픽형 요약
2. **학습하기** — 블록을 한 단계씩 읽고 중간 Check Point 풀기
3. **퀴즈** — 객관식 6문항 + 주관식 3문항
4. PC/모바일 화면 크기 변화
5. 다크 모드
6. 틀린 문제에서 관련 학습 블록으로 되돌아가기

> `index.html`을 파일로 직접 더블클릭하면 브라우저의 로컬 JSON 보안 정책 때문에 자료를 읽지 못할 수 있습니다. `serve_local.bat`을 사용하세요.

## 2. 새 수업 자료 추가하기

`tools/run_publisher_windows.bat`을 실행합니다.

1. 학교명
2. 연도
3. 학기
4. 과목명
5. 주차
6. AI가 만든 `lesson.json`

을 입력하고 **로컬에 자료 등록**을 누릅니다.

프로그램이 자동으로 다음 구조에 저장합니다.

```text
content/
  학교명/
    연도/
      학기/
        과목명/
          week01/
            lesson.json
```

그리고 `content-index.json`도 다시 만듭니다. 따라서 사이트 소스 코드를 수정하지 않아도 새 수업이 선택 메뉴에 나타납니다.

## 3. GitHub Pages에 올리기

### 최초 1회

1. GitHub에서 빈 저장소를 만듭니다.
2. 이 프로젝트 폴더 전체를 저장소에 올립니다.
3. GitHub 저장소의 **Settings → Pages → Source**를 `GitHub Actions`로 설정합니다.

### 이후

게시 도구의 **GitHub 저장소 URL**에 저장소 주소를 입력한 뒤 **등록 + GitHub에 push**를 누릅니다.

프로그램은 비밀번호나 토큰을 저장하지 않고 현재 PC의 Git 인증(Git Credential Manager/SSH)을 사용합니다.

GitHub에 push되면 `.github/workflows/pages.yml`이 실행되어:

`content 폴더 검사 → content-index.json 재생성 → GitHub Pages 자동 배포`

순서로 처리합니다.

## 4. AI가 앞으로 만들어야 할 것은 무엇인가?

매주 AI가 생성해야 할 핵심 산출물은 `lesson.json` 하나입니다.

그 안에는 다음이 들어갑니다.

- HERO
- COMPARE
- FLOW
- CONCEPT_MAP
- SPECTRUM
- CAUSE_EFFECT
- CHECKPOINT
- RECAP
- FINAL QUIZ

웹앱은 이 데이터를 받아 같은 디자인 시스템으로 자동 렌더링합니다. 즉 AI가 매번 HTML 디자인을 다시 만드는 방식이 아니라 **AI는 정보구조를 만들고, 웹앱이 디자인합니다.**

## 5. 실제 운영 전에 바꾸면 좋은 것

- `샘플대학교`를 실제 학교명으로 변경
- 사이트 로고/서비스명 변경
- 교과목별 대표색 또는 표지 이미지 추가
- 교수자용 업로드 화면과 학생용 화면 분리
- 필요하면 Firebase/Supabase를 붙여 학생별 진도·점수 저장

