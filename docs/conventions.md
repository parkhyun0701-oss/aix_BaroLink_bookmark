# GitHub 저장소 규칙

> W7 개발 준비 · GitHub 레포와 컨벤션(브랜치·커밋)
> 근거: 서비스 계획(`service-plan.md`), 기능명세·API명세(`spec.xlsx`, v14), 파일 구조도(`file-structure.md`), 크롬 북마크 데이터 구조(`data-structure.txt`)
> 작성일: 2026-10-06 (10월 7일 검토와 결정, 확정 시안 확인, 분류표 추가 반영 · 10월 14일 브랜치를 이슈당 하나로 변경) · 이 문서의 위치: `docs/conventions.md`
> 저장소: `aix_BaroLink_bookmark` (공개 저장소, 10월 7일 확정) · 서비스 이름: 바로링크 (BaroLink) (10월 7일 확정)

역할은 팀원 A·B·C·D로 적는다. 누가 어느 역할인지는 README의 담당 표에 **GitHub 아이디**로 적는다. 공개 저장소이므로 실제 이름은 쓰지 않는다(10월 7일 확정).

---

## 0. 한눈에 보기

지킬 것은 여덟 가지다. 나머지 절은 이 여덟 가지를 어떻게 하는지 설명한다.

1. `main`에는 직접 올리지 않는다. 내 브랜치 → 풀 리퀘스트(PR) → 한 명 승인 → 합치기.
2. `main`은 언제 받아도 크롬에 올리면 오류 없이 열려야 한다.
3. 브랜치는 이슈 하나에 하나다. 이름은 `종류/기능번호-짧은이름`, 커밋 메시지는 `종류: 한 일 (요구사항 번호)`.
4. PR에는 명세의 요구사항 번호와 확인 방법을 적는다.
5. 확인은 내 결과를 받아 쓰는 사람이 한다. 코드를 읽지 않고, 테스트용 크롬 프로필에서 명세 줄대로 눌러 본다. 코드는 CodeRabbit이 읽는다. 승인은 사람만 한다.
6. 한 파일은 한 사람이 맡는다. 남의 파일은 담당에게 먼저 말한다.
7. 함수의 넣는 값·나오는 값은 엑셀 명세를 먼저 고치고 팀에 알린 뒤에 바꾼다.
8. P1 → P2 → P3 순서로 만든다.

---

## 1. 저장소 폴더 구조

`file-structure.md`의 2번을 그대로 따른다. 빌드 도구가 없으므로 `extension/` 폴더를 그대로 크롬에 올린다.

```
aix_BaroLink_bookmark/
├── extension/        크롬에 올리는 폴더. 코드만 둔다
│   ├── manifest.json, background.js, newtab.html, newtab.css
│   ├── js/           bookmarks, store, organize, classify, forgotten, plan, topic, render, ui, search, dnd
│   │   └── view/     cards, folders, forgottenFolder, history
│   ├── data/         categories.json
│   └── lib/          Sortable.min.js
├── docs/             service-plan.md · spec.xlsx · file-structure.md · data-structure.txt · category-definitions.md · conventions.md · setup.md
│   └── design/       확정 시안의 코드 (참고용)
├── tests/            샘플 북마크 세트 · 정답지 · 검증 목록
├── .github/          PR 양식 · 자동 검사
├── .vscode/          VS Code 팀 공통 설정
├── AGENTS.md, CLAUDE.md   AI 코딩 도구가 읽는 규칙
├── .gitignore, .gitattributes, .coderabbit.yaml, README.md
```

- `extension/` 안에는 크롬이 읽는 파일만 둔다. 메모, 스크린샷, 시험용 파일은 넣지 않는다.
- `file-structure.md`에 없는 파일이 필요하면, 먼저 `file-structure.md`와 엑셀 명세의 '파일별 역할' 시트에 줄을 추가해 담당을 정한 뒤에 만든다.
- 파일 이름은 영어 소문자와 하이픈으로 짓는다(`file-structure.md`처럼). 윈도우와 맥을 섞어 쓰면 한글 파일 이름이 깨져 보일 수 있어서, 한글 이름이던 문서 세 개도 영어 이름으로 바꿨다(10월 7일).

| 문서 | 파일 이름 | 예전 이름 |
|---|---|---|
| 서비스 계획 | `docs/service-plan.md` | 아이디어E_서비스_계획.md |
| 기능명세·API명세 (이 문서에서 "엑셀 명세") | `docs/spec.xlsx` | 기능명세_API명세.xlsx |
| 크롬 북마크 데이터 구조 | `docs/data-structure.txt` | 크롬_북마크_데이터_구조.txt |
| 카테고리 정의와 분류표 | `docs/category-definitions.md` | category-definitions(분류표).md |

---

## 2. 일하는 순서

① 내 이슈(예: #8 `forgotten.js`)를 열어 Assignees에 나를 넣고, 오른쪽 **Development → Create a branch**로 브랜치를 만든다. 이름은 3번 표대로, Branch source는 `main`이다. 이슈 화면에서 만들어야 브랜치가 이슈에 연결된다.

```bash
# ① 만든 브랜치를 내 PC로 가져온다
git switch main
git pull
git fetch origin
git switch feat/F04-forgotten

# ② 작업하고 커밋한다 (git add . 대신 파일 이름을 적는다)
#    커밋은 함수 하나를 끝낼 때마다 여러 번 해도 된다. 며칠에 한 번은 git pull origin main으로 최신 main을 받아 합친다
git status
git add extension/js/forgotten.js
git commit -m "feat: 잊고 있던 북마크 후보 고르기 (F04-01~03)"

# ③ PR을 올리기 전에 최신 main을 받아 합쳐 보고, 크롬에서 다시 확인한다
#    (처음 한 번 git config --global pull.rebase false 가 필요하다. docs/setup.md 2번)
git pull origin main

# ④ 올린다 (이슈 화면에서 만든 브랜치는 이미 GitHub에 있으므로 git push만 해도 된다)
git push
```

⑤ GitHub에서 PR을 만든다. 자동 검사(`check`)가 초록색인지 보고, CodeRabbit의 리뷰를 받아 댓글을 고치거나 답한다(6번).
⑥ 확인할 사람을 Reviewers에 넣고 팀 채팅에 알린다.
⑦ 승인을 받으면 **올린 사람이** 합친다(Squash and merge). 브랜치는 자동으로 지워진다.
⑧ 다음 이슈는 다시 ①부터. 합쳐진 브랜치는 다시 쓰지 않는다. 같은 이슈의 P2 함수는 새 브랜치에서 한다(3번).

GitHub Desktop을 써도 순서는 같다. `git rebase`와 `git push --force`는 쓰지 않는다.

---

## 3. 브랜치 이름

```
종류/기능번호-짧은이름
```

| 부분 | 규칙 | 예 |
|---|---|---|
| 종류 | 커밋 메시지와 같은 다섯 개: `feat` `fix` `docs` `test` `chore` | `feat` |
| 기능번호 | 엑셀 명세의 기능 ID(F01~F17). 기능 번호가 없는 작업은 뺀다 | `F04` |
| 짧은이름 | 영어 소문자와 하이픈, 두세 단어 | `forgotten` |

예: `feat/F04-forgotten` · `fix/F13-undo-order` · `docs/spec-v15` · `test/sample-30` · `chore/setup`

### 브랜치는 이슈 하나에 하나 (10월 14일 변경)

이슈 하나가 파일 하나이므로(4번), 브랜치도 이슈 하나에 하나를 둔다. 기능번호는 그 파일이 주로 맡는 기능 ID다. 아래 표의 이름을 그대로 쓴다.

| 이슈 | 파일 (`extension/` 아래) | 담당 | 브랜치 |
|---|---|---|---|
| #1 | `manifest.json` | 팀원 A | `chore/manifest-desc` |
| #2 | `js/bookmarks.js` | 팀원 A | `feat/F01-bookmarks` |
| #3 | `js/store.js` | 팀원 A | `feat/F01-store` |
| #4 | `js/organize.js` | 팀원 A | `feat/F07-organize` |
| #5 | `js/view/history.js` | 팀원 A | `feat/F13-history` |
| #6 | `background.js` | 팀원 B | `feat/F07-background` |
| #7 | `js/classify.js` | 팀원 B | `feat/F05-classify` |
| #8 | `js/forgotten.js` | 팀원 B | `feat/F04-forgotten` |
| #9 | `js/view/forgottenFolder.js` | 팀원 B | `feat/F04-forgotten-folder` |
| #10 | `data/categories.json` | 팀원 B | `feat/F05-categories` |
| #11 | `js/plan.js` | 팀원 C | `feat/F05-plan` |
| #12 | `js/topic.js` (P3) | 팀원 C | `feat/F16-topic` |
| #13 | `js/view/folders.js` | 팀원 C | `feat/F03-folders` |
| #14 | `newtab.html`, `newtab.css` | 팀원 D | `feat/F12-newtab` |
| #15 | `js/render.js` | 팀원 D | `feat/F12-render` |
| #16 | `js/ui.js` | 팀원 D | `feat/F02-ui` |
| #17 | `js/view/cards.js` | 팀원 D | `feat/F06-cards` |
| #18 | `js/search.js` | 팀원 D | `feat/F11-search` |
| #19 | `js/dnd.js` (P3) | 팀원 D | `feat/F17-dnd` |
| #20 | 샘플 북마크 세트 (`tests/`) | 팀원 C, 팀원 B | `test/sample-sets` |
| #21 | 저장소 설정 마무리 | 팀원 A | `chore/repo-setup` |

#22~#24는 확인 목록이라 브랜치를 만들지 않는다. 버그를 고칠 때(`fix`)와 문서·명세(`docs`)는 이 표와 별도로 그때그때 만든다.

- 공용 브랜치는 `main` 하나다. `develop` 같은 브랜치는 두지 않는다.
- 브랜치는 이슈 화면의 **Development → Create a branch**로, 항상 최신 `main`에서 만든다. 다른 사람의 브랜치에서 만들지 않는다. 아직 합쳐지지 않은 남의 작업이 필요하면, 그 사람에게 된 데까지 먼저 PR로 올려 달라고 한다(아래 "먼저 올리기").
- 브랜치 하나는 PR 하나다. 그 이슈의 **P1 함수를 모두 끝낸 뒤** PR을 올린다. 작업 중에는 커밋을 여러 번 해도 되고, 며칠에 한 번은 `git pull origin main`으로 최신 `main`을 받아 합친다.
- **P2·P3 함수는 P1 PR에 넣지 않는다.** P1 확인 목록(#22)이 닫힌 뒤, 같은 이슈에서 이름 끝에 `-p2`를 붙인 브랜치를 새로 만든다(예: `feat/F01-bookmarks-p2`, 9번). 이슈에 P1 함수만 있으면 브랜치는 하나로 끝난다.
- **먼저 올리기.** 다른 사람이 기다리는 함수(예: `bookmarks.js`의 `loadTree`, `store.js`의 `load`)는 이슈 전체가 끝나기를 기다리지 않는다. 팀 채팅에 알리고, 그 함수만 담은 브랜치를 이슈 브랜치 이름 끝에 짧은 말을 붙여 따로 만들어(예: `feat/F01-bookmarks-load-tree`) 먼저 PR을 올린다. 합쳐진 뒤 이슈 브랜치에서 `git pull origin main`으로 받는다.

---

## 4. 커밋 메시지

```
종류: 한 일 (요구사항 번호)
```

| 종류 | 언제 쓰나 | 예 |
|---|---|---|
| `feat` | 새 동작을 추가했다 | `feat: 첫 정리 카드 표시 (F06-01)` |
| `fix` | 잘못된 동작을 고쳤다 | `fix: 되돌릴 때 순서가 뒤섞이는 문제 (F13-03)` |
| `docs` | `docs/`의 문서, 엑셀 명세, README | `docs: setPending 입력 형태 변경, 명세 v15` |
| `test` | `tests/`의 샘플 세트, 정답지, 검증 목록 | `test: 30개 샘플 세트 추가` |
| `chore` | 그 밖의 것. 설정 파일, 동작이 안 바뀌는 코드 정리 | `chore: .gitignore 추가` |

- 한국어로, 한 줄로, 무엇을 했는지 적는다.
- 커밋 하나에는 한 가지만 담는다.
- 요구사항 번호는 있으면 괄호에 적는다. 여러 줄이면 `F04-01~03`처럼 적는다.
- PR 제목도 같은 형식으로 쓴다. 합칠 때 PR 제목이 `main`의 커밋 한 줄이 된다.

### 이슈

- 할 일은 GitHub 이슈에 있다. **#1~#19는 파일 19개**이고(이슈 하나 = 파일 하나 = 담당 한 명), 그 파일에 만들 함수가 입력·출력·동작과 함께 체크 칸으로 들어 있다. 번호는 `spec.xlsx` '파일별 역할' 시트의 "이슈" 열에 있다. #20(샘플 세트)과 #21(저장소 설정)은 준비 작업이다.
- 이슈는 모두 핵심 정책 → 세부 작업 → 완료 조건 → 테스트 → 참고 자료 순서로 적는다. 새 이슈를 만들 때도 이 순서를 따른다.
- **#22~#24는 요구사항 확인 목록**이다(P1, P2, P3). 요구사항은 여러 파일이 함께 있어야 확인되므로 따로 모았다. 확인하는 사람이 눌러 보고 통과한 줄에 체크한다.
- 브랜치가 이슈 하나에 하나이므로(3번), PR 본문에도 그 이슈 하나를 적는다. 그 PR로 이슈의 함수가 모두 끝나면 `Closes #8`을 쓴다. P2 함수가 남아 있는 P1 PR과 "먼저 올리기" PR은 `Refs #8`을 쓰고, 마지막 PR(보통 `-p2` 브랜치)에서 `Closes #8`을 쓴다. 요구사항 번호(`F04-01`)에는 `#`을 붙이지 않는다.

---

## 5. 풀 리퀘스트에 적을 내용

`.github/pull_request_template.md`에 아래 양식을 넣어 두면 PR을 만들 때 자동으로 채워진다.

```markdown
## 무엇을 했나요
- 이슈: Refs #  (고친 파일의 이슈 번호. 이 PR로 그 파일의 마지막 함수가 끝나면 Refs 대신 Closes)
- 요구사항 번호: (예: F04-01 ~ F04-03)
- 우선순위: P1 / P2 / P3
- 한 줄 설명:
- AI 도구: (쓴 도구와 맡긴 일. 안 썼으면 "없음")

## 바꾼 파일
- [ ] 내가 맡은 파일만 고쳤다
- 남의 파일을 고쳤다면: 파일 이름 / 담당이 허락한 날 / 이유

## 확인 방법 (확인하는 사람이 그대로 따라 할 수 있게)
- 쓸 샘플 세트: 10개 미만 / 서로 다른 20개 / 30개 / 100개
- 누를 순서:
  1.
  2.
- 기대 결과:
- 화면이 없는 줄은 이렇게 확인: (콘솔에 넣을 내용과 나와야 할 값)

## 올리기 전에 내가 확인한 것
- [ ] 최신 main을 받아 합친 뒤, 테스트용 크롬 프로필에서 명세 줄대로 눌러 봤다
- [ ] 확장 프로그램 관리 화면(chrome://extensions)에 오류가 없다
- [ ] 자동 검사(check)가 초록색이다
- [ ] 함수의 넣는 값·나오는 값을 바꾸지 않았다 (바꿨다면 명세를 먼저 고쳤다: v__)
- [ ] CodeRabbit의 댓글을 모두 고치거나, 안 고치는 이유를 답했다
- [ ] AI가 쓴 코드도 내가 읽었고, 직접 눌러 봤다

## 화면이 바뀌었다면 스크린샷 (시안의 같은 화면과 나란히)
```

PR 하나에 P1 줄과 P2 줄을 섞지 않는다.

---

## 6. 확인하는 법

### 누가 확인하나

내 결과를 받아 쓰는 사람이 확인한다.

| PR을 올린 사람 | 확인하는 사람 | 받아 쓰는 관계 |
|---|---|---|
| 팀원 A | 팀원 B | `background.js`와 `view/forgottenFolder.js`가 `store.js`·`bookmarks.js`를 쓴다 |
| 팀원 B | 팀원 C | `plan.js`가 `classify.js`의 분류 결과를 쓴다 |
| 팀원 C | 팀원 D | `render.js`와 `view/cards.js`가 `plan.js`의 계획과 `view/folders.js`를 쓴다 |
| 팀원 D | 팀원 A | `view/history.js`가 `render.js`가 넘겨 주는 값으로 D의 화면 뼈대 위에 그려진다 |

- 확인은 요청받은 다음 날까지 한다. 내 작업보다 확인 요청이 먼저다.
- 이틀 안에 못 하면 팀 채팅에 말하고, 그다음 순서의 사람이 대신한다(A의 PR이면 C).
- `docs/`나 `tests/`만 바꾼 PR은 누구든 한 명이 승인하면 된다. 엑셀 명세는 8번을 따른다.

### 어떻게 확인하나

코드를 읽지 않는다. 직접 올려서 눌러 본다.

1. 내 작업을 커밋해 둔 뒤 PR의 브랜치를 받는다.
   ```bash
   git fetch origin
   git switch feat/F04-forgotten
   ```
2. **테스트용 크롬 프로필**을 PR에 적힌 샘플 세트 상태로 맞춘다. 본인이 평소 쓰는 크롬 프로필에는 올리지 않는다. 이 확장 프로그램은 크롬 북마크를 실제로 바꾼다.
3. `chrome://extensions`에서 확장 프로그램의 새로고침 버튼을 누르고 새 탭을 연다.
4. 엑셀 명세 '기능 명세' 시트에서 PR에 적힌 요구사항 줄을 찾아, 문장대로 눌러 본다. 정상 줄과 예외 줄을 모두 본다.
5. 화면이 없는 줄(분류, 폴더 계획처럼 계산만 하는 줄)은 PR의 "확인 방법"에 적힌 대로 콘솔 출력이나 `tests/`의 샘플 세트·정답지로 확인한다. 새 탭에서 F12를 눌러 콘솔을 열면 함수를 직접 불러 볼 수 있다.
   ```js
   const m = await import("/js/classify.js");
   const categories = await (await fetch("/data/categories.json")).json();
   m.classify({ title: "채용 공고", url: "https://example.com" }, categories);
   ```
6. 크롬 북마크를 바꾸는 기능이면 크롬 북마크 관리자에서도 결과를 본다.
7. `chrome://extensions`에 오류 표시가 없는지 본다(서비스 워커 포함).

- 다 맞으면 GitHub의 PR 화면에서 Approve를 누른다.
- 다르면 요구사항 번호와 실제로 본 결과를 댓글로 남긴다. 올린 사람은 같은 브랜치에 커밋을 더 올린다. PR을 새로 만들지 않는다.
- 고친 것을 다시 확인할 때는 그 브랜치에서 `git pull`로 새 커밋을 받고, 확장 프로그램을 새로고침한 뒤에 본다.
- 통과한 요구사항은 확인 목록 이슈(#22~#24)의 그 줄에 체크한다.
- 끝나면 `git switch 내브랜치`로 돌아온다.

### CodeRabbit 자동 리뷰

사람은 코드를 읽지 않으므로, 눌러 봐서는 보이지 않는 것을 CodeRabbit이 본다. 둘은 보는 것이 다르고, 서로를 대신하지 않는다.

CodeRabbit보다 먼저 **자동 검사(`check`)** 가 돈다. PR마다 GitHub가 문법 오류, 빠진 함수, 없는 함수를 `import`한 곳, 깨진 JSON을 찾는다(`.github/scripts/check.mjs`). 빨간색이면 합칠 수 없고, 무엇이 걸렸는지는 PR의 "Details"에 나온다. 각자 PC에 설치할 것은 없다.

| | 사람 (받아 쓰는 사람) | CodeRabbit |
|---|---|---|
| 보는 것 | 명세 줄대로 동작하는가 | 코드에 실수나 규칙 위반이 있는가 |
| 방법 | 테스트용 크롬 프로필에서 눌러 본다 | PR의 바뀐 코드를 읽고 댓글을 단다 |
| 잘 찾는 것 | 화면, 크롬 북마크의 실제 결과, 예외 줄 | 빠진 `await`, 오류 처리, 제목·주소를 `innerHTML`에 넣는 코드, 파일 구조 규칙 위반(`store.js`를 거치지 않는 저장 등) |
| 못 하는 것 | 코드 안쪽의 실수 | 크롬에서 실제로 돌려 보기, 명세와 맞는지 판단하기 |
| 결과 | **승인(Approve)**. 합치는 기준은 이것 하나다 | 댓글. 승인하지 않는다 |

순서와 규칙

1. PR을 올리면 CodeRabbit이 먼저 본다. 저장소의 별이 10개 미만이면 자동으로 시작하지 않으므로, PR에 `@coderabbitai review`라고 댓글을 달거나 CodeRabbit 댓글의 "Trigger review"를 누른다.
2. 올린 사람이 댓글을 하나씩 처리한다. 고치거나, 안 고치면 이유를 한 줄 답한다. 전부 따를 필요는 없다.
3. 댓글을 처리한 뒤에 사람에게 확인을 부탁한다. 사람이 마지막 코드를 눌러 보게 하기 위해서다. 승인 뒤에 코드를 바꾸면 승인이 풀리므로 다시 부탁한다.
4. **명세가 이긴다.** CodeRabbit은 우리가 크롬에서 직접 확인한 사실을 모른다. 명세의 "실행 확인"과 다른 제안(예: 옮긴 뒤 `pendingMoves`를 지우라는 제안)은 따르지 않고, 명세의 번호를 답글로 남긴다.
5. 제안이 함수의 넣는 값·나오는 값을 바꾸면 8번을, 남의 파일을 고치라고 하면 7번을 따른다.
6. 제안을 받아들여 코드를 고쳤으면 크롬에서 다시 눌러 본다. "Commit suggestion" 버튼으로 바로 넣은 것도 마찬가지다.
7. 리뷰 횟수에 제한이 있다(무료는 한 사람당 한 시간에 몇 번). 커밋할 때마다 부르지 않고, PR이 다 됐을 때 한 번, 고친 뒤에 한 번 정도 부른다.
8. `@coderabbitai approve`는 쓰지 않는다.

`docs/`나 엑셀 명세만 바꾼 PR은 CodeRabbit 리뷰를 기다리지 않아도 된다. 엑셀·그림·`*.min.js`는 CodeRabbit이 원래 보지 않는다.

---

## 7. 한 파일은 한 사람

### 담당 표

| 담당 | 맡는 파일 (`extension/` 아래) |
|---|---|
| 팀원 A | `manifest.json`, `js/bookmarks.js`, `js/store.js`, `js/organize.js`, `js/view/history.js` |
| 팀원 B | `background.js`, `js/classify.js`, `js/forgotten.js`, `js/view/forgottenFolder.js`, `data/categories.json` |
| 팀원 C | `js/plan.js`, `js/topic.js`, `js/view/folders.js` |
| 팀원 D | `newtab.html`, `newtab.css`, `js/render.js`, `js/ui.js`, `js/view/cards.js`, `js/search.js`, `js/dnd.js` |

- `lib/Sortable.min.js`는 받아 온 파일이라 아무도 고치지 않는다. 넣는 것은 팀원 D가 P3를 시작할 때 한다.
- `docs/`와 `tests/`는 누구나 고칠 수 있다. 단, 샘플 세트는 팀원 C, 정답지는 팀원 B에게 먼저 말한다.
- 저장소 설정 파일(`.gitignore`, `.gitattributes`, `.coderabbit.yaml`, `.github/`, `.vscode/`, `README.md`, `AGENTS.md`, `CLAUDE.md`)은 팀원 A가 맡는다(제안).

### 남의 파일을 고쳐야 할 때

1. **담당에게 먼저 부탁한다.** 팀 채팅이나 GitHub Issue에 파일 이름, 요구사항 번호, 필요한 것을 적는다. 담당이 자기 브랜치에서 고친다. 이것이 기본이다.
2. 담당이 "직접 고쳐도 된다"고 하면 내 브랜치에서 고친다. 이때
   - 그 파일의 수정은 따로 커밋하고,
   - PR의 "바꾼 파일" 칸에 적고,
   - 그 파일의 담당을 Reviewers에 추가한다. 원래 확인하는 사람과 담당, 두 명의 승인을 받는다.
3. 함수의 넣는 값·나오는 값이 바뀌는 수정은 2번으로 하지 않는다. 8번을 따른다.
4. 오타 한 글자도 같은 절차를 따른다. 예외를 두지 않는 쪽이 쉽다.
5. 데모 전날 담당과 연락이 닿지 않을 때만, 다른 팀원 한 명의 승인으로 합치고 담당에게 PR 주소를 남긴다.

자주 생길 경우는 아래와 같다.

| 필요한 것 | 부탁할 사람 |
|---|---|
| `render.js`에서 내 화면 함수를 부르는 줄 | 팀원 D |
| `newtab.html`의 칸, `newtab.css`의 모양 | 팀원 D |
| 앱 아이콘, 안내 문구, 선 아이콘(`ui.js`)에 없는 기능 | 팀원 D (함수의 입력이 바뀌면 명세가 먼저, 8번) |
| `store.js`·`bookmarks.js`에 새 함수 | 팀원 A (명세에 줄 추가가 먼저, 8번) |
| `manifest.json`의 권한 | 팀원 A |
| `categories.json`의 사이트·키워드 추가, 틀린 분류 | 팀원 B. `docs/category-definitions.md`의 10번 표도 함께 고치고, 정답지로 다시 잰다 |

### 화면을 만들 때: 모양은 시안, 동작은 명세

확정 시안(Figma Make)은 React와 Tailwind로 만들어져 있고, 동작은 가짜 데이터로 흉내 낸 것이다.

- **모양은 시안, 동작은 명세를 따른다.** 둘이 다르면 `docs/spec.xlsx`가 이긴다.
- **시안의 코드를 복사하지 않는다.** 배치·색·간격·글자 크기만 가져와 HTML·CSS·JavaScript로 다시 쓴다. 시안의 코드는 `docs/design/`에 참고용으로만 두고, `extension/`에는 넣지 않는다.
- **자기 칸 안만 그린다.** `newtab.html`의 칸마다 그리는 파일이 하나씩 정해져 있다(`docs/file-structure.md` 12번).
- **다른 화면 파일의 동작이 필요하면 `render.js`가 넘겨 준 동작 묶음(`actions`)을 쓴다.** 예: 잊고 있던 북마크의 [어디 있는지 보기]는 `actions.openFolder(folderId)`를 부른다. 필요한 동작이 없으면 명세(N30)에 먼저 추가한다.
- **앱 아이콘, 짧은 안내 문구, 선 아이콘은 `js/ui.js`의 함수로만 그린다.** 화면 파일끼리는 서로 부르지 않지만 `ui.js`만은 모두가 불러 쓴다. 팝업은 공통 함수 없이 `<dialog>`와 `newtab.css`의 공통 모양으로 만든다.
- **색과 크기는 `newtab.css` 맨 위의 공통 값만 쓴다.** 팀원 D가 공통 값(색, 간격, 글자 크기, 둥글기)과 공통 모양(팝업 틀, 버튼, 목록 줄)을 먼저 올린다. 나머지 담당은 색 코드나 크기를 직접 쓰지 않고, 필요한 모양이 없으면 팀원 D에게 부탁한다.
- **화면이 바뀐 PR에는 시안의 같은 화면과 나란히 찍은 스크린샷을 붙인다.**

### AI 코딩 도구를 쓸 때

AI 도구(Claude Code, Cursor, Copilot 등)가 지킬 규칙은 저장소 맨 위의 `AGENTS.md`에 있다. 도구가 이 파일을 자동으로 읽는다(Claude Code는 `CLAUDE.md`를 거쳐 읽는다).

- **AI에게 내가 어느 담당인지 먼저 알려 준다.** AI는 여러 파일을 한꺼번에 고치려는 경향이 있다. 내 파일만 고치게 하고, 남의 파일을 고친 것이 있으면 되돌린 뒤 담당에게 부탁한다.
- **AI에게 그 파일의 이슈를 읽힌다.** AI는 엑셀 명세를 직접 읽지 못한다. 이슈에 같은 내용이 글로 들어 있다.
- **AI가 쓴 코드도 올린 사람의 코드다.** 올리기 전에 직접 읽고, 테스트용 프로필에서 눌러 본다. AI가 "확인했다"고 해도 눌러 본 것이 아니다.
- **AI가 함수의 이름·입력·출력을 바꾸자고 하면 받아들이지 않는다.** 필요하면 8번대로 명세를 먼저 고친다.
- **AI가 패키지, 빌드 도구, React, TypeScript를 넣자고 하면 받아들이지 않는다.** 자동 검사도 이런 파일을 막는다.
- **실제 북마크, 설문 원본, 개인 정보를 AI에게 붙여 넣지 않는다.** 샘플 북마크를 쓴다.
- PR의 "AI 도구" 칸에 쓴 도구와 맡긴 일을 적는다. 확인하는 사람이 어디를 더 볼지 알 수 있다.
- AI가 같은 실수를 반복하면 `AGENTS.md`에 한 줄을 더한다(팀원 A에게 부탁).

---

## 8. 함수의 넣는 값·나오는 값을 바꿀 때

아래는 다른 사람의 코드가 기대고 있는 약속이다. 코드보다 엑셀 명세(`docs/spec.xlsx`)를 먼저 고친다.

- 'API_내부 함수' 시트의 함수 이름, 입력, 출력
- '참고_저장 항목' 시트의 키 이름과 형태
- `categories.json`의 형태(사이트나 키워드를 추가하는 것은 해당 없음. 단, `docs/category-definitions.md` 10번과 함께 고친다)
- '기능 명세' 시트의 요구사항 문장

순서

1. 팀 채팅에 알린다. 예: "명세 고칩니다. N14 setPending 입력". 엑셀 파일은 두 사람이 동시에 고치면 합칠 수 없으므로, **한 번에 한 사람만** 고친다.
2. `docs/spec-v15` 같은 브랜치에서 해당 줄을 고치고, '개요' 시트의 판 번호를 올리고 무엇이 바뀌었는지 한 줄 적는다. 파일 이름에는 판 번호를 넣지 않는다.
3. PR을 올린다. **그 함수를 부르는 파일의 담당**이 승인한다(누가 부르는지는 `file-structure.md` 4번 그림). 부르는 사람이 여럿이면 한 명이 승인하고, 나머지에게는 팀 채팅으로 알린다. 명세 PR은 그날 안에 합친다.
4. 합쳐진 뒤에 코드를 바꾸는 PR을 올린다.
5. 함수의 입력·출력을 바꿨으면 그 파일의 이슈(#1~#19)를, 요구사항 문장을 바꿨으면 확인 목록(#22~#24)을 같게 고친다.

함수 안쪽의 동작만 바꾸고 입력·출력이 그대로면 이 절차는 필요 없다.

---

## 9. P1 → P2 → P3 순서

우선순위는 엑셀 명세 '기능 명세' 시트의 우선순위 열에 요구사항 줄마다 적혀 있다.

- 지금은 P1 줄만 만든다(11주 중간 데모).
- 내 P1이 먼저 끝나면 ① 나에게 온 확인 요청 ② 내 결과를 받아 쓰는 사람과 함께 연결 확인 ③ 그다음에 P2 브랜치(`-p2`, 3번)를 이슈 화면에서 최신 `main`으로 만든다.
- P2 PR은 P1 요구사항이 모두 `main`에 합쳐진 뒤에 올린다(P1 확인 목록인 이슈 #22가 닫힌 뒤). P3도 P2 뒤에 같은 방식이다.
- 데모 이틀 전부터는 `fix`만 합친다.
- 데모 날의 `main`에 태그를 붙인다(`demo-w11`, `demo-w15`). GitHub의 Releases에서 만들면 된다. 나중에 그날의 코드를 그대로 다시 받을 수 있다.

---

## 10. 저장소를 처음 만들 때

팀원 A가 한다. 첫 커밋만 `main`에 직접 올리고, 그 뒤에 보호 설정을 켠다.

### 넣어 둘 파일

| 파일 | 내용 |
|---|---|
| `.gitignore` | 올리지 않을 파일 목록 (부록 1) |
| `.gitattributes` | 윈도우와 맥의 줄 끝 차이를 맞추고, 엑셀·그림을 합칠 수 없는 파일로 표시 (부록 2) |
| `README.md` | 소개, 기술 스택, 현재 구현 범위, 프로젝트 구조와 담당 표, 브랜치, 커밋 컨벤션, 로컬 실행, 확인과 자동 검사, 권한, 저장하는 데이터, 상태 확인, 기능 개발 시작, 문서 목록 |
| `.github/pull_request_template.md` | 5번의 양식 |
| `.github/workflows/check.yml`, `.github/scripts/check.mjs` | PR 자동 검사. 문법, 명세의 함수 55개, `import`, JSON, 분류표 형태, 넣지 않기로 한 파일(패키지, TypeScript 등)을 본다. 명세에 함수를 추가하면 `check.mjs`의 목록도 함께 고친다 |
| `.vscode/settings.json` | VS Code 팀 공통 설정 (들여쓰기 2칸, 줄 끝 통일, 저장할 때 자동 정렬 끔) |
| `docs/setup.md` | 팀원이 자기 PC에서 처음 한 번 할 준비 |
| `AGENTS.md`, `CLAUDE.md` | AI 코딩 도구가 읽는 규칙. 넣지 않는 것, 담당별 파일과 이슈 번호, 바꾸면 안 되는 것, 확인과 Git 규칙. `CLAUDE.md`는 `AGENTS.md`를 불러오기만 한다 |
| `.coderabbit.yaml` | CodeRabbit 설정. 한국어로 답하게 하고, 승인은 하지 않게 하고, 우리 파일 구조 규칙을 알려 준다 (부록 3) |
| `extension/` 뼈대 | `file-structure.md`의 파일을 모두 만들고, 맨 위에 `// 담당: 팀원 B · 이슈 #8 · 명세: N25, N26 (F04)`처럼 적는다. 파일을 누가 처음 만드는지로 부딪히지 않게 하기 위해서다. `.js` 파일에는 엑셀 명세 'API_내부 함수' 시트의 함수를 **이름과 입력만 있는 빈 함수**로 넣어 둔다(아래 설명). JSON 파일에는 주석을 쓸 수 없으므로 `manifest.json`에는 담당 표시를 넣지 않는다 |
| `docs/` | `service-plan.md`, `spec.xlsx`, `file-structure.md`, `data-structure.txt`, `category-definitions.md`, `setup.md`와 이 문서 |
| `docs/design/` | 확정 시안의 코드(`App.tsx`)와 쓰는 법. 참고용이라 자동 검사와 CodeRabbit이 보지 않는다 |
| `extension/data/categories.json` | 분류표. `docs/category-definitions.md`의 10번 표를 옮긴 것 (9개 카테고리, 주소 183개) |
| `tests/` | `sample-100.html`(샘플 100개), `answer-key-100.json`·`answer-key-100.md`(정답지), `README.md`. 나머지 샘플 세트는 이슈 #20에서 채운다 |

빈 함수를 넣어 두는 이유: 다른 파일이 `import { showForgotten } from "./view/forgottenFolder.js"`라고 썼는데 그 파일에 아직 `showForgotten`이 없으면, 그 파일 하나가 아니라 **새 탭 전체가 빈 화면이 된다.** 처음부터 이름을 넣어 두면 각자 자기 함수의 안쪽만 채우면 되고, `main`이 깨지지 않는다.

```js
// 담당: 팀원 B · 이슈 #8 · 명세: N25, N26 (F04)
export function lastOpened(bookmark, stored) { return { time: 0, source: "added" }; }
export function pickForgotten(bookmarks, stored, now) { return []; }
```

돌려주는 값은 명세의 출력 형태에 맞는 빈 값(빈 배열, `null` 등)으로 둔다.

### GitHub 설정

| 위치 | 설정 |
|---|---|
| Settings → Collaborators | 팀원 세 명 초대 (저장소 주인을 뺀 나머지) |
| Settings → General → Pull Requests | "Allow squash merging"만 켠다. "Automatically delete head branches"를 켠다 |
| Settings → Rules → Rulesets | `main`에 "Require a pull request before merging"(승인 1명, "Dismiss stale pull request approvals when new commits are pushed" 켬)과 "Block force pushes"를 켠다. 첫 커밋 뒤 자동 검사가 한 번 돈 다음에는 "Require status checks to pass"에 `check`를 추가한다 |
| 이슈 | 등록해 두었다(10월 7일). #1~#19 = 파일 19개, #20~#21 = 준비 작업, #22~#24 = 요구사항 확인 목록(P1·P2·P3). 라벨은 담당(A~D)과 우선순위(P1~P3) |

### CodeRabbit 설치

저장소 주인(팀원 A)이 한 번만 한다. 다른 팀원은 설치할 것이 없다.

1. `.coderabbit.yaml`(부록 3)을 첫 커밋에 넣는다.
2. https://app.coderabbit.ai 에 GitHub 계정으로 로그인한다.
3. CodeRabbit GitHub 앱을 설치할 때 "Only select repositories"에서 이 저장소만 고른다.
4. 시험용 PR을 하나 올리고 `@coderabbitai review`라고 댓글을 달아, 한국어 리뷰가 달리는지 확인한다. 댓글에 "configuration file has a parsing error"가 보이면 `.coderabbit.yaml`의 들여쓰기가 틀린 것이다.

설정을 바꿀 때는 CodeRabbit 웹 화면이 아니라 `.coderabbit.yaml`을 PR로 고친다. 그래야 무엇이 바뀌었는지 팀이 볼 수 있다.

### 공개 저장소로 한다

`aix_BaroLink_bookmark`는 공개 저장소로 만든다(10월 7일 확정). `main` 보호 설정과 CodeRabbit 리뷰를 무료로 쓰려면 공개여야 하기 때문이다. 나중에 비공개로 바꾸면 둘 다 멈춘다.

| | 공개 저장소 | 비공개 저장소 (무료 요금제) |
|---|---|---|
| `main` 보호 설정 | 동작한다 | 동작하지 않는다. 0번의 규칙 1을 약속으로 지킨다 |
| CodeRabbit PR 리뷰 | 무료 | 처음 14일 체험 뒤에는 PR 요약만 나온다. 리뷰는 유료 |

공개로 하면 저장소의 모든 파일을 누구나 볼 수 있고, 한 번 올린 것은 지워도 기록에 남는다. 첫 커밋을 올리기 전에 아래를 확인한다.

- 아래 "올리지 않는 것"이 들어 있지 않은가
- 문서에 적힌 Figma와 와이어프레임 링크가 공개돼도 되는가 (10월 7일 확인: 편집은 권한 있는 계정만 할 수 있어 그대로 둔다)
- README의 담당 표에는 GitHub 아이디만 쓴다 (실제 이름은 쓰지 않는다)

### 올리지 않는 것

- 설문 원본(응답 엑셀). 문서에는 집계 숫자만 싣는다. 저장소 폴더 밖에 두는 것이 기본이다.
- 강의 자료(수업 PDF). 우리가 만든 것이 아니므로 공개 저장소에 올릴 수 없다.
- 본인이 평소 쓰는 크롬에서 내보낸 실제 북마크. `tests/`에는 만들어 낸 샘플만 둔다.
- 테스트용 크롬 프로필 폴더
- 크롬의 "확장 프로그램 압축"이 만드는 `.crx`와 `.pem`(개인 키)

올리면 안 되는 파일을 저장소 폴더 안에 둬야 하면 `private/` 폴더에 둔다. `.gitignore`에 들어 있다.

---

## 11. 막혔을 때

| 상황 | 하는 일 |
|---|---|
| `main`에서 작업하고 커밋해 버렸다 (아직 올리기 전) | `git switch -c feat/F04-forgotten`으로 브랜치를 만들면 커밋이 따라온다. 그 뒤 `git switch main` → `git reset --hard origin/main`으로 `main`을 되돌리고, 다시 내 브랜치로 돌아온다 |
| `main`에 올리려는데 거절된다 | 정상이다. 브랜치에서 올리고 PR을 만든다 |
| 이슈 화면에서 만든 브랜치가 내 PC에 안 보인다 | `git fetch origin` 뒤에 `git switch 브랜치이름`. 이름은 3번 표에서 복사한다 |
| 브랜치 이름을 잘못 지었다 (아직 커밋 전) | GitHub의 브랜치 목록에서 지우고, 이슈 화면에서 3번 표의 이름으로 다시 만든다 |
| 이슈 브랜치가 오래돼 PR에서 충돌이 많다 | 며칠에 한 번 `git pull origin main`을 하지 않은 것이다. 지금 받아 합치고, 남의 파일 충돌은 그 담당과 같이 본다 |
| `git pull origin main`이 "Need to specify how to reconcile divergent branches"라며 멈춘다 | `git config --global pull.rebase false`를 한 번 실행하고 다시 받는다 (`docs/setup.md` 2번) |
| `git pull origin main`에서 충돌이 났다 | 내 파일이면 직접 고친다. 남의 파일이면 혼자 고치지 말고 그 파일의 담당과 같이 본다 |
| 엑셀 명세에서 충돌이 났다 | 합칠 수 없다. `main`의 파일을 받고 내 변경을 다시 넣는다. 그래서 8번처럼 한 번에 한 사람만 고친다 |
| 자동 검사(`check`)가 빨간색이다 | PR의 "Details"를 눌러 걸린 줄을 본다. 메시지별 뜻은 `docs/setup.md` 11번 |
| CodeRabbit이 리뷰를 달지 않는다 | PR에 `@coderabbitai review`라고 댓글을 단다. 횟수 제한에 걸렸으면 한 시간쯤 뒤에 다시 부른다. 급하면 사람의 확인을 먼저 받아도 되지만, 그 뒤에 코드를 고치면 다시 확인받는다 |
| 무엇을 올렸는지 모르겠다 | `git status`와 GitHub의 PR 화면 "Files changed"를 본다 |

---

## 부록 1. `.gitignore`

```gitignore
# 운영체제가 만드는 파일
.DS_Store
Thumbs.db
desktop.ini

# 편집기 설정 (팀이 함께 쓰는 .vscode/settings.json만 올린다)
.vscode/*
!.vscode/settings.json
.idea/

# 엑셀을 열어 둔 동안 생기는 임시 파일
~$*

# 크롬의 "확장 프로그램 압축"이 만드는 파일 (.pem은 개인 키)
*.pem
*.crx
*.zip

# 테스트용 크롬 프로필을 저장소 안에 뒀을 때
chrome-profile/

# 올리면 안 되는 파일: 설문 원본, 실제 북마크
*설문응답*
private/
```

## 부록 2. `.gitattributes`

```gitattributes
* text=auto eol=lf
*.xlsx binary
*.png binary
*.pdf binary
```

## 부록 3. `.coderabbit.yaml`

```yaml
# yaml-language-server: $schema=https://coderabbit.ai/integrations/schema.v2.json
language: "ko-KR"
reviews:
  profile: "chill"                  # 사소한 지적을 줄인다
  path_filters:
    - "!docs/design/**"             # 확정 시안의 참고용 사본(React 코드)은 리뷰하지 않는다
  request_changes_workflow: false   # CodeRabbit이 승인하거나 막지 않는다. 승인은 사람만 한다
  poem: false
  auto_review:
    enabled: true
    drafts: false
  path_instructions:
    - path: "extension/**"
      instructions: |
        빌드 도구 없이 크롬에 그대로 올리는 Manifest V3 확장 프로그램이다 (크롬 134 이상, ES 모듈).
        - 북마크의 제목과 주소를 확장 프로그램 밖으로 보내는 코드(fetch, 외부 주소)가 있으면 알려 준다.
        - CDN이나 외부 스크립트, HTML 안에 직접 쓴 스크립트, onclick 속성, eval이 있으면 알려 준다.
        - 북마크의 제목이나 주소를 innerHTML에 그대로 넣으면 알려 준다.
        - chrome.storage는 js/store.js에서만 부른다. 다른 파일이 직접 부르면 알려 준다. 예외는 render.js가 chrome.storage.onChanged 알림을 받는 것뿐이다.
        - React, JSX, Tailwind 클래스, 빌드 도구를 쓰지 않는다. 보이면 알려 준다.
        - 색과 크기는 newtab.css 맨 위의 공통 값(CSS 변수)을 쓴다. 다른 곳에 색 코드를 직접 쓰면 알려 준다.
        - 따옴표, 세미콜론, 이름 짓기 같은 코드 모양에 대한 의견은 남기지 않는다.
    - path: "extension/js/{classify,plan,forgotten,topic}.js"
      instructions: |
        계산만 하는 파일이다. chrome API를 부르거나 파일을 읽지 않고, 필요한 값(현재 시각 포함)을 모두 입력으로 받아야 한다.
    - path: "extension/js/view/**"
      instructions: |
        화면 파일끼리는 서로 import하지 않는다. 공통 화면 조각(js/ui.js)만은 불러 써도 된다.
        다른 화면 파일의 동작이 필요하면 render.js가 넘겨 준 actions(openFolder, showResultNotice, showContextMenu)를 쓴다.
        각 파일은 newtab.html의 자기 칸 안만 그린다 (docs/file-structure.md 12번).
        앱 아이콘, 짧은 안내 문구, 선 아이콘을 ui.js를 쓰지 않고 따로 만들면 알려 준다.
        팝업은 <dialog> 요소와 newtab.css의 공통 모양으로 만든다.
        크롬을 직접 부르지 않고 bookmarks.js와 store.js를 거친다.
        예외는 cards.js의 권한 요청과 topSites뿐이다.
    - path: "extension/background.js"
      instructions: |
        서비스 워커다. 알림 리스너는 파일 맨 위에서 바로 등록하고, 상태는 변수가 아니라 저장소에 기록한다.
        저장 항목은 newBookmarks와 manualMoves만 쓴다.
    - path: "extension/js/organize.js"
      instructions: |
        다음은 실제 크롬에서 확인한 의도된 동작이므로 고치라고 하지 않는다.
        - pendingMoves는 옮긴 뒤에 지우지 않는다 (1분 뒤 만료).
        - 원래 순서는 첫 북마크를 옮기기 전에 한꺼번에 읽는다.
        - 되돌릴 때는 순서 번호가 아니라 원래 앞에 있던 북마크의 뒤에 놓는다.
        setPending의 저장이 끝나기 전에(await 없이) 옮기기 시작하면 알려 준다.
```
