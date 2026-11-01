# 콘솔 함수 검증 매뉴얼

> 새 탭의 개발자 도구 콘솔에서 우리 함수를 직접 불러, 실제 크롬 북마크와 저장 항목으로 돌린 결과가 명세와 맞는지 사람이 확인하는 문서다.
> 근거: `docs/spec.xlsx` v16 ('기능 명세', 'API_내부 함수', '참고_저장 항목' 시트), `tests/answer-key-100.json`, `tests/answer-key-100.md`
> 작성일: 2026-10-28 · 작성 기준 코드: `main` `309b583` (이때 `extension/`의 함수는 모두 이름과 입력만 있는 뼈대였다)
> 2026-10-30: `main` `049b9be`(`store.js`·`bookmarks.js` 구현, 명세 v16)에 맞춰 고쳤다. v16은 v15에서 N14 `setPending`의 입력(`{ id, toParentId }`)만 바뀌었다.
> 작성 직후, 뼈대 상태의 main 코드에 이 문서의 2장 코드와 3장 코드 조각 52개를 크롬에서 실행해 봤다. 문법 오류와 없는 함수를 부르는 오류는 없었다(판정 결과는 함수가 구현된 뒤에 의미가 있다). 처음 실행한 확인자는 오류가 난 항목을 PR 댓글이나 Issue로 남긴다.

작성 시점에는 명세의 함수가 모두 뼈대(이름과 입력만 있고 빈 값을 돌려줌)였다. 그래서 3장의 항목은 명세의 이름·입력·출력으로 썼고, 항목마다 맨 위에 구현 상태를 적었다. **각 함수를 구현하는 기능 PR에서 그 함수의 항목으로 확인한다.** 구현된 코드가 항목의 코드와 맞지 않으면(인자 형태 등) 명세를 먼저 확인하고, 명세가 맞으면 코드를, 명세에 없던 것이면 명세와 이 문서를 고친다.

이 문서는 자동 검사(`check`)를 대신하지 않는다. 자동 검사는 함수가 **있는지** 보고, 이 문서는 함수가 **명세대로 동작하는지** 사람이 본다. 요구사항 확인 목록(#22~#24)을 체크하기 전에, 그 요구사항을 받치는 함수가 이 문서의 항목을 통과했는지 먼저 본다.

기대 결과는 모두 명세 문장에서 가져왔다. 코드를 돌려서 나온 값을 정답으로 적지 않았다. 명세로 정할 수 없는 값은 "기록만 한다"로 적었고, 콘솔에 `📝 기록`으로 출력된다.

---

## 1장. 준비

### 1-1. 테스트용 크롬 프로필

- **평소 쓰는 크롬 프로필에서는 하지 않는다.** 이 문서의 함수는 크롬 북마크를 실제로 만들고, 옮기고, 지운다.
- 크롬 오른쪽 위의 프로필 아이콘 → **추가** → "계정 없이 계속"으로 새 프로필을 만든다. 로그인하지 않는다(로그인하면 북마크가 계정에 동기화된다).
- 확인이 끝나면 프로필을 통째로 지워도 된다. 지우는 것이 가장 깨끗하게 되돌리는 방법이다.

### 1-2. 확장 프로그램 올리기

1. 테스트용 프로필에서 `chrome://extensions`를 연다.
2. 오른쪽 위 **개발자 모드**를 켠다.
3. **압축해제된 확장 프로그램을 로드합니다** → 저장소의 `extension/` 폴더를 고른다.
4. 새 탭을 열었을 때 "새 탭 페이지가 변경됨" 안내가 나오면 **유지**를 누른다.
5. 코드를 새로 받았으면(`git pull`) 확장 프로그램 카드의 새로고침 버튼을 누른 뒤 새 탭을 다시 연다.

### 1-3. 샘플 북마크 세트 가져오기

- 쓰는 파일: `tests/sample-100.html` (만들어 낸 샘플 100개). 정답지는 `tests/answer-key-100.json`, 사람이 읽는 표는 `tests/answer-key-100.md`다.
- **북마크가 하나도 없는 새 프로필**에서 가져온다. 북마크 관리자(`Ctrl+Shift+O`) → 오른쪽 위 점 3개 → **북마크 가져오기** → `sample-100.html`.
- 가져오면 북마크바에 74개와 폴더 2개(`졸업프로젝트`, `알바·취준`)가 들어가고, 나머지 16개와 `자취템` 폴더는 북마크바 맨 끝의 "가져온 북마크" 폴더에 들어간다(`tests/README.md`, `answer-key-100.md` 4번). 이 문서의 기대 결과는 이 상태를 기준으로 한다. "가져온 북마크"를 직접 꺼내지 않는다.
- 북마크가 이미 있는 프로필에 가져오면 100개가 모두 "가져온 북마크" 하나에 묶여 기대 결과와 달라진다.
- 나머지 샘플 세트(10개 미만 · 서로 다른 20개 · 30개)는 아직 없다(이슈 #20). 개수 경계는 3장에서 가짜 입력으로 확인한다.

### 1-4. 새 탭 콘솔 열기

1. 새 탭(`Ctrl+T`)을 연다. 주소가 `chrome-extension://<ID>/newtab.html`인 확장 프로그램 페이지다.
2. `F12` → **Console** 탭.
3. 처음 붙여 넣을 때 크롬이 붙여 넣기를 막고 경고를 띄운다. 콘솔에 `allow pasting`을 직접 입력하고 Enter를 누른 뒤 다시 붙여 넣는다.
4. 새 탭 콘솔에서 `await import('/js/plan.js')`처럼 모듈을 불러오면, 화면이 이미 불러온 모듈과 **같은 인스턴스**가 돌아온다. 콘솔에서 저장 항목을 바꾸면 화면도 같은 값을 본다.

### 1-5. 서비스 워커 콘솔

- `chrome://extensions` → 바로링크 카드의 **서비스 워커** 링크를 누르면 서비스 워커의 개발자 도구가 열린다. 링크가 "비활성"이면 워커가 쉬고 있는 것이다. 북마크를 하나 만들면 다시 켜진다.
- **이 콘솔에서는 `import()`가 막혀 있다.** "import() is disallowed on ServiceWorkerGlobalScope" 오류가 난다. 그래서 `background.js`의 처리(N32~N34)는 함수를 직접 부르지 않는다. 새 탭 콘솔에서 북마크를 만들고·옮기고·지운 뒤 저장 항목을 본다(3장 C-N32~C-N34).
- 서비스 워커 콘솔에서는 `await chrome.storage.local.get()`으로 저장 항목을 읽을 수 있고, `background.js`가 낸 오류를 볼 수 있다.
- 워커를 일부러 멈추려면 `chrome://serviceworker-internals`를 열고, `chrome-extension://<ID>/`의 항목에서 **Stop**을 누른다.

### 1-6. 시작 전에 백업, 끝난 뒤 되살리기

**북마크 백업.** 북마크 관리자 → 점 3개 → **북마크 내보내기** → HTML 파일로 저장한다. 저장한 파일은 저장소 밖에 둔다.

**저장 항목 백업.** 새 탭 콘솔에 붙여 넣으면 저장 항목 전체가 클립보드에 복사된다. 메모장에 붙여 두면 된다.

```js
copy(JSON.stringify(await chrome.storage.local.get(null)));
```

**되살리기.**

1. 가장 쉬운 방법은 테스트용 프로필을 지우고 1-1부터 다시 하는 것이다.
2. 프로필을 그대로 쓰려면 북마크 관리자에서 북마크바와 기타 북마크의 항목을 모두 지운다(왼쪽에서 폴더 선택 → 오른쪽 목록 클릭 → `Ctrl+A` → `Delete`). 그다음 백업한 HTML을 **북마크 가져오기**로 넣는다. 북마크바가 비어 있어야 원래 자리로 들어간다.
3. 다시 가져오면 북마크 ID가 모두 바뀐다. 예전 ID가 남은 저장 항목은 맞지 않으므로 새 탭 콘솔에서 지우고 새로 시작한다.
   ```js
   await chrome.storage.local.clear();
   ```
   저장해 둔 값으로 되돌리려면 `await chrome.storage.local.set(<복사해 둔 JSON>)`을 쓴다(ID가 바뀌지 않았을 때만).
4. 3장의 ⚠ 항목이 만든 것은 모두 제목이 `[검증]`으로 시작한다. 2장의 `await T.cleanup()`이 이것만 골라 지운다.

### 1-7. 언제 쓰나

- 작성 시점(`main` `309b583`)에는 명세의 함수가 모두 뼈대였다. 3장 항목은 명세의 이름·입력·출력으로 썼고, 항목마다 "구현 상태"를 적었다.
- **뼈대인 함수의 항목은 그 함수를 구현하는 기능 PR에서 확인한다.** PR을 확인하는 사람(conventions 6번 표)이 그 PR의 브랜치를 받아 이 문서의 해당 항목을 붙여 넣고, 결과를 PR 댓글과 5장 결과표에 남긴다.
- 함수를 구현한 사람은 그 항목의 "구현 상태"를 "구현됨"으로 바꾸고, 코드와 대조한 뒤 "명세 기준으로 작성, 코드와 대조하지 못함" 문구를 지운다.

---

## 2장. 공통 준비 코드

새 탭 콘솔에 **한 번** 붙여 넣는다. 우리 모듈을 모두 불러 `window.T`에 묶고, 확인용 도구 함수를 만든다. **새 탭을 새로고침하거나 새 탭을 새로 열면 `window.T`가 사라지므로 다시 붙여 넣는다.**

불러오는 모듈과 빼는 모듈

- 불러오는 것: `js/` 아래의 모든 `.js`와 `js/view/` 아래의 모든 `.js`. 화면의 시작점인 `render.js`가 이 모듈들을 불러 쓰는 구조다(`docs/file-structure.md` 4번). 작성 기준 코드에는 모듈 맨 위에서 바로 실행되는 코드(화면 그리기, 이벤트 걸기)가 있는 파일이 없다.
- **빼는 것: `background.js`.** 파일 맨 위에서 `chrome.bookmarks.onCreated` 같은 알림 리스너를 바로 등록한다. 새 탭에서 불러오면 새 탭에도 리스너가 하나 더 생겨, 북마크를 만들 때마다 새 탭이 `newBookmarks`·`manualMoves`를 함께 쓰게 된다. "한 키는 한쪽만 쓴다"는 규칙('참고_저장 항목' 시트)이 깨지고, C-N32~C-N34의 결과도 믿을 수 없게 된다.
- 나중에 어떤 모듈에 맨 위에서 바로 실행되는 코드(`renderAll()` 호출, `addEventListener` 등)가 생기면, 그 모듈은 이 목록에서 빼고 이 절에 이유를 적는다. `render.js`가 화면을 그리기 시작하는 코드를 맨 위에 두더라도, 새 탭이 이미 그 모듈을 불러온 뒤라 같은 인스턴스가 돌아오므로 다시 실행되지 않는다.

```js
// 2장 공통 준비 코드: 새 탭 콘솔에 한 번 붙여 넣는다
await (async () => {
  const T = (window.T = { results: [], current: "" });

  // 우리 모듈 (background.js는 뺀다. 이유는 2장 본문)
  for (const n of ["bookmarks", "store", "organize", "classify", "forgotten", "plan", "topic", "search", "ui", "render", "dnd"]) {
    T[n] = await import(`/js/${n}.js`);
  }
  T.cards = await import("/js/view/cards.js");
  T.folders = await import("/js/view/folders.js");
  T.forgottenFolder = await import("/js/view/forgottenFolder.js");
  T.history = await import("/js/view/history.js");

  T.day = 86400000;
  T.prefix = "[검증] ";
  T.wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // 객체는 키를 이름순으로 맞춘 뒤 비교한다(chrome.storage는 키를 가나다순으로 돌려준다). 배열은 순서까지 본다
  const sortKeys = (v) => (Array.isArray(v) ? v.map(sortKeys) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v);
  T.same = (a, b) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
  T.near = (t, now = Date.now(), ms = 10000) => typeof t === "number" && Math.abs(t - now) <= ms;
  T.throws = async (fn) => { try { await fn(); return false; } catch (e) { return true; } };
  T.url = (s) => { try { return new URL(s); } catch (e) { return null; } };

  // categories.json을 함수가 받는 형태 그대로 돌려준다: { categories: [...], noCategorySites: [...] } (명세 N17)
  T.cats = async () => (await fetch("/data/categories.json")).json();
  // 우리 함수의 북마크 목록 (loadTree 결과)
  T.tree = () => T.bookmarks.loadTree();
  // 저장 항목 전체. store.js를 거치지 않고 chrome.storage.local을 그대로 읽는다 (실제로 저장된 값)
  T.stored = () => chrome.storage.local.get(null);
  T.saveStore = async () => structuredClone(await chrome.storage.local.get(null));
  T.restoreStore = async (saved) => { await chrome.storage.local.clear(); await chrome.storage.local.set(saved); };
  // 명세 '참고_저장 항목'의 기본값 9개 (계산 함수에 넣을 가짜 저장 항목)
  T.emptyStored = () => ({ pinned: [], lastOpenedByUs: {}, dismissed: {}, manualMoves: {}, newBookmarks: [], handledNew: [], pendingMoves: {}, history: [], state: { firstCard: "pending" } });

  // 크롬 북마크를 우리 함수 없이 직접 읽는 도구 (비교 기준용). 최상위 폴더는 folderType으로 고른다 (F01-04)
  T.rawRoots = async () => {
    const [root] = await chrome.bookmarks.getTree();
    const pick = (t) => { const a = root.children.filter((n) => n.folderType === t); return a.find((n) => n.syncing) || a[0] || null; };
    return { root, bar: pick("bookmarks-bar"), other: pick("other"), mobile: pick("mobile") };
  };
  T.bar = async () => (await T.rawRoots()).bar;
  T.kids = (id) => chrome.bookmarks.getChildren(id);
  T.exists = async (id) => { try { await chrome.bookmarks.get(id); return true; } catch (e) { return false; } };
  // 모든 북마크(주소가 있는 것)를 path(들어 있는 폴더 경로)와 함께 평평하게
  T.flat = async () => {
    const out = [];
    const [root] = await chrome.bookmarks.getTree();
    (function walk(n, path) {
      for (const c of n.children || []) {
        if (c.url) out.push({ ...c, path: path.join("/") });
        else walk(c, [...path, c.title]);
      }
    })(root, []);
    return out;
  };
  T.findTitle = async (title) => (await T.flat()).find((b) => b.title === title);
  T.findFolder = async (title) => {
    const [root] = await chrome.bookmarks.getTree();
    let hit = null;
    (function walk(n) { for (const c of n.children || []) { if (!c.url && c.title === title && !hit) hit = c; if (!c.url) walk(c); } })(root);
    return hit;
  };

  // 폴더별 제목 순서를 문자열로 (되돌리기 비교용). 폴더는 [이름]으로 표시한다
  T.snap = async (id) => {
    const lines = [];
    const top = id ? (await chrome.bookmarks.getSubTree(id))[0] : (await chrome.bookmarks.getTree())[0];
    (function walk(n, path) {
      const kids = n.children || [];
      lines.push(`${path || "(루트)"}: ${kids.map((k) => (k.url ? k.title : `[${k.title}]`)).join(" | ")}`);
      for (const k of kids) if (!k.url) walk(k, path ? `${path}/${k.title}` : k.title);
    })(top, id ? top.title : "");
    return lines.join("\n");
  };
  T.diff = (a, b) => {
    const x = a.split("\n"), y = b.split("\n");
    const out = [...x.filter((l) => !y.includes(l)).map((l) => "- " + l), ...y.filter((l) => !x.includes(l)).map((l) => "+ " + l)];
    console.log(out.length ? out.join("\n") : "(차이 없음)");
    return out;
  };

  // ⚠ 항목이 쓰는 임시 북마크·폴더. 제목이 모두 [검증]으로 시작한다
  T.mk = async (title, url, parentId) =>
    chrome.bookmarks.create({ parentId: parentId ?? (await T.bar()).id, title: T.prefix + title, url: url ?? `https://example.com/${encodeURIComponent(title)}` });
  T.mkFolder = async (title, parentId) => chrome.bookmarks.create({ parentId: parentId ?? (await T.bar()).id, title: T.prefix + title });
  // [검증]으로 시작하는 것만 지운다. 폴더는 안의 것이 모두 [검증]일 때만 통째로 지운다
  T.cleanup = async () => {
    const [root] = await chrome.bookmarks.getTree();
    const tops = [];
    (function walk(n) { for (const c of n.children || []) { if (c.title.startsWith(T.prefix)) tops.push(c); else if (!c.url) walk(c); } })(root);
    const allTest = (n) => (n.children || []).every((c) => c.title.startsWith(T.prefix) && allTest(c));
    let removed = 0;
    for (const n of tops) {
      if (n.url) { await chrome.bookmarks.remove(n.id); removed++; }
      else if (allTest(n)) { await chrome.bookmarks.removeTree(n.id); removed++; }
      else console.warn("[검증] 폴더 안에 샘플 북마크가 있어 지우지 않았다. 북마크 관리자에서 직접 정리한다:", n.title);
    }
    console.log(`[검증] 항목 ${removed}개를 지웠다`);
    return removed;
  };

  // 계산 함수에 넣을 가짜 북마크
  T.fakeBm = (id, title, url, extra = {}) => ({ id: String(id), title, url, parentId: "1", index: 0, dateAdded: Date.now() - 400 * T.day, ...extra });
  // 분류표의 i번째 카테고리 첫 사이트로 만든 가짜 북마크 n개 (분류 단계: 분류표)
  T.ofCat = (cats, i, n, from = 0) =>
    Array.from({ length: n }, (_, k) => T.fakeBm(`c${i}-${from + k}`, `항목 ${i}-${from + k}`, `https://${cats.categories[i].sites[0]}/p${from + k}`));
  // 어느 단계에도 맞지 않는 가짜 북마크 n개
  T.unknown = (n, from = 0) => Array.from({ length: n }, (_, k) => T.fakeBm(`u${from + k}`, `zz ${from + k}`, `https://zz-unknown-${from + k}.example/`));

  // 판정 도구
  T.begin = (id) => { T.current = id; console.log(`%c── ${id}`, "font-weight:bold"); };
  T.expect = (name, ok, actual) => {
    T.results.push({ id: T.current, name, ok: !!ok });
    if (ok) console.log("✅ 통과", `${T.current} ${name}`);
    else console.log("❌ 실패", `${T.current} ${name}`, "실제값:", actual);
    return !!ok;
  };
  T.record = (name, value) => { T.results.push({ id: T.current, name, ok: null, value }); console.log("📝 기록", `${T.current} ${name}`, value); };
  T.summary = () => {
    const pass = T.results.filter((r) => r.ok === true).length;
    const fail = T.results.filter((r) => r.ok === false);
    console.log(`통과 ${pass} · 실패 ${fail.length} · 기록 ${T.results.filter((r) => r.ok === null).length}`);
    if (fail.length) console.log("실패한 것:\n" + fail.map((r) => `${r.id} ${r.name}`).join("\n"));
    return { pass, fail: fail.length, failed: fail.map((r) => `${r.id} ${r.name}`) };
  };

  console.log("T 준비 완료. 모듈:", Object.keys(T).filter((k) => typeof T[k] === "object" && T[k] && !Array.isArray(T[k])).join(", "));
})();
```

도구 함수 요약

| 함수 | 하는 일 |
|---|---|
| `T.cats()` | `categories.json` 전체(`{ categories, noCategorySites }`). `classify`, `makePlan` 등에 그대로 넣는다 |
| `T.tree()` | 우리 `loadTree()`의 결과 |
| `T.stored()` | `chrome.storage.local`에 실제로 저장된 값 전체 (`store.js`를 거치지 않음) |
| `T.saveStore()` / `T.restoreStore(saved)` | 저장 항목을 통째로 저장해 두었다가 되돌린다 |
| `T.snap(id?)` | 폴더별 제목 순서 문자열. `T.diff(전, 후)`로 바뀐 줄만 본다 |
| `T.same(a, b)` | 값이 같은지. 객체의 키 순서는 보지 않고, 배열의 순서는 본다 |
| `T.expect(이름, 조건, 실제값)` | `✅ 통과` / `❌ 실패 + 실제값`을 출력하고 센다 |
| `T.record(이름, 값)` | 명세로 정할 수 없는 값을 `📝 기록`으로 출력한다 |
| `T.summary()` | 지금까지의 통과·실패 개수와 실패한 이름 |
| `T.mk`, `T.mkFolder`, `T.cleanup()` | `[검증]` 임시 북마크·폴더 만들기, 모두 지우기 |
| `T.rawRoots()`, `T.flat()`, `T.kids(id)` | 우리 함수 없이 크롬 북마크를 직접 읽는다 (비교 기준) |
| `T.url(s)` | 주소가 아니면 null (오류 대신 ❌가 나오게) |

---

## 3장. 함수별 검증 항목

### 읽는 법

- 항목 이름은 `C-N번호`다(C는 콘솔). 'API_내부 함수' 시트의 N 번호 순서로 적었다. 예외가 많은 함수는 `-예외` 항목을 따로 두었다.
- **안전 등급**
  - 읽기만: 크롬 북마크와 저장 항목을 바꾸지 않는다.
  - 저장 항목을 바꿈: 코드가 처음에 저장 항목을 저장해 두고 끝에 되돌린다. 중간에 오류가 나도 `finally`에서 되돌린다(C-N43만 눈으로 본 뒤 손으로 되돌린다).
  - ⚠ 크롬 북마크를 바꿈: `[검증]`으로 시작하는 임시 북마크만 만들고 옮긴다. 코드 앞에서 `T.snap()`을 찍어 두고, 끝나면 "되돌리는 법"대로 정리한다.
  - 화면: 칸에 그린 결과를 눈으로 본다.
- 코드는 그대로 붙여 넣으면 돌아가게 썼다. 마지막에 `T.summary()`로 결과를 본다.
- 순서대로 다 할 때는 읽기만 → 저장 항목 → ⚠ 순서로 하면 되돌릴 일이 적다. 항목마다 사전 조건을 따로 적었으므로 하나만 해도 된다.
- **작성 기준 코드(`main` `309b583`)에서는 모든 함수가 빈 값만 돌려주므로 대부분 ❌가 나온다.** 함수를 구현한 PR을 확인할 때 이 항목을 쓴다(1-7).
- 함수의 입력 중 명세에 형태가 정해지지 않은 것은, 명세의 다른 곳에 있는 이름을 따라 넣었다. 4장 4-3에 모아 두었다. 구현이 다른 형태를 쓰면 명세를 먼저 정한 뒤 이 문서를 고친다.

---

#### C-N01 loadTree: 크롬 북마크 전체 읽기 · P1
- 구현 상태: 구현됨 (main `049b9be`)
- 파일·담당: bookmarks.js · 팀원 A
- 관련 요구사항: F01-01, F01-04
- 안전 등급: 읽기만
- 사전 조건: `sample-100.html`을 가져온 프로필, 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N01
  await (async () => {
    T.begin("C-N01");
    const tree = await T.tree();
    const raw = await T.rawRoots();
    const flat = await T.flat();
    T.expect("출력에 roots, bookmarks, folders가 있다", tree && tree.roots && Array.isArray(tree.bookmarks) && Array.isArray(tree.folders), tree);
    T.expect("F01-01 북마크 개수가 크롬 북마크 관리자의 개수와 같다", tree?.bookmarks?.length === flat.length, { ours: tree?.bookmarks?.length, chrome: flat.length });
    T.expect("F01-04 roots.bar는 folderType이 bookmarks-bar인 폴더다", tree?.roots?.bar?.id === raw.bar?.id, tree?.roots?.bar);
    T.expect("F01-04 roots.other는 folderType이 other인 폴더다", tree?.roots?.other?.id === raw.other?.id, tree?.roots?.other);
    T.expect("모바일 북마크 폴더가 없으면 roots.mobile은 null, 있으면 그 폴더", raw.mobile ? tree?.roots?.mobile?.id === raw.mobile.id : tree?.roots?.mobile === null, { ours: tree?.roots?.mobile, chrome: raw.mobile });
    const ids = new Set(flat.map((b) => b.id));
    T.expect("bookmarks의 ID가 모두 크롬에 있는 북마크다", (tree?.bookmarks ?? []).length > 0 && tree.bookmarks.every((b) => ids.has(b.id)), tree?.bookmarks?.slice(0, 3));
    T.expect("bookmarks에 폴더가 섞여 있지 않다(모두 url이 있다)", (tree?.bookmarks ?? []).length > 0 && tree.bookmarks.every((b) => !!b.url), tree?.bookmarks?.filter((b) => !b.url));
    for (const name of ["졸업프로젝트", "알바·취준", "자취템", "가져온 북마크"]) {
      T.expect(`folders에 "${name}"가 있다`, (tree?.folders ?? []).some((f) => f.title === name), tree?.folders?.map((f) => f.title));
    }
    T.record("북마크 한 개에 붙은 필드 (들어 있는 폴더와 최상위 폴더 종류를 붙였는지 본다)", tree?.bookmarks?.[0] && Object.keys(tree.bookmarks[0]));
    T.record("folders에 북마크바·기타 북마크 자체가 들어 있는지", tree?.folders?.filter((f) => f.folderType).map((f) => f.title));
  })();
  ```
- 기대 결과:
  - 북마크 개수가 크롬 북마크 관리자의 개수와 같다(`sample-100`이면 100). (F01-01)
  - `roots.bar`·`roots.other`는 `folderType`으로 고른 폴더이고, 모바일 북마크 폴더가 없으면 `roots.mobile`은 `null`이다. (F01-04, N01)
  - 각 북마크에 들어 있는 폴더와 최상위 폴더 종류가 붙어 있다. 필드 이름은 명세에 없으므로 기록만 한다. (N01)
  - 기타 북마크가 두 개(계정용·이 PC 전용)일 때 `syncing`이 true인 쪽을 고르는지는 테스트용 프로필에서 만들 수 없어 확인하지 않는다.
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N02 createFolder: 폴더 만들기 · P1
- 구현 상태: 구현됨 (main `049b9be`)
- 파일·담당: bookmarks.js · 팀원 A
- 관련 요구사항: F07-08, F03-04
- 안전 등급: ⚠ 크롬 북마크를 바꿈
- 사전 조건: 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N02
  await (async () => {
    T.begin("C-N02");
    T.before = await T.snap();
    const bar = await T.bar();
    const name = T.prefix + "폴더A";
    const a = await T.bookmarks.createFolder(name, bar.id);
    const b = await T.bookmarks.createFolder(name, bar.id);
    const same = (await T.kids(bar.id)).filter((n) => n.title === name);
    T.expect("폴더 노드를 돌려준다(url이 없다)", a && a.id && !a.url, a);
    T.expect("F07-08 같은 이름으로 두 번 불러도 폴더는 하나다", same.length === 1, same);
    T.expect("두 번째 호출은 이미 있는 폴더를 돌려준다", a?.id && a.id === b?.id, { a, b });
    T.expect("새 폴더가 상위 폴더 안에 있다", same[0]?.parentId === bar.id, same[0]);
    T.expect("이름이 비어 있으면 오류를 던진다", await T.throws(() => T.bookmarks.createFolder("", bar.id)));
    T.record("이름이 공백뿐일 때(F03-07은 화면에서 막는다)", await T.throws(() => T.bookmarks.createFolder("   ", bar.id)) ? "오류" : "오류 없음");
  })();
  ```
- 기대 결과:
  - 같은 이름의 폴더가 상위 폴더 안에 있으면 그 폴더를 돌려주고, 새로 만들지 않는다. (N02, F07-08)
  - 이름이 비어 있으면 오류를 던진다. (N02)
- 되돌리는 법: `await T.cleanup()` 뒤 `T.diff(T.before, await T.snap())`가 "(차이 없음)"이다.
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N03 moveBookmark: 북마크 하나 옮기기 · P1
- 구현 상태: 구현됨 (main `049b9be`)
- 파일·담당: bookmarks.js · 팀원 A
- 관련 요구사항: F07-01, F07-09
- 안전 등급: ⚠ 크롬 북마크를 바꿈
- 사전 조건: 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N03
  await (async () => {
    T.begin("C-N03");
    T.before = await T.snap();
    const f = await T.mkFolder("옮길 곳");
    const b1 = await T.mk("옮길 북마크1");
    const b2 = await T.mk("옮길 북마크2");
    const r = await T.bookmarks.moveBookmark(b1.id, f.id);
    const now1 = (await chrome.bookmarks.get(b1.id))[0];
    T.expect("옮겨진 노드를 돌려준다", r && r.id === b1.id && r.parentId === f.id, r);
    T.expect("크롬에서도 목적지 폴더에 있다", now1.parentId === f.id, now1);
    await T.bookmarks.moveBookmark(b2.id, f.id, 0);
    const order = (await T.kids(f.id)).map((n) => n.id);
    T.expect("index를 주면 그 자리에 놓인다 (0번)", order[0] === b2.id, order);
    let threw = false, gone;
    try { gone = await T.bookmarks.moveBookmark("999999999", f.id); } catch (e) { threw = true; }
    T.expect("F07-09 없는 북마크면 오류를 던지지 않고 null", !threw && gone === null, { threw, gone });
  })();
  ```
- 기대 결과: 옮겨진 노드를 돌려주고, 북마크가 없으면 오류 없이 `null`을 돌려준다. (N03)
- 되돌리는 법: `await T.cleanup()`
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N04 renameFolder: 폴더 이름 바꾸기 · P2
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: bookmarks.js · 팀원 A
- 관련 요구사항: F03-05, F03-07
- 안전 등급: ⚠ 크롬 북마크를 바꿈
- 사전 조건: 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N04
  await (async () => {
    T.begin("C-N04");
    T.before = await T.snap();
    const f = await T.mkFolder("이름 바꿀 폴더");
    const r = await T.bookmarks.renameFolder(f.id, T.prefix + "바뀐 이름");
    const now = (await chrome.bookmarks.get(f.id))[0];
    T.expect("F03-05 크롬 북마크 관리자에도 같은 이름", now.title === T.prefix + "바뀐 이름", now);
    T.expect("바뀐 노드를 돌려준다", r?.id === f.id && r?.title === T.prefix + "바뀐 이름", r);
    const bar = await T.bar();
    T.expect("folderType이 있는 폴더(북마크바)는 오류", await T.throws(() => T.bookmarks.renameFolder(bar.id, "바꾸면 안 됨")));
    T.expect("(북마크바 이름이 그대로다)", (await chrome.bookmarks.get(bar.id))[0].title === bar.title);
    T.expect("빈 이름이면 오류", await T.throws(() => T.bookmarks.renameFolder(f.id, "")));
  })();
  ```
- 기대 결과: 크롬 폴더 이름이 바뀌고, `folderType`이 있는 폴더나 빈 이름이면 오류를 던진다. (N04, F03-05)
- 되돌리는 법: `await T.cleanup()`
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N05 deleteFolderKeepChildren: 폴더만 지우고 안의 북마크는 꺼내기 · P2
- 구현 상태: 구현됨 (main `049b9be`)
- 파일·담당: bookmarks.js · 팀원 A
- 관련 요구사항: F03-06, F07-05
- 안전 등급: ⚠ 크롬 북마크를 바꿈
- 사전 조건: 2장 실행. `manualMoves` 확인은 서비스 워커(N33)가 구현돼 있어야 의미가 있다.
- 붙여 넣을 코드:
  ```js
  // C-N05
  await (async () => {
    T.begin("C-N05");
    T.before = await T.snap();
    const bar = await T.bar();
    const f = await T.mkFolder("지울 폴더");
    const c0 = await T.mk("꺼낼 북마크0", undefined, f.id);
    const c1 = await T.mk("꺼낼 북마크1", undefined, f.id);
    await T.wait(1500);
    const n = await T.bookmarks.deleteFolderKeepChildren(f.id);
    T.expect("꺼낸 북마크 수 2를 돌려준다", n === 2, n);
    T.expect("F03-06 폴더는 사라졌다", !(await T.exists(f.id)));
    const p0 = (await T.exists(c0.id)) && (await chrome.bookmarks.get(c0.id))[0];
    const p1 = (await T.exists(c1.id)) && (await chrome.bookmarks.get(c1.id))[0];
    T.expect("F03-06 안의 북마크는 상위 폴더(북마크바)로 나왔다", p0?.parentId === bar.id && p1?.parentId === bar.id, { p0, p1 });
    const s = await T.stored();
    T.expect("꺼내기 전에 pendingMoves에 목적지(상위 폴더)를 저장했다", s.pendingMoves?.[c0.id]?.toParentId === bar.id && s.pendingMoves?.[c1.id]?.toParentId === bar.id, s.pendingMoves);
    await T.wait(2000);
    const mm = (await T.stored()).manualMoves || {};
    T.expect("F07-05 꺼내는 이동이 manualMoves에 기록되지 않았다", !(c0.id in mm) && !(c1.id in mm), mm);
    T.record("꺼낸 북마크의 순서 번호(명세에 위치가 정해져 있지 않다)", [p0?.index, p1?.index]);
  })();
  ```
- 기대 결과: 안의 북마크를 상위 폴더로 꺼내고 폴더만 지운다. 꺼내기 전에 `pendingMoves`에 저장하므로 직접 옮김으로 기록되지 않는다. (N05, F03-06)
- 되돌리는 법: `await T.cleanup()`
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N06 openBookmark: 북마크 열기 · P1
- 구현 상태: 구현됨 (main `049b9be`)
- 파일·담당: bookmarks.js · 팀원 A
- 관련 요구사항: F02-02, F02-04, F02-05, F15-03
- 안전 등급: ⚠ 크롬 북마크를 바꿈(임시 북마크) · 저장 항목을 바꿈 · 새 탭이 열린다
- 사전 조건: 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N06
  await (async () => {
    T.begin("C-N06");
    const saved = await T.saveStore();
    try {
      const web = await T.mk("열기 웹", "https://example.com/");
      const js = await T.mk("열기 북마클릿", "javascript:void(0)");
      const ch = await T.mk("열기 크롬 주소", "chrome://version/");
      const tabs0 = await chrome.tabs.query({});
      await T.bookmarks.openBookmark(web, { newTab: true });
      await T.wait(800);
      const tabs1 = await chrome.tabs.query({});
      T.expect("F15-03 newTab이면 새 탭이 하나 열린다", tabs1.length === tabs0.length + 1, tabs1.length - tabs0.length);
      const s = await T.stored();
      T.expect("F02-02 연 시각을 lastOpenedByUs에 기록했다", T.near(s.lastOpenedByUs?.[web.id]), s.lastOpenedByUs);
      const r = await T.bookmarks.openBookmark(js, { newTab: true });
      await T.wait(800);
      const tabs2 = await chrome.tabs.query({});
      T.expect("F02-05 javascript: 주소는 열지 않고 false", r === false && tabs2.length === tabs1.length, { r, opened: tabs2.length - tabs1.length });
      T.record("javascript: 북마크의 연 시각 기록 여부(명세에 없다)", (await T.stored()).lastOpenedByUs?.[js.id] ?? "기록 안 함");
      await T.bookmarks.openBookmark(ch, { newTab: true });
      await T.wait(800);
      const tabs3 = await chrome.tabs.query({});
      T.expect("F02-04 chrome:// 주소도 탭 API로 열린다", tabs3.length === tabs2.length + 1, tabs3.length - tabs2.length);
      const opened = tabs3.filter((t) => !tabs0.some((o) => o.id === t.id)).map((t) => t.id);
      if (opened.length) await chrome.tabs.remove(opened);
    } finally {
      await T.restoreStore(saved);
    }
  })();
  ```
- 기대 결과:
  - 연 시각을 `lastOpenedByUs`에 기록한 뒤 주소를 연다. `newTab: true`면 새 탭에서 연다. (N06, F02-02, F15-03)
  - `chrome://`·`file://` 주소는 탭 API로 연다. (F02-04)
  - `javascript:` 주소면 열지 않고 `false`를 돌려준다. (F02-05) "이 북마크는 새 탭에서 실행할 수 없어요" 문구는 화면 쪽 일이라 C-N30에서 본다.
- 손으로 확인: 새 탭 콘솔에서 `await T.bookmarks.openBookmark(await T.mk("현재 탭", "https://example.com/"))`를 실행하면 **지금 탭**이 example.com으로 바뀐다(콘솔도 함께 사라지는 것이 정상). 뒤로 가서 2장을 다시 붙여 넣는다.
- 되돌리는 법: 코드가 연 탭과 저장 항목은 되돌린다. 남은 임시 북마크는 `await T.cleanup()`.
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N07 faviconUrl / hasFavicon: 사이트 아이콘 주소 · P1
- 구현 상태: 구현됨 (main `049b9be`)
- 파일·담당: bookmarks.js · 팀원 A
- 관련 요구사항: F02-01, F02-03
- 안전 등급: 읽기만
- 사전 조건: 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N07
  await (async () => {
    T.begin("C-N07");
    const page = "https://www.youtube.com/watch?v=a";
    const u = T.bookmarks.faviconUrl(page, 32);
    T.expect("faviconUrl은 /_favicon/ 주소다", typeof u === "string" && u.startsWith(chrome.runtime.getURL("/_favicon/")), u);
    T.expect("pageUrl에 북마크 주소가 들어 있다", typeof u === "string" && T.url(u)?.searchParams.get("pageUrl") === page, u);
    T.expect("size=32", typeof u === "string" && T.url(u)?.searchParams.get("size") === "32", u);
    const none = await T.bookmarks.hasFavicon("https://no-favicon.invalid/");
    T.expect("hasFavicon: 파비콘이 없는 주소면 null (명세 v15)", none === null, none);
  })();
  ```
- 기대 결과:
  - `faviconUrl`은 `chrome.runtime.getURL("/_favicon/")` + `?pageUrl=…&size=…` 주소다. (C22, N07)
  - `hasFavicon`은 쓸 파비콘 주소 또는 `null`을 돌려준다. 방문한 적 없는 주소는 기본 그림이 오므로 `null`이다. (N07 v15)
- 손으로 확인: 테스트용 프로필에서 `https://www.google.com/`을 한 번 열어 둔 뒤 `await T.bookmarks.hasFavicon("https://www.google.com/")`이 `/_favicon/`으로 시작하는 주소를 돌려준다. 페이지 주소에 파비콘이 없으면 사이트 첫 페이지 주소로 한 번 더 찾는다(N07): `https://www.google.com/search?q=a`처럼 연 적 없는 하위 주소도 주소를 돌려준다.
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N08 load: 저장 항목 전체 읽기 · P1
- 구현 상태: 구현됨 (main `049b9be`)
- 파일·담당: store.js · 팀원 A
- 관련 요구사항: 전체 ('참고_저장 항목' 시트)
- 안전 등급: 저장 항목을 바꿈 (끝에 되돌림)
- 사전 조건: 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N08
  await (async () => {
    T.begin("C-N08");
    const saved = await T.saveStore();
    try {
      await chrome.storage.local.clear();
      const d = await T.store.load();
      const keys = ["pinned", "lastOpenedByUs", "dismissed", "manualMoves", "newBookmarks", "handledNew", "pendingMoves", "history", "state"];
      T.expect("저장 항목 9개가 모두 있다", d && keys.every((k) => k in d), d && Object.keys(d));
      T.expect("비어 있으면 기본값('참고_저장 항목'의 형태)", T.same(d, T.emptyStored()), d);
      T.expect("state 값이 없으면 firstCard는 pending", d?.state?.firstCard === "pending", d?.state);
      await chrome.storage.local.set({ pinned: ["검증-1"], state: { firstCard: "later" } });
      const d2 = await T.store.load();
      T.expect("저장된 값을 실제로 읽는다(pinned)", T.same(d2?.pinned, ["검증-1"]), d2?.pinned);
      T.expect("저장된 값을 실제로 읽는다(state)", d2?.state?.firstCard === "later", d2?.state);
      T.expect("없는 키는 기본값으로 채운다", T.same(d2?.history, []) && T.same(d2?.manualMoves, {}), d2);
    } finally {
      await T.restoreStore(saved);
    }
  })();
  ```
- 기대 결과: 저장 항목 9개를 한 번에 읽고, 없는 키는 '참고_저장 항목' 시트의 형태로 기본값을 채운다. `state`가 없으면 `firstCard`는 `"pending"`이다. (N08, C14)
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N09 update: 읽고 → 고치고 → 쓰기 · P1
- 구현 상태: 구현됨 (main `049b9be`)
- 파일·담당: store.js · 팀원 A
- 관련 요구사항: C15 (같은 쪽 안에서 순서대로 처리)
- 안전 등급: 저장 항목을 바꿈 (끝에 되돌림)
- 사전 조건: 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N09
  await (async () => {
    T.begin("C-N09");
    const saved = await T.saveStore();
    try {
      await chrome.storage.local.remove(["dismissed", "pinned"]);
      const r = await T.store.update("dismissed", (d) => ({ ...d, "검증-a": 1 }));
      T.expect("고친 값을 돌려준다", T.same(r, { "검증-a": 1 }), r);
      T.expect("고친 값이 저장됐다", T.same((await T.stored()).dismissed, { "검증-a": 1 }), (await T.stored()).dismissed);
      await Promise.all(Array.from({ length: 20 }, (_, i) => T.store.update("pinned", (p) => [...(p || []), "검증-" + i])));
      const p = (await T.stored()).pinned || [];
      T.expect("동시에 20번 불러도 하나도 사라지지 않는다(순서대로 처리)", p.length === 20, p.length);
    } finally {
      await T.restoreStore(saved);
    }
  })();
  ```
- 기대 결과: 읽고 → 고치고 → 쓰기를 한 번에 처리하고 고친 값을 돌려준다. 같은 키를 동시에 고쳐도 순서대로 처리돼 값이 사라지지 않는다. (N09)
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N10 recordOpened: 연 시각 기록 · P1
- 구현 상태: 구현됨 (main `049b9be`)
- 파일·담당: store.js · 팀원 A
- 관련 요구사항: F02-02, F04-03
- 안전 등급: 저장 항목을 바꿈 (끝에 되돌림)
- 사전 조건: 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N10
  await (async () => {
    T.begin("C-N10");
    const saved = await T.saveStore();
    try {
      await T.store.recordOpened("검증-1");
      const s = await T.stored();
      T.expect("lastOpenedByUs[ID]에 지금 시각(ms)", T.near(s.lastOpenedByUs?.["검증-1"]), s.lastOpenedByUs);
    } finally {
      await T.restoreStore(saved);
    }
  })();
  ```
- 기대 결과: `lastOpenedByUs`에 `{ 북마크ID: 시각(ms) }`로 기록한다. (N10)
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N11 pin / unpin: 독에 고정·해제 · P2
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: store.js · 팀원 A
- 관련 요구사항: F08-01, F08-02, F08-04, F08-06
- 안전 등급: 저장 항목을 바꿈 (끝에 되돌림)
- 사전 조건: 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N11
  await (async () => {
    T.begin("C-N11");
    const saved = await T.saveStore();
    try {
      await chrome.storage.local.remove("pinned");
      const r = [];
      for (let i = 1; i <= 9; i++) r.push(await T.store.pin("검증-p" + i));
      let p = (await T.stored()).pinned || [];
      T.expect("8번째까지는 true", r.slice(0, 8).every((x) => x === true), r);
      T.expect("F08-06 이미 8개면 넣지 않고 false", r[8] === false && p.length === 8, { r9: r[8], length: p.length });
      T.expect("F08-02 고정한 순서대로 저장된다", T.same(p, Array.from({ length: 8 }, (_, i) => "검증-p" + (i + 1))), p);
      const u = await T.store.unpin("검증-p3");
      p = (await T.stored()).pinned || [];
      T.expect("F08-04 unpin은 그 ID를 뺀 고정 목록을 돌려준다", T.same(u, p) && !p.includes("검증-p3") && p.length === 7, { u, p });
      T.expect("나머지 순서는 그대로다", T.same(p, ["검증-p1", "검증-p2", "검증-p4", "검증-p5", "검증-p6", "검증-p7", "검증-p8"]), p);
      const again = await T.store.pin("검증-p1");
      p = (await T.stored()).pinned || [];
      T.expect("이미 있으면 다시 넣지 않는다", p.filter((x) => x === "검증-p1").length === 1 && p.length === 7, p);
      T.record("이미 있는 ID를 pin했을 때 돌려주는 값(명세에 없다)", again);
    } finally {
      await T.restoreStore(saved);
    }
  })();
  ```
- 기대 결과: 고정은 최대 8개이고 9번째는 `false`, 이미 있으면 다시 넣지 않는다. `unpin`은 고정 목록을 돌려준다. (N11, F08-06)
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N12 dismiss / undismiss: "이제 안 봐도 됨" 기록·취소 · P1
- 구현 상태: 구현됨 (main `049b9be`)
- 파일·담당: store.js · 팀원 A
- 관련 요구사항: F04-09
- 안전 등급: 저장 항목을 바꿈 (끝에 되돌림)
- 사전 조건: 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N12
  await (async () => {
    T.begin("C-N12");
    const saved = await T.saveStore();
    try {
      await T.store.dismiss("검증-d1");
      let s = await T.stored();
      T.expect("dismissed[ID]에 지금 시각", T.near(s.dismissed?.["검증-d1"]), s.dismissed);
      await T.store.undismiss("검증-d1");
      s = await T.stored();
      T.expect("undismiss 뒤에는 그 ID가 없다([되돌리기])", !("검증-d1" in (s.dismissed || {})), s.dismissed);
    } finally {
      await T.restoreStore(saved);
    }
  })();
  ```
- 기대 결과: `dismissed`에 `{ 북마크ID: 시각(ms) }`로 기록하고, `undismiss`로 원래대로 돌아온다. (N12, F04-09)
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N13 markManualMove: 직접 옮김 기록 · P1·P2
- 구현 상태: 구현됨 (main `049b9be`)
- 파일·담당: store.js · 팀원 A
- 관련 요구사항: F07-06, F07-07
- 안전 등급: ⚠ 크롬 북마크를 바꿈 (임시 북마크)
- 사전 조건: 2장 실행. 서비스 워커만 부르는 함수라(`store.js` 주석) 새 탭에서 부르면 "서비스 워커만 쓴다" 오류가 난다. 그래서 함수를 직접 부르지 않고, C-N33처럼 새 탭 콘솔에서 북마크를 옮긴 뒤 `manualMoves`를 본다. `background.js`의 N33이 구현돼 있어야 의미가 있다.
- 붙여 넣을 코드:
  ```js
  // C-N13
  await (async () => {
    T.begin("C-N13");
    T.before = await T.snap();
    const f = await T.mkFolder("직접 옮김 기록 폴더");
    const b = await T.mk("직접 옮김 기록 북마크");
    await T.wait(1500);
    await chrome.bookmarks.move(b.id, { parentId: f.id });
    await T.wait(1500);
    const s = await T.stored();
    T.expect("manualMoves[ID]에 지금 시각", T.near(s.manualMoves?.[b.id]), s.manualMoves);
    T.expect("옮긴 위치는 저장하지 않는다(값이 시각 숫자)", typeof s.manualMoves?.[b.id] === "number", s.manualMoves?.[b.id]);
  })();
  ```
- 기대 결과: `manualMoves`에 `{ 북마크ID: 시각(ms) }`로 기록한다. (N13, '참고_저장 항목')
- 되돌리는 법: `await T.cleanup()` (지우면 C-N34대로 `manualMoves`에서도 빠져야 한다)
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N14 setPending / isPending: "우리 정리가 옮기는 중" 표시 · P1
- 구현 상태: 구현됨 (main `049b9be`)
- 파일·담당: store.js · 팀원 A
- 관련 요구사항: F07-05
- 안전 등급: 저장 항목을 바꿈 (끝에 되돌림)
- 사전 조건: 2장 실행. `setPending`은 새 탭만 부르는 함수다. `isPending`은 서비스 워커가 부르지만 저장 항목을 읽기만 하므로(`update`를 쓰지 않는다, `store.js` 주석) 새 탭 콘솔에서 불러도 된다.
- 붙여 넣을 코드:
  ```js
  // C-N14
  await (async () => {
    T.begin("C-N14");
    const saved = await T.saveStore();
    try {
      await chrome.storage.local.set({ pendingMoves: { "검증-old": { toParentId: "f1", at: Date.now() - 61000 } } });
      // 입력 원소는 { id, toParentId } (명세 v16 N14)
      await T.store.setPending([{ id: "검증-b1", toParentId: "f1" }, { id: "검증-b2", toParentId: "f2" }]);
      const pm = (await T.stored()).pendingMoves || {};
      T.expect("pendingMoves[ID] = { toParentId, at }", pm["검증-b1"]?.toParentId === "f1" && T.near(pm["검증-b1"]?.at), pm);
      T.expect("두 번째 북마크도 저장", pm["검증-b2"]?.toParentId === "f2", pm);
      T.expect("setPending 때 만료된 항목(1분 지남)을 지운다", !("검증-old" in pm), pm);
      T.expect("같은 ID·같은 목적지면 true", (await T.store.isPending("검증-b1", "f1")) === true);
      T.expect("목적지가 다르면 false", (await T.store.isPending("검증-b1", "f9")) === false);
      T.expect("표시가 없는 ID면 false", (await T.store.isPending("검증-none", "f1")) === false);
      await chrome.storage.local.set({ pendingMoves: { ...pm, "검증-b3": { toParentId: "f1", at: Date.now() - 61000 } } });
      T.expect("1분이 지난 표시는 false", (await T.store.isPending("검증-b3", "f1")) === false);
      T.expect("isPending은 표시를 지우지 않는다", "검증-b1" in ((await T.stored()).pendingMoves || {}));
    } finally {
      await T.restoreStore(saved);
    }
  })();
  ```
- 기대 결과: `setPending`은 북마크별 목적지와 시각을 저장하고 만료된 항목을 함께 지운다. `isPending`은 1분 안에 같은 목적지로 표시된 이동만 `true`다. 표시는 지우지 않고 시간으로 만료된다. (N14, F07-05)
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N15 addHistory / markUndone: 정리 기록 · P1
- 구현 상태: 구현됨 (main `049b9be`)
- 파일·담당: store.js · 팀원 A
- 관련 요구사항: F07-02, F13-03
- 안전 등급: 저장 항목을 바꿈 (끝에 되돌림)
- 사전 조건: 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N15
  await (async () => {
    T.begin("C-N15");
    const saved = await T.saveStore();
    try {
      await chrome.storage.local.remove("history");
      const entry = { id: "검증-h1", at: Date.now(), type: "first", createdFolderIds: ["f1"], moves: [{ bookmarkId: "b1", title: "가", fromParentId: "1", fromIndex: 0, toParentId: "f1" }], fromOrder: { 1: ["b1"] }, skipped: 0 };
      await T.store.addHistory(entry);
      let h = (await T.stored()).history || [];
      T.expect("history에 한 건 추가", h.length === 1 && h[0].id === "검증-h1", h);
      T.expect("넣은 내용이 그대로 저장", T.same({ ...h[0], undoneAt: undefined }, { ...entry, undoneAt: undefined }), h[0]);
      await T.store.markUndone("검증-h1");
      h = (await T.stored()).history || [];
      T.expect("F13-03 되돌린 시각(undoneAt)", T.near(h[0]?.undoneAt), h[0]);
    } finally {
      await T.restoreStore(saved);
    }
  })();
  ```
- 기대 결과: `history`에 기록 한 건을 더하고, `markUndone`은 그 기록에 `undoneAt`(되돌린 시각)을 적는다. (N15)
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N16 cleanupMissing: 사라진 북마크 ID 정리 · P1
- 구현 상태: 구현됨 (main `049b9be`)
- 파일·담당: store.js · 팀원 A
- 관련 요구사항: F01-06
- 안전 등급: 저장 항목을 바꿈 (끝에 되돌림)
- 사전 조건: 2장 실행, 북마크가 1개 이상 있는 프로필. 사전 조건으로 C-N01이 통과해야 한다(`loadTree`가 비어 있으면 있는 ID까지 지워진다).
- 붙여 넣을 코드:
  ```js
  // C-N16
  await (async () => {
    T.begin("C-N16");
    const saved = await T.saveStore();
    try {
      const real = (await T.flat())[0].id;
      const t = Date.now();
      const hist = [{ id: "검증-h", at: t, type: "first", createdFolderIds: [], moves: [{ bookmarkId: "검증-x5", title: "가", fromParentId: "1", fromIndex: 0, toParentId: "2" }], fromOrder: {}, skipped: 0 }];
      await chrome.storage.local.set({
        pinned: [real, "검증-x1"], lastOpenedByUs: { [real]: t, "검증-x2": t }, dismissed: { "검증-x3": t }, handledNew: ["검증-x4"],
        history: hist, manualMoves: { "검증-x6": t }, newBookmarks: ["검증-x7"],
      });
      const n = await T.store.cleanupMissing(await T.tree());
      const s = await T.stored();
      T.expect("지운 개수 4를 돌려준다", n === 4, n);
      T.expect("pinned에서 없는 ID만 지웠다", T.same(s.pinned, [real]), s.pinned);
      T.expect("lastOpenedByUs에서 없는 ID만 지웠다", T.same(Object.keys(s.lastOpenedByUs || {}), [real]), s.lastOpenedByUs);
      T.expect("dismissed, handledNew에서 지웠다", T.same(s.dismissed, {}) && T.same(s.handledNew, []), { d: s.dismissed, h: s.handledNew });
      T.expect("history는 지우지 않는다", T.same(s.history, hist), s.history);
      T.expect("서비스 워커가 쓰는 키(manualMoves, newBookmarks)는 건드리지 않는다", T.same(s.manualMoves, { "검증-x6": t }) && T.same(s.newBookmarks, ["검증-x7"]), { m: s.manualMoves, n: s.newBookmarks });
    } finally {
      await T.restoreStore(saved);
    }
  })();
  ```
- 기대 결과: 크롬에 없는 북마크 ID를 새 탭이 쓰는 항목(`pinned`, `lastOpenedByUs`, `dismissed`, `handledNew`)에서만 지우고 지운 개수를 돌려준다. `history`와 서비스 워커의 키는 그대로다. (N16, F01-06)
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N17 classify: 북마크 하나 분류하기 · P1
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: classify.js · 팀원 B
- 관련 요구사항: F05-01, F05-02, F05-03, F05-08
- 안전 등급: 읽기만
- 사전 조건: 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N17
  await (async () => {
    T.begin("C-N17");
    const c = await T.cats();
    const cl = (title, url) => T.classify.classify({ title, url }, c);
    // 이슈 #7의 예시 (docs/category-definitions.md 7번)
    let r = cl("자료구조 강의 1강 - YouTube", "https://www.youtube.com/watch?v=a");
    T.expect("분류표 단계: 영상, step site", r?.category === "영상" && r?.step === "site", r);
    T.expect("F05-02 근거(rule)가 있다", r?.rule != null && r?.rule !== "", r);
    T.expect("분류표 단계는 needsCheck가 아니다", !r?.needsCheck, r);
    r = cl("온라인 강의실", "https://lms.example.ac.kr/");
    T.expect("주소 끝 단계: 학교, step suffix", r?.category === "학교" && r?.step === "suffix", r);
    r = cl("2026 하반기 신입 채용", "https://careers.example.com/");
    T.expect("제목 키워드 단계: 취업, step keyword, needsCheck true", r?.category === "취업" && r?.step === "keyword" && r?.needsCheck === true, r);
    r = cl("항공사 특가 경쟁 과열", "https://n.news.naver.com/a");
    T.expect("분류하지 않는 사이트는 제목 키워드(특가)가 있어도 분류 안 됨", r?.category === null, r);
    r = cl("꼭 가야 할 인기 맛집", "https://example.com/");
    T.expect("F05-08 어느 단계에도 맞지 않으면 category null", r?.category === null, r);
    // 경계와 예외
    T.expect("앞의 www.는 뗀다", cl("가", "https://www.github.com/")?.category === cl("가", "https://github.com/")?.category && cl("가", "https://github.com/")?.category === "개발");
    T.expect("하위 주소(m.blog.naver.com)도 같은 항목", cl("가", "https://m.blog.naver.com/x/1")?.category === "블로그·글", cl("가", "https://m.blog.naver.com/x/1"));
    T.expect("더 긴 주소를 따른다: blog.naver.com과 cafe.naver.com이 갈린다", cl("가", "https://blog.naver.com/a")?.category === "블로그·글" && cl("가", "https://cafe.naver.com/a")?.category === "커뮤니티");
    T.expect("호스트는 점 단위로 비교한다(notgithub.com은 github.com이 아니다)", cl("zz", "https://notgithub.com/")?.category === null, cl("zz", "https://notgithub.com/"));
    T.expect("주소를 해석할 수 없으면 { category: null }", cl("채용", "주소 아님")?.category === null, cl("채용", "주소 아님"));
    T.expect("빈 주소도 { category: null }", cl("", "")?.category === null, cl("", ""));
    T.expect("제목 키워드는 띄어쓰기를 없애지 않는다: '수강신청'은 학교", cl("수강신청 안내", "https://zz.example/")?.category === "학교", cl("수강신청 안내", "https://zz.example/"));
    T.expect("제목 키워드는 띄어쓰기를 없애지 않는다: '수강 신 청'은 분류 안 됨", cl("수강 신 청", "https://zz.example/")?.category === null, cl("수강 신 청", "https://zz.example/"));
    T.expect("같은 입력은 같은 결과", T.same(cl("가", "https://github.com/"), cl("가", "https://github.com/")));
  })();
  ```
- 기대 결과: 분류표 → 주소 끝 → 제목 키워드 순서로 처음 맞는 곳에서 멈추고 `{ category, step, rule, needsCheck }`를 돌려준다. 분류하지 않는 사이트, 해석 못 하는 주소, 어디에도 안 맞는 북마크는 `{ category: null }`이다. 호스트는 앞의 `www.`를 떼고 점 단위로 비교하며, 여러 항목이 맞으면 더 긴 주소를 따른다. 제목 키워드는 띄어쓰기를 없애지 않고 비교한다. (N17, F05-01, F05-02, F05-08)
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N17-정답지 classify: 샘플 100개를 정답지와 비교 · P1
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: classify.js · 팀원 B
- 관련 요구사항: F05-01
- 안전 등급: 읽기만
- 사전 조건: 2장 실행. `tests/answer-key-100.json`을 편집기로 열어 내용 전체를 복사한 뒤, 콘솔에 `T.answers = ` 를 입력하고 그 뒤에 붙여 넣어 Enter를 누른다. (크롬 북마크는 필요 없다)
- 붙여 넣을 코드:
  ```js
  // C-N17-정답지
  await (async () => {
    T.begin("C-N17-정답지");
    if (!Array.isArray(T.answers)) { console.warn("먼저 T.answers = <answer-key-100.json 내용> 을 붙여 넣는다"); return; }
    const c = await T.cats();
    const diff = T.answers.filter((a) => (T.classify.classify({ title: a.title, url: a.url }, c)?.category ?? null) !== a.answer);
    console.table(diff.map((a) => ({ id: a.id, title: a.title, 정답: a.answer, 결과: T.classify.classify({ title: a.title, url: a.url }, c)?.category ?? null })));
    T.expect("정답과 다른 것은 61번 하나뿐이다(answer-key-100.md 1번: 분류표에 없는 개발 문서)", diff.length === 1 && diff[0].id === 61, diff.map((a) => a.id));
    const classified = T.answers.filter((a) => T.classify.classify({ title: a.title, url: a.url }, c)?.category != null).length;
    T.expect("100개 중 89개가 분류된다", classified === 89, classified);
    for (const id of [22, 29, 37]) {
      const a = T.answers.find((x) => x.id === id);
      T.expect(`${id}번: 분류하지 않는 사이트 규칙으로 분류 안 됨`, T.classify.classify({ title: a.title, url: a.url }, c)?.category === null, a);
    }
  })();
  ```
- 기대 결과: `tests/answer-key-100.md` 1번 표대로 정답과 다른 것은 61번(`developer.chrome.com`, 분류표에 없는 개발 문서) 하나이고, 89개가 분류된다. 22·29·37번은 분류하지 않는 사이트 규칙으로 분류 안 됨이다.
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N18 measure: 적용률·정확도 재기 · P1
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: classify.js · 팀원 B
- 관련 요구사항: F05-01
- 안전 등급: 읽기만
- 사전 조건: 2장 실행, C-N17-정답지의 `T.answers` 붙여 넣기
- 붙여 넣을 코드:
  ```js
  // C-N18
  await (async () => {
    T.begin("C-N18");
    if (!Array.isArray(T.answers)) { console.warn("먼저 T.answers = <answer-key-100.json 내용> 을 붙여 넣는다"); return; }
    // 정답지 JSON이 measure에 넣는 형식이다(tests/README.md). samples와 answers에 같은 배열을 넣었다 (4장 4-3)
    const m = T.classify.measure(T.answers, T.answers, await T.cats());
    const pct = (v) => (v > 1 ? v / 100 : v);
    T.expect("출력에 coverage, accuracy, wrong", m && "coverage" in m && "accuracy" in m && Array.isArray(m.wrong), m);
    T.expect("적용률 89%", Math.abs(pct(m?.coverage) - 0.89) < 0.005, m?.coverage);
    T.expect("정확도(분류된 것 중) 100%", Math.abs(pct(m?.accuracy) - 1) < 0.005, m?.accuracy);
    T.expect("틀린 목록은 61번 하나", m?.wrong?.length === 1 && JSON.stringify(m.wrong[0]).includes("developer.chrome.com"), m?.wrong);
    T.record("coverage·accuracy의 단위(0~1 또는 %)", [m?.coverage, m?.accuracy]);
  })();
  ```
- 기대 결과: 정답지 100개로 적용률 89%, 정확도 100%이고 틀린 것은 61번 하나다. (이슈 #7 완료 조건, `answer-key-100.md` 1번)
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N19 getTargets: 정리 대상 고르기 · P1
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: plan.js · 팀원 C
- 관련 요구사항: F05-04, F07-07
- 안전 등급: 읽기만
- 사전 조건: `sample-100.html`을 가져온 그대로의 프로필(가져온 북마크를 꺼내지 않음), 2장 실행. 사전 조건으로 C-N01이 통과해야 한다.
- 붙여 넣을 코드:
  ```js
  // C-N19
  await (async () => {
    T.begin("C-N19");
    const now = Date.now();
    const tree = await T.tree();
    const stored = T.emptyStored();
    const flat = await T.flat();
    const raw = await T.rawRoots();
    // 명세 문장으로 만든 비교 기준: 최상위 폴더 바로 아래 + 그 바로 아래의 "가져온 북마크" 폴더 바로 아래 (F05-04)
    const rootIds = [raw.bar, raw.other, raw.mobile].filter(Boolean).map((n) => n.id);
    const importIds = [];
    for (const r of rootIds) for (const k of await T.kids(r)) if (!k.url && k.title === "가져온 북마크") importIds.push(k.id);
    const want = flat.filter((b) => (rootIds.includes(b.parentId) || importIds.includes(b.parentId)) && !/^(javascript:|chrome:\/\/)/.test(b.url) && !b.title.startsWith(T.prefix));
    const got = T.plan.getTargets(tree, stored, {}, now) || [];
    const gotIds = new Set(got.map((b) => b.id));
    T.expect("정리 대상이 명세 문장으로 고른 것과 같다", gotIds.size === want.length && want.every((b) => gotIds.has(b.id)), { got: got.length, want: want.length });
    T.expect("sample-100이면 90개(북마크바 74 + 가져온 북마크 바로 아래 16)", got.length === 90, got.length);
    const byId = Object.fromEntries(flat.map((b) => [b.id, b]));
    T.expect("가져온 북마크 바로 아래 16개가 들어 있다", got.filter((b) => importIds.includes(byId[b.id]?.parentId)).length === 16, got.filter((b) => importIds.includes(byId[b.id]?.parentId)).length);
    const inUser = got.filter((b) => /(졸업프로젝트|알바·취준|자취템)/.test(byId[b.id]?.path || ""));
    T.expect("사용자 폴더(졸업프로젝트, 알바·취준, 가져온 북마크 안의 자취템) 안 북마크는 없다", inUser.length === 0, inUser.map((b) => b.title));
    T.expect("같은 입력은 같은 결과", T.same(got.map((b) => b.id), (T.plan.getTargets(tree, stored, {}, now) || []).map((b) => b.id)));
  })();
  ```
- 기대 결과: 북마크바·기타·모바일 바로 아래와, 그 바로 아래 "가져온 북마크" 폴더 바로 아래의 북마크만 있다. 사용자 폴더 안 북마크는 없다. `sample-100`이면 90개다. (N19, F05-04, `answer-key-100.md` 1번)
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N19-예외 getTargets: 빼는 대상과 경계 · P1·P2
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: plan.js · 팀원 C
- 관련 요구사항: F05-04, F07-07
- 안전 등급: 읽기만 (`loadTree` 결과를 복사해 고친다. 크롬 북마크는 그대로다)
- 사전 조건: C-N19와 같다
- 붙여 넣을 코드:
  ```js
  // C-N19-예외
  await (async () => {
    T.begin("C-N19-예외");
    const now = Date.now();
    const tree = structuredClone(await T.tree());
    const raw = await T.rawRoots();
    const base0 = (T.plan.getTargets(tree, T.emptyStored(), {}, now) || []);
    const onBar = tree.bookmarks?.filter((b) => b.parentId === raw.bar.id) ?? [];
    if (onBar.length < 4) { T.expect("북마크바 바로 아래 북마크가 4개 이상 있어야 확인할 수 있다", false, onBar.length); return; }
    const [b1, b2, b3, b4] = onBar;
    // 진짜 북마크를 복사해 주소만 바꾼 가짜 (들어 있는 폴더·최상위 폴더 정보는 그대로)
    tree.bookmarks.push({ ...b1, id: "검증-js", url: "javascript:alert(1)" }, { ...b1, id: "검증-chrome", url: "chrome://settings/" });
    b2.dateLastUsed = now - 5 * T.day;       // 최근 30일 안에 북마크바에서 연 북마크
    b3.dateLastUsed = now - 31 * T.day;      // 30일이 지났다
    const stored = { ...T.emptyStored(), manualMoves: { [b4.id]: now - T.day } };
    const ids = new Set((T.plan.getTargets(tree, stored, {}, now) || []).map((b) => b.id));
    T.expect("javascript: 주소는 빠진다", !ids.has("검증-js"));
    T.expect("chrome:// 주소는 빠진다", !ids.has("검증-chrome"));
    T.expect("최근 30일 안에 북마크바에서 연 북마크(dateLastUsed 5일 전)는 빠진다", !ids.has(b2.id));
    T.expect("dateLastUsed가 31일 전이면 대상이다", ids.has(b3.id));
    T.expect("F07-07 manualMoves에 있는 북마크는 빠진다", !ids.has(b4.id));
    T.expect("(앞의 것이 빈 결과 때문이 아니다: 나머지는 그대로 대상)", base0.length > 0 && ids.size === base0.length - 2, { before: base0.length, after: ids.size });
    const empty = T.plan.getTargets({ roots: { bar: null, other: null, mobile: null }, bookmarks: [], folders: [] }, T.emptyStored(), {}, now);
    T.expect("북마크가 하나도 없으면 빈 배열", Array.isArray(empty) && empty.length === 0, empty);
  })();
  ```
- 기대 결과: `javascript:`·`chrome://` 주소, 최근 30일 안에 북마크바에서 연 북마크(`dateLastUsed` 기준), 직접 옮긴 북마크(`manualMoves`)는 빠진다. 30일이 지난 것은 다시 대상이다. 빈 입력이면 빈 배열이다. (F05-04, F07-07)
- 확인하지 않는 것: options(북마크바 제외, 포함할 사용자 폴더)는 키 이름이 명세에 없어 기본값(`{}`)만 본다(F06-04, P2. 4장 4-3).
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N20 makePlan: 폴더 계획 (샘플 100개) · P1
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: plan.js · 팀원 C
- 관련 요구사항: F05-05, F05-06, F05-07, F05-08
- 안전 등급: 읽기만
- 사전 조건: C-N19와 같다. 사전 조건으로 C-N17, C-N19가 통과해야 한다.
- 붙여 넣을 코드:
  ```js
  // C-N20
  await (async () => {
    T.begin("C-N20");
    const c = await T.cats();
    const names = c.categories.map((x) => x.name);
    const targets = T.plan.getTargets(await T.tree(), T.emptyStored(), {}, Date.now()) || [];
    const p = T.plan.makePlan(targets, c);
    T.expect("정리 대상 90개면 type folders", p?.type === "folders", p);
    T.expect("F05-05 90개(60~99)면 폴더는 최대 5개", (p?.folders?.length ?? 99) <= 5 && p?.folders?.length > 0, p?.folders?.length);
    T.expect("F05-06 모든 폴더에 북마크가 3개 이상", (p?.folders ?? []).every((f) => f.items?.length >= 3), p?.folders?.map((f) => [f.name, f.items?.length]));
    T.expect("F05-06 \"기타\" 폴더가 없다", !(p?.folders ?? []).some((f) => f.name === "기타"));
    T.expect("폴더 이름은 분류표의 카테고리 이름", (p?.folders ?? []).every((f) => names.includes(f.name)), p?.folders?.map((f) => f.name));
    const all = (p?.folders ?? []).flatMap((f) => f.items.map((b) => b.id));
    T.expect("북마크 하나는 한 폴더에만", new Set(all).size === all.length);
    T.expect("F05-08 분류 안 됨인 북마크는 폴더에 없다", (p?.folders ?? []).every((f) => f.items.every((b) => T.classify.classify(b, c)?.category === f.name)));
    const restN = Array.isArray(p?.rest) ? p.rest.length : p?.rest;
    T.expect("폴더에 든 것 + 나머지(rest) = 정리 대상", all.length + restN === targets.length, { inFolders: all.length, rest: restN, targets: targets.length });
    T.expect("F05-07 같은 입력은 같은 계획", T.same(p, T.plan.makePlan(targets, c)));
    T.record("폴더별 이름과 개수", p?.folders?.map((f) => `${f.name} ${f.items?.length}`));
    T.record("reasons의 모양(F06-03 분류 근거)", p?.folders?.[0]?.reasons);
  })();
  ```
- 기대 결과: 90개면 폴더는 최대 5개이고, 모든 폴더가 3개 이상이며 "기타" 폴더가 없다. 분류 안 됨은 폴더에 넣지 않는다. 같은 입력은 같은 계획이다. (N20, F05-05~08)
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N20-예외 makePlan: 개수 경계와 동점 (가짜 입력) · P1
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: plan.js · 팀원 C
- 관련 요구사항: F05-05, F05-06, F05-07, F05-09
- 안전 등급: 읽기만
- 사전 조건: 2장 실행. 사전 조건으로 C-N17이 통과해야 한다(가짜 북마크는 분류표의 첫 사이트로 만든다).
- 붙여 넣을 코드:
  ```js
  // C-N20-예외
  await (async () => {
    T.begin("C-N20-예외");
    const c = await T.cats();
    const names = c.categories.map((x) => x.name);
    const mp = (t) => T.plan.makePlan(t, c);
    const n = (p) => p?.folders?.length;
    // 카테고리 i를 k개씩: counts = [k0, k1, ...]
    const build = (counts, unknown = 0) => [...counts.flatMap((k, i) => T.ofCat(c, i, k)), ...T.unknown(unknown)];
    T.expect("F05-09 정리 대상 9개(10개 미만)면 type pin", mp(build([3, 3, 3]))?.type === "pin", mp(build([3, 3, 3])));
    T.expect("F05-09 10개라도 3개 이상 모인 카테고리가 없으면 pin", mp(build([2, 2, 2, 2, 2]))?.type === "pin", mp(build([2, 2, 2, 2, 2])));
    T.expect("10개이고 3개 모인 카테고리가 있으면 folders", mp(build([3], 7))?.type === "folders", mp(build([3], 7)));
    T.expect("빈 입력이면 pin", mp([])?.type === "pin", mp([]));
    // 상한: 9개 카테고리 모두 충분히 모이게 해서 상한이 걸리게 한다
    const cap = [[29, 3], [30, 4], [59, 4], [60, 5], [99, 5], [100, 6]];
    for (const [total, max] of cap) {
      const per = Math.floor(total / 9);
      const t = build(Array(9).fill(per), total - per * 9);
      T.expect(`F05-05 정리 대상 ${total}개면 폴더는 최대 ${max}개`, t.length === total && n(mp(t)) <= max && n(mp(t)) > 0, n(mp(t)));
      T.record(`정리 대상 ${total}개일 때 만든 폴더 수`, n(mp(t)));
    }
    // 많은 카테고리부터: 0번 8개, 1번 7개, 2번 6개, 3번 5개, 4번 4개 = 30개 → 최대 4개
    const big = mp(build([8, 7, 6, 5, 4]));
    T.expect("많은 카테고리부터 고른다", (big?.folders ?? []).every((f, i, a) => i === 0 || a[i - 1].items.length >= f.items.length) && !(big?.folders ?? []).some((f) => f.name === names[4] && n(big) < 5), big?.folders?.map((f) => [f.name, f.items.length]));
    // 동점: 6개 카테고리 3개씩 + 2개 = 20개 → 최대 3개, categories.json 순서(앞의 3개)
    const tie = mp(build([3, 3, 3, 3, 3, 3], 2).reverse());
    T.expect("F05-07 개수가 같으면 categories.json 순서로 고른다", T.same((tie?.folders ?? []).map((f) => f.name).sort(), names.slice(0, 3).sort()), tie?.folders?.map((f) => f.name));
    // 3개 미만 카테고리는 폴더가 되지 않는다
    const few = mp(build([5, 2, 3], 2));
    T.expect("F05-06 2개뿐인 카테고리는 폴더가 아니다", !(few?.folders ?? []).some((f) => f.name === names[1]), few?.folders?.map((f) => f.name));
    T.expect("F05-08 분류 안 됨은 폴더에 들어가지 않는다", (few?.folders ?? []).every((f) => f.items.every((b) => !b.id.startsWith("u"))));
    T.record("type pin일 때의 reason", mp(build([3, 3, 3]))?.reason);
  })();
  ```
- 기대 결과:
  - 정리 대상 10~29개는 최대 3개, 30~59개는 4개, 60~99개는 5개, 100개 이상은 6개다. 많은 카테고리부터 고른다. (F05-05)
  - 3개 미만 카테고리는 폴더로 만들지 않는다. (F05-06) 개수가 같으면 `categories.json` 순서로 고른다. (F05-07)
  - 10개 미만이거나 3개 이상 모인 카테고리가 없으면 `type: "pin"`이다. (F05-09)
  - 폴더 수가 상한보다 적어도 되는지("최대")는 명세에 없으므로, 만든 폴더 수는 기록만 한다.
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N21 pickPinCandidates: 고정 후보 고르기 · P2
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: plan.js · 팀원 C
- 관련 요구사항: F09-03, F09-08, F09-09
- 안전 등급: 읽기만
- 사전 조건: 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N21
  await (async () => {
    T.begin("C-N21");
    const now = Date.now(), d = T.day;
    const bms = [
      T.fakeBm("g1", "깃허브", "https://github.com/a"),
      T.fakeBm("y1", "유튜브", "https://www.youtube.com/x"),
      T.fakeBm("n1", "네이버", "https://naver.com/"),
      T.fakeBm("c1", "쿠팡", "https://www.coupang.com/"),
      T.fakeBm("t1", "티스토리", "https://a.tistory.com/1"),
      T.fakeBm("i1", "인프런", "https://www.inflearn.com/"),
      T.fakeBm("z1", "연 적 없음", "https://zz.example/"),
    ];
    const stored = { ...T.emptyStored(), lastOpenedByUs: { g1: now - 5 * d, n1: now - 1 * d, c1: now - 3 * d, t1: now - 10 * d, i1: now - 20 * d } };
    const top = [{ url: "https://youtube.com/", title: "YouTube" }, { url: "chrome-extension://abc/newtab.html", title: "새 탭" }, { url: "https://github.com/", title: "GitHub" }];
    const ids = (r) => (r || []).map((b) => b.id);
    const r1 = T.plan.pickPinCandidates(bms, top, stored);
    T.expect("최대 5개", (r1 || []).length === 5, ids(r1));
    T.expect("F09-03 자주 방문한 사이트와 같은 호스트(www. 뗌)가 목록 순서대로 먼저", T.same(ids(r1).slice(0, 2), ["y1", "g1"]), ids(r1));
    T.expect("F09-03 모자라면 최근에 연 순으로 채운다", T.same(ids(r1).slice(2), ["n1", "c1", "t1"]), ids(r1));
    T.expect("http·https가 아닌 자주 방문한 사이트는 건너뛴다(오류 없음)", Array.isArray(r1));
    const r2 = T.plan.pickPinCandidates(bms, [], stored);
    T.expect("F09-08 자주 방문한 사이트가 비면 최근에 연 순만", T.same(ids(r2), ["n1", "c1", "g1", "t1", "i1"]), ids(r2));
    const r3 = T.plan.pickPinCandidates(bms, [], T.emptyStored());
    T.expect("F09-09 연 적 있는 북마크도 없으면 0개", Array.isArray(r3) && r3.length === 0, ids(r3));
    T.expect("같은 입력은 같은 결과", T.same(ids(r1), ids(T.plan.pickPinCandidates(bms, top, stored))));
  })();
  ```
- 기대 결과: 자주 방문한 사이트와 호스트가 같은 북마크를 목록 순서대로 먼저 고르고, 모자라면 최근에 연 순으로 채워 최대 5개다. 연 적 없는 북마크는 후보가 아니어서 0개일 수 있다. (N21, F09-03, F09-08, F09-09)
- 판단: "최근에 연 순"의 시각은 `lastOpenedByUs`만 넣어 확인했다. `dateLastUsed`를 함께 볼지는 명세에 없다.
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N22 applyPlan: 정리 적용 · P1
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: organize.js · 팀원 A
- 관련 요구사항: F07-01, F07-02, F07-05
- 안전 등급: ⚠ 크롬 북마크를 바꿈
- 사전 조건: 2장 실행. 사전 조건으로 C-N02, C-N03, C-N14가 통과해야 한다. `manualMoves` 확인은 서비스 워커(N33)가 구현돼 있어야 의미가 있다.
- 붙여 넣을 코드:
  ```js
  // C-N22
  await (async () => {
    T.begin("C-N22");
    T.before = await T.snap();
    const src = await T.mkFolder("원래 폴더");
    const xs = [];
    for (let i = 0; i < 6; i++) xs.push(await T.mk("x" + i, undefined, src.id));
    await T.wait(1500);
    const order0 = (await T.kids(src.id)).map((n) => n.id);
    const items = [xs[1], xs[3], xs[4]];
    // 계획의 items에는 크롬 북마크 노드를 넣었다 (4장 4-3)
    const entry = await T.organize.applyPlan({ folders: [{ name: T.prefix + "정리A", items }] }, "first");
    const barKids = await T.kids((await T.bar()).id);
    const last = barKids[barKids.length - 1];
    T.expect("F07-01 북마크바 맨 뒤에 계획한 폴더가 생겼다", last && !last.url && last.title === T.prefix + "정리A", last);
    const inNew = last && !last.url ? (await T.kids(last.id)).map((n) => n.id) : [];
    T.expect("F07-01 계획한 북마크 3개가 그 폴더에 들어갔다", items.every((b) => inNew.includes(b.id)), inNew);
    T.expect("출력: { id, at, type, createdFolderIds, moves, fromOrder, skipped }", entry && ["id", "at", "type", "createdFolderIds", "moves", "fromOrder", "skipped"].every((k) => k in entry), entry);
    T.expect("type은 first, at은 지금", entry?.type === "first" && T.near(entry?.at), entry);
    T.expect("createdFolderIds에 새 폴더", entry?.createdFolderIds?.includes(last?.id), entry?.createdFolderIds);
    T.expect("F07-02 moves: 북마크별 원래 폴더·원래 순서·옮긴 폴더", entry?.moves?.length === 3 && entry.moves.every((m) => m.fromParentId === src.id && typeof m.fromIndex === "number" && m.toParentId === last?.id), entry?.moves);
    T.expect("F07-02 원래 순서는 옮기기 전에 한꺼번에 읽었다(1, 3, 4)", T.same((entry?.moves ?? []).map((m) => m.fromIndex).sort((a, b) => a - b), [1, 3, 4]), entry?.moves?.map((m) => m.fromIndex));
    T.expect("F07-02 fromOrder는 옮기기 전 원래 폴더의 전체 순서", T.same(entry?.fromOrder?.[src.id], order0), entry?.fromOrder);
    T.expect("history.moves에 제목이 있다(기록 화면용)", (entry?.moves ?? []).every((m) => typeof m.title === "string"), entry?.moves);
    T.expect("F07-02 정리 이유는 저장하지 않는다", entry && !/reason/i.test(JSON.stringify(entry)), entry);
    T.expect("옮기지 못한 것 없음(skipped 0)", entry?.skipped === 0, entry?.skipped);
    const s = await T.stored();
    T.expect("history에 저장됐다", (s.history || []).some((h) => h.id === entry?.id), s.history);
    T.expect("F07-05 pendingMoves에 북마크별 목적지와 시각", items.every((b) => s.pendingMoves?.[b.id]?.toParentId === last?.id && T.near(s.pendingMoves[b.id].at)), s.pendingMoves);
    await T.wait(2000);
    const mm = (await T.stored()).manualMoves || {};
    T.expect("F07-05 정리 적용 직후 manualMoves가 늘지 않았다", items.every((b) => !(b.id in mm)), mm);
    const pm2 = (await T.stored()).pendingMoves || {};
    T.expect("옮긴 뒤에도 pendingMoves를 지우지 않는다(1분 뒤 만료)", items.every((b) => b.id in pm2), pm2);
    T.lastEntry = entry;
  })();
  ```
- 기대 결과:
  - 북마크바 맨 뒤에 계획한 폴더를 만들고 정리 대상 북마크를 옮긴다. (F07-01)
  - 정리 기록에 북마크별 원래 폴더·원래 순서·옮긴 폴더와, 옮기기 전 원래 폴더의 전체 순서(`fromOrder`)를 저장한다. 원래 순서는 첫 북마크를 옮기기 전에 한꺼번에 읽으므로 `fromIndex`가 1, 3, 4다(하나씩 옮기며 읽으면 1, 2, 2가 된다). 정리 이유는 저장하지 않는다. (F07-02)
  - 옮기기 전에 `pendingMoves`에 저장하고, 옮긴 뒤에도 지우지 않는다. 정리 적용 직후 `manualMoves`가 늘지 않는다. (F07-05)
- 되돌리는 법: C-N23을 이어서 하면 되돌리기로 확인한다. 하지 않으면 `await T.organize.undo(T.lastEntry.id)` 또는 `await T.cleanup()`. 끝나면 `T.diff(T.before, await T.snap())`가 "(차이 없음)"이다. 저장 항목에 남은 정리 기록은 `await T.store.update("history", (h) => h.filter((x) => !x.moves?.some((m) => m.title?.startsWith("[검증]"))))`로 지운다.
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N22-예외 applyPlan: 같은 이름 폴더, 이미 지워진 북마크, 비게 된 폴더 · P1·P2
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: organize.js · 팀원 A
- 관련 요구사항: F07-04, F07-08, F07-09, F10-05
- 안전 등급: ⚠ 크롬 북마크를 바꿈
- 사전 조건: C-N22와 같다
- 붙여 넣을 코드:
  ```js
  // C-N22-예외
  await (async () => {
    T.begin("C-N22-예외");
    T.before = await T.snap();
    const bar = await T.bar();
    const empty = await T.mkFolder("비게 될 폴더");
    const k = [await T.mk("k0", undefined, empty.id), await T.mk("k1", undefined, empty.id), await T.mk("k2", undefined, empty.id)];
    const exist = await T.mkFolder("정리B");                       // 같은 이름의 폴더가 이미 있다
    const gone = await T.mk("지워질 북마크");
    await chrome.bookmarks.remove(gone.id);                         // 옮기기 전에 지워진 북마크
    const entry = await T.organize.applyPlan({ folders: [{ name: T.prefix + "정리B", items: [...k, gone] }] }, "first");
    const same = (await T.kids(bar.id)).filter((n) => n.title === T.prefix + "정리B");
    T.expect("F07-08 같은 이름 폴더를 새로 만들지 않는다", same.length === 1 && same[0].id === exist.id, same);
    T.expect("F07-08 이미 있는 폴더를 쓴다(북마크가 그 폴더로 갔다)", T.same((await T.kids(exist.id)).map((n) => n.id).sort(), k.map((b) => b.id).sort()), await T.kids(exist.id));
    T.expect("이미 있던 폴더는 createdFolderIds에 넣지 않는다(F13-04에서 지우지 않게)", !(entry?.createdFolderIds ?? [exist.id]).includes(exist.id), entry?.createdFolderIds);
    T.expect("F07-09 지워진 북마크는 건너뛰고 skipped 1", entry?.skipped === 1, entry?.skipped);
    T.expect("F07-09 옮긴 것만 기록한다", entry?.moves?.length === 3 && !entry.moves.some((m) => m.bookmarkId === gone.id), entry?.moves);
    T.expect("F07-04 정리로 비게 된 기존 폴더를 지우지 않는다", await T.exists(empty.id));
    // P2: 새 북마크 정리에서 '그대로 두기'로 둔 북마크는 handledNew에 기록 (keep의 원소 형태는 4장 4-3)
    const saved = await T.saveStore();
    try {
      const stay = await T.mk("그대로 둘 새 북마크");
      const move = await T.mk("옮길 새 북마크");
      const e2 = await T.organize.applyPlan({ folders: [{ folderId: exist.id, items: [move] }], keep: [stay.id] }, "new");
      T.expect("F10-05 type은 new", e2?.type === "new", e2?.type);
      T.expect("F10-05 folderId로 준 폴더로 옮긴다", (await chrome.bookmarks.get(move.id))[0].parentId === exist.id);
      T.expect("F10-05 '그대로 두기'는 handledNew에 기록", ((await T.stored()).handledNew || []).includes(stay.id), (await T.stored()).handledNew);
    } finally {
      await T.restoreStore({ ...(await T.stored()), handledNew: saved.handledNew ?? [] });
    }
  })();
  ```
- 기대 결과: 북마크바에 같은 이름의 폴더가 있으면 새로 만들지 않고 그 폴더를 쓴다(F07-08). 옮기기 전에 지워진 북마크는 건너뛰고 옮긴 것만 기록하며, 건너뛴 개수를 `skipped`에 담는다(F07-09). 정리로 비게 된 기존 폴더는 지우지 않는다(F07-04). `"new"` 정리에서 '그대로 두기'로 둔 북마크는 `handledNew`에 기록한다(N22, F10-05).
- 되돌리는 법: `await T.cleanup()` 뒤 `T.diff(T.before, await T.snap())`. 정리 기록은 C-N22의 되돌리는 법대로 지운다.
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N23 undo: 정리 되돌리기 · P1
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: organize.js · 팀원 A
- 관련 요구사항: F13-03, F13-04, F07-05
- 안전 등급: ⚠ 크롬 북마크를 바꿈
- 사전 조건: 2장 실행. 사전 조건으로 C-N22가 통과해야 한다(이 항목이 직접 정리를 적용한 뒤 되돌린다).
- 붙여 넣을 코드:
  ```js
  // C-N23
  await (async () => {
    T.begin("C-N23");
    T.before = await T.snap();
    const titles = async (id) => (await T.kids(id)).map((n) => n.title.replace(T.prefix, ""));
    // 1) 그대로 되돌리기
    const src = await T.mkFolder("되돌릴 원래 폴더");
    const xs = [];
    for (let i = 0; i < 6; i++) xs.push(await T.mk("x" + i, undefined, src.id));
    const entry = await T.organize.applyPlan({ folders: [{ name: T.prefix + "되돌릴 정리", items: [xs[1], xs[3], xs[4]] }] }, "first");
    const made = entry?.createdFolderIds?.[0];
    await T.wait(1500);
    const r = await T.organize.undo(entry?.id);
    T.expect("F13-03 원래 폴더의 원래 순서로 돌아왔다", T.same(await titles(src.id), ["x0", "x1", "x2", "x3", "x4", "x5"]), await titles(src.id));
    T.expect("출력: { restored, skipped, fallback }", r && "restored" in r && "skipped" in r && "fallback" in r, r);
    T.expect("restored 3, skipped 0, fallback 0", r?.restored === 3 && r?.skipped === 0 && r?.fallback === 0, r);
    T.expect("F13-04 그 정리가 만든 빈 폴더를 지웠다", made && !(await T.exists(made)), made);
    const h = ((await T.stored()).history || []).find((x) => x.id === entry?.id);
    T.expect("F13-03 그 내역에 되돌린 시각(undoneAt)", T.near(h?.undoneAt), h);
    await T.wait(2000);
    const mm = (await T.stored()).manualMoves || {};
    T.expect("F07-05 되돌리는 이동도 manualMoves에 기록되지 않는다", xs.every((b) => !(b.id in mm)), mm);
    // 2) 정리 뒤 원래 폴더에 추가·삭제가 섞인 경우: 순서 번호가 아니라 바로 앞 이웃의 뒤에 놓는다
    const src2 = await T.mkFolder("섞일 원래 폴더");
    const ys = [];
    for (let i = 0; i < 6; i++) ys.push(await T.mk("y" + i, undefined, src2.id));
    const e2 = await T.organize.applyPlan({ folders: [{ name: T.prefix + "섞일 정리", items: [ys[1], ys[3], ys[4]] }] }, "first");
    await T.mk("새로 앞에", undefined, undefined).then((n) => chrome.bookmarks.move(n.id, { parentId: src2.id, index: 0 }));
    await chrome.bookmarks.remove(ys[2].id);
    await T.organize.undo(e2?.id);
    T.expect("F13-03 앞에 추가되고 y2가 지워져도 이웃 기준으로 순서가 유지된다", T.same(await titles(src2.id), ["새로 앞에", "y0", "y1", "y3", "y4", "y5"]), await titles(src2.id));
  })();
  ```
- 기대 결과:
  - 그 정리에서 옮긴 북마크를 원래 폴더로 되돌린다. 원래 순서가 앞인 것부터, 원래 순서에서 바로 앞에 있던 북마크의 바로 뒤에 놓는다. 되돌린 시각을 그 내역에 기록한다. (F13-03)
  - 원래 폴더에 북마크가 추가되거나 지워져도 순서가 어긋나지 않는다. y3의 바로 앞 이웃 y2가 지워졌으므로 남아 있는 가장 가까운 앞 이웃 y1의 뒤에 놓는다. (F13-03 비고)
  - 되돌린 뒤 그 정리가 만든 폴더가 비었으면 지운다. (F13-04)
  - 되돌리기 전에 `setPending`을 하므로 되돌리는 이동이 직접 옮김으로 기록되지 않는다. (N23)
- 되돌리는 법: `await T.cleanup()` 뒤 `T.diff(T.before, await T.snap())`
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N23-예외 undo: 직접 옮김, 앞 이웃 없음, 원래 폴더 없음, 삭제됨, 이미 되돌림 · P1·P2
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: organize.js · 팀원 A
- 관련 요구사항: F13-05, F13-06, F13-07, F13-08, F13-09
- 안전 등급: ⚠ 크롬 북마크를 바꿈
- 사전 조건: C-N23과 같다
- 붙여 넣을 코드:
  ```js
  // C-N23-예외
  await (async () => {
    T.begin("C-N23-예외");
    T.before = await T.snap();
    const bar = await T.bar();
    const raw = await T.rawRoots();
    const src = await T.mkFolder("예외 원래 폴더");
    const [a0, a1, s, a2, a3] = [await T.mk("a0", undefined, src.id), await T.mk("a1", undefined, src.id), await T.mk("s", undefined, src.id), await T.mk("a2", undefined, src.id), await T.mk("a3", undefined, src.id)];
    const lost = await T.mkFolder("지워질 원래 폴더");
    const g0 = await T.mk("g0", undefined, lost.id);
    const g1 = await T.mk("g1", undefined, lost.id);
    const entry = await T.organize.applyPlan({ folders: [{ name: T.prefix + "예외 정리", items: [a1, a2, a3, g1] }] }, "first");
    const made = entry?.createdFolderIds?.[0];
    await chrome.bookmarks.remove(a0.id);                              // a1의 앞 이웃이 하나도 안 남는다
    await chrome.bookmarks.move(a2.id, { parentId: bar.id });          // 정리 뒤 사용자가 직접 옮겼다
    await chrome.bookmarks.remove(a3.id);                              // 되돌릴 북마크가 지워졌다
    await chrome.bookmarks.removeTree(lost.id);                        // 원래 폴더가 지워졌다
    await T.wait(1500);
    const r = await T.organize.undo(entry?.id);
    const order = (await T.kids(src.id)).map((n) => n.id);
    T.expect("F13-06 앞 이웃이 하나도 없으면 원래 폴더의 맨 앞", T.same(order, [a1.id, s.id]), order);
    T.expect("F13-05 직접 옮긴 북마크는 되돌리지 않고 지금 위치", (await chrome.bookmarks.get(a2.id))[0].parentId === bar.id);
    T.expect("F13-07 원래 폴더가 없으면 기타 북마크로", (await T.exists(g1.id)) && (await chrome.bookmarks.get(g1.id))[0].parentId === raw.other.id);
    T.expect("F13-05·08 직접 옮김(a2)과 삭제(a3)는 skipped 2", r?.skipped === 2, r);
    T.expect("F13-07 fallback 1", r?.fallback === 1, r);
    T.record("restored 값(기타 북마크로 간 것을 세는지 명세에 없다)", r?.restored);
    T.expect("F13-04 그 정리가 만든 폴더가 비었으면 지운다", made && !(await T.exists(made)), made);
    T.record("F13-07 \"원래 폴더가 없어 기타 북마크로 되돌렸어요\" 문구(화면은 C-N43에서 본다)", "결과를 보고 화면에 표시하는 것은 view/history.js");
    // 이미 되돌린 기록을 한 번 더 되돌리기
    const before2 = await T.snap();
    let threw = false, r2;
    try { r2 = await T.organize.undo(entry?.id); } catch (e) { threw = true; }
    const after2 = await T.snap();
    T.record("이미 되돌린 기록을 다시 undo했을 때의 결과(명세는 화면에서 \"되돌림\"만 정한다, F13-09)", { threw, r2, 북마크가_바뀜: before2 !== after2 });
  })();
  ```
- 기대 결과:
  - 지금 그 정리가 옮겨 넣은 폴더에 없는 북마크(정리 뒤에 사용자가 옮김)는 되돌리지 않고 지금 위치에 둔다. (F13-05)
  - 원래 순서에서 앞에 있던 북마크가 원래 폴더에 하나도 남아 있지 않으면 원래 폴더의 맨 앞에 놓는다. 순서 번호(1번)로 되돌리면 `s` 뒤에 놓여 실패한다. (F13-06)
  - 원래 폴더가 지워졌으면 기타 북마크로 되돌리고 `fallback`에 센다. (F13-07)
  - 되돌릴 북마크가 이미 지워졌으면 건너뛴다. (F13-08)
  - 이미 되돌린 기록을 다시 되돌릴 때 함수가 어떻게 하는지는 명세에 없다. 기록만 한다. 화면이 [되돌리기] 대신 "되돌림"을 보여 주는지는 C-N43에서 본다. (F13-09)
- 되돌리는 법: `await T.cleanup()`. 기타 북마크로 간 `[검증] g1`도 함께 지워진다.
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N24 suggestForNew: 새 북마크의 추천 폴더 · P2
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: classify.js · 팀원 B
- 관련 요구사항: F10-04, F10-07
- 안전 등급: 읽기만
- 사전 조건: 2장 실행. 사전 조건으로 C-N17이 통과해야 한다.
- 붙여 넣을 코드:
  ```js
  // C-N24
  await (async () => {
    T.begin("C-N24");
    const c = await T.cats();
    const news = [T.fakeBm("n1", "자료구조 강의", "https://www.youtube.com/watch?v=a"), T.fakeBm("n2", "zz", "https://zz-unknown.example/"), T.fakeBm("n3", "물건", "https://www.coupang.com/vp/1")];
    // 현재 폴더: 크롬 폴더 노드처럼 { id, title }
    const folders = [{ id: "f-video", title: "영상" }, { id: "f-dev", title: "개발" }];
    const r = T.classify.suggestForNew(news, folders, c);
    const of = (id) => (r || []).find((x) => x.bookmarkId === id);
    T.expect("새 북마크마다 하나씩 [{ bookmarkId, folderId }]", Array.isArray(r) && r.length === 3, r);
    T.expect("F10-04 분류된 카테고리(영상)와 이름이 같은 폴더를 추천", of("n1")?.folderId === "f-video", of("n1"));
    T.expect("F10-07 분류되지 않았으면 folderId null(그대로 두기)", of("n2") && of("n2").folderId === null, of("n2"));
    T.expect("F10-07 그 카테고리(쇼핑)의 폴더가 없으면 null", of("n3") && of("n3").folderId === null, of("n3"));
    T.expect("새 폴더 제안은 하지 않는다(출력은 bookmarkId, folderId뿐)", (r || []).every((x) => T.same(Object.keys(x).sort(), ["bookmarkId", "folderId"])), r);
    T.expect("새 북마크가 없으면 빈 배열", T.same(T.classify.suggestForNew([], folders, c), []));
  })();
  ```
- 기대 결과: 새 북마크마다 분류해, 분류된 카테고리와 이름이 같은 폴더를 추천한다. 분류되지 않았거나 같은 이름의 폴더가 없으면 `folderId`는 `null`(그대로 두기)이다. (N24 v14, F10-07)
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N25 lastOpened: 마지막으로 연 시각 · P1
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: forgotten.js · 팀원 B
- 관련 요구사항: F04-03, F04-12
- 안전 등급: 읽기만
- 사전 조건: 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N25
  await (async () => {
    T.begin("C-N25");
    const now = Date.now(), d = T.day;
    const st = (lo) => ({ ...T.emptyStored(), lastOpenedByUs: lo });
    const b = T.fakeBm("b1", "가", "https://a.example/", { dateAdded: now - 100 * d });
    let r = T.forgotten.lastOpened(b, st({}));
    T.expect("F04-12 둘 다 없으면 dateAdded, source added", r?.time === b.dateAdded && r?.source === "added", r);
    r = T.forgotten.lastOpened({ ...b, dateLastUsed: now - 10 * d }, st({ b1: now - 20 * d }));
    T.expect("F04-03 dateLastUsed가 더 최근이면 source chrome", r?.time === now - 10 * d && r?.source === "chrome", r);
    r = T.forgotten.lastOpened({ ...b, dateLastUsed: now - 30 * d }, st({ b1: now - 2 * d }));
    T.expect("F04-03 lastOpenedByUs가 더 최근이면 source us", r?.time === now - 2 * d && r?.source === "us", r);
    r = T.forgotten.lastOpened(b, st({ b1: now - 3 * d }));
    T.expect("lastOpenedByUs만 있으면 us", r?.time === now - 3 * d && r?.source === "us", r);
    r = T.forgotten.lastOpened({ ...b, dateLastUsed: now - 4 * d }, st({}));
    T.expect("dateLastUsed만 있으면 chrome", r?.time === now - 4 * d && r?.source === "chrome", r);
    T.record("두 값이 같을 때의 source(명세에 없다)", T.forgotten.lastOpened({ ...b, dateLastUsed: now - d }, st({ b1: now - d }))?.source);
  })();
  ```
- 기대 결과: 마지막으로 연 시각은 `lastOpenedByUs`와 `dateLastUsed` 중 더 최근 값이고, 둘 다 없으면 `dateAdded`다. 출처는 `"us"` · `"chrome"` · `"added"`다. (N25, F04-03)
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N26 pickForgotten: 잊고 있던 북마크 고르기 · P1
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: forgotten.js · 팀원 B
- 관련 요구사항: F04-01, F04-02, F04-05, F04-11
- 안전 등급: 읽기만
- 사전 조건: 2장 실행. 사전 조건으로 C-N25가 통과해야 한다.
- 붙여 넣을 코드:
  ```js
  // C-N26
  await (async () => {
    T.begin("C-N26");
    const now = Date.UTC(2026, 9, 28), d = T.day;
    const bm = (id, days, extra = {}) => T.fakeBm(id, id, `https://${id}.example/`, { dateAdded: now - days * d, ...extra });
    const list = [
      bm("a30", 30),                                      // 딱 30일: 후보
      bm("b29", 29.9),                                    // 30일이 안 됨
      bm("c400", 400),
      bm("dUs", 60),                                      // 우리 새 탭에서 10일 전에 열었다
      bm("eChrome", 60, { dateLastUsed: now - 40 * d }),  // 40일 전에 열었다: 후보, 시각은 40일 전
      bm("fPin", 100), bm("gDis", 100),
      T.fakeBm("hJs", "북마클릿", "javascript:void(0)", { dateAdded: now - 100 * d }),
      T.fakeBm("iChrome", "설정", "chrome://settings/", { dateAdded: now - 100 * d }),
      bm("jFolder", 90, { parentId: "999" }),            // 폴더 안의 북마크
    ];
    const stored = { ...T.emptyStored(), pinned: ["fPin"], dismissed: { gDis: now - d }, lastOpenedByUs: { dUs: now - 10 * d } };
    const ids = (T.forgotten.pickForgotten(list, stored, now) || []).map((b) => b.id);
    T.expect("F04-01 30일 이상 안 연 북마크를 고르고, 오래 안 연 순으로 정렬", T.same(ids, ["c400", "jFolder", "eChrome", "a30"]), ids);
    T.expect("F04-02 7일·30일이 안 된 북마크는 빠진다", !ids.includes("b29"));
    T.expect("F04-03 우리 새 탭에서 최근에 연 북마크는 빠진다", !ids.includes("dUs"));
    T.expect("F04-02 고정·이제 안 봐도 됨·javascript:·chrome://은 빠진다", !["fPin", "gDis", "hJs", "iChrome"].some((x) => ids.includes(x)), ids);
    T.expect("F04-01 위치(폴더 안)와 관계없이 고른다", ids.includes("jFolder"));
    const many = Array.from({ length: 10 }, (_, i) => bm("m" + i, 40 + i));
    const r = T.forgotten.pickForgotten(many, T.emptyStored(), now) || [];
    T.record("후보가 10개일 때 돌려준 개수(화면은 앞의 8개만 표시. 함수가 몇 개를 돌려줄지는 명세에 없다)", r.length);
    T.expect("F04-11 후보가 없으면 빈 배열", T.same(T.forgotten.pickForgotten([bm("x", 1)], T.emptyStored(), now), []));
    T.expect("빈 입력이면 빈 배열", T.same(T.forgotten.pickForgotten([], T.emptyStored(), now), []));
    T.expect("같은 입력은 같은 결과", T.same(ids, (T.forgotten.pickForgotten(list, stored, now) || []).map((b) => b.id)));
  })();
  ```
- 기대 결과: 마지막으로 연 지 30일 이상 지난 북마크를 위치와 관계없이 고르고, 오래 안 연 순으로 돌려준다. 고정된 북마크, "이제 안 봐도 됨"을 누른 북마크, `javascript:`·`chrome://` 주소는 뺀다. (N26, F04-01, F04-02)
- 판단: "30일 이상"이므로 딱 30일은 후보, 29.9일은 아니다.
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N27 searchBookmarks: 북마크 검색 · P2
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: search.js · 팀원 D
- 관련 요구사항: F14-01, F14-02, F14-05
- 안전 등급: 읽기만
- 사전 조건: 2장 실행. 뒤의 두 줄은 `sample-100`과 C-N01 통과가 필요하다.
- 붙여 넣을 코드:
  ```js
  // C-N27
  await (async () => {
    T.begin("C-N27");
    const bms = [T.fakeBm("1", "GitHub 저장소", "https://github.com/a"), T.fakeBm("2", "노션", "https://www.notion.so/GITLAB-memo"), T.fakeBm("3", "쿠팡", "https://www.coupang.com/")];
    const ids = (q) => (T.search.searchBookmarks(q, bms) || []).map((b) => b.id);
    T.expect("F14-01 제목 부분 일치, 대소문자 무시(git → GitHub)", ids("git").includes("1"), ids("git"));
    T.expect("F14-01 주소 부분 일치(git → notion.so/GITLAB)", ids("git").includes("2"), ids("git"));
    T.expect("일치하지 않는 것은 없다", !ids("git").includes("3"), ids("git"));
    T.expect("한글 부분 일치", T.same(ids("쿠"), ["3"]), ids("쿠"));
    T.expect("F14-05 일치하는 것이 없으면 빈 배열", T.same(ids("zzzz"), []), ids("zzzz"));
    T.expect("빈 입력이면 빈 배열", T.same(ids(""), []), ids(""));
    T.record("공백만 넣었을 때(명세는 빈 입력만 정한다)", ids("   "));
    const tree = await T.tree();
    const r = T.search.searchBookmarks("github", tree?.bookmarks || []) || [];
    T.expect("F14-02 폴더 안 북마크도 찾는다(sample-100: 졸업프로젝트의 GitHub)", r.some((b) => b.url?.includes("github.com/example-user/bookmark-extension")), r.map((b) => b.title));
  })();
  ```
- 기대 결과: 제목 또는 주소에 입력 글자가 들어 있는 북마크를 영문 대소문자 구분 없이 돌려준다. 폴더 안 북마크도 찾는다. 빈 입력이면 빈 배열이다. (N27, F14-01, F14-02)
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N28 isUrlLike: 주소인지 판별 · P1
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: search.js · 팀원 D
- 관련 요구사항: F11-02
- 안전 등급: 읽기만
- 사전 조건: 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N28
  await (async () => {
    T.begin("C-N28");
    const cases = [["https://github.com", true], ["http://a", true], ["naver.com", true], ["node.js", true], ["오늘 날씨", false], ["a b.com", false], ["localhost", false], ["", false], ["   ", false]];
    for (const [text, want] of cases) T.expect(`isUrlLike(${JSON.stringify(text)}) === ${want}`, T.search.isUrlLike(text) === want, T.search.isUrlLike(text));
  })();
  ```
- 기대 결과: `http://`·`https://`로 시작하거나, 띄어쓰기 없이 점(.)을 포함하면 `true`다. `node.js`처럼 점이 든 검색어도 `true`인 것은 명세의 알려진 한계다. (N28, F11-02)
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N29 runWebSearch: 웹 검색 · P1
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: search.js · 팀원 D
- 관련 요구사항: F11-01, F11-02, F11-05
- 안전 등급: 읽기만 (손으로 확인하는 부분은 지금 탭이 다른 페이지로 바뀐다)
- 사전 조건: 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N29
  await (async () => {
    T.begin("C-N29");
    const href = location.href;
    let threw = false;
    try { await T.search.runWebSearch(""); await T.search.runWebSearch("   "); } catch (e) { threw = true; }
    await T.wait(800);
    T.expect("F11-05 빈 입력·공백뿐이면 아무 동작도 하지 않는다(오류 없음, 페이지 그대로)", !threw && location.href === href, { threw, href: location.href });
  })();
  ```
- 손으로 확인 (탭이 바뀌므로 새 탭을 하나 더 열어 그 콘솔에서 한다. 2장은 필요 없다):
  1. `await (await import('/js/search.js')).runWebSearch('바로링크 검증')` → **지금 탭**에 크롬 기본 검색엔진(`chrome://settings/search`에서 정한 것)의 검색 결과가 열린다. (F11-01)
  2. 새 탭을 다시 열고 `await (await import('/js/search.js')).runWebSearch('example.com')` → 검색하지 않고 example.com으로 간다. (F11-02)
- 기대 결과: 주소면 그 주소로 가고, 아니면 기본 검색엔진으로 검색한다. 빈 입력이면 아무것도 하지 않는다. (N29)
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N30 renderAll: 새 탭 화면 전체 그리기 · P1
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: render.js · 팀원 D
- 관련 요구사항: F01-01, F01-02, F01-05, F02-01, F03-02, F04-04, F08-02, F12-01, F12-02
- 안전 등급: 화면 (북마크와 저장 항목은 바꾸지 않는다)
- 사전 조건: `sample-100`, 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N30
  await (async () => {
    T.begin("C-N30");
    const text = (sel) => document.querySelector(sel)?.textContent.trim() ?? "";
    T.render.renderAll({ roots: { bar: null, other: null, mobile: null }, bookmarks: [], folders: [] }, T.emptyStored());
    T.expect("F01-05 북마크가 없으면 안내 문구", document.body.textContent.includes("아직 북마크가 없어요. 주소창의 별 버튼으로 저장해 보세요"));
    const tree = await T.tree(), stored = await T.store.load();
    T.render.renderAll(tree, stored);
    T.render.renderAll(tree, stored);   // 두 번 불러도 결과가 같아야 한다
    T.expect("#header에 그렸다", text("#header") !== "", text("#header"));
    T.expect("#all-bookmarks에 그렸다", text("#all-bookmarks") !== "", text("#all-bookmarks").slice(0, 80));
    T.expect("F03-02 북마크바·기타 북마크 자체는 앱 폴더로 보이지 않는다", !text("#folder-list").includes("북마크바"), text("#folder-list").slice(0, 80));
    T.expect("F11-03 웹 검색창에 자동 포커스를 주지 않는다", document.activeElement === document.body || document.activeElement === null, document.activeElement);
  })();
  ```
- 눈으로 확인:
  - 위에서부터 헤더(내 폴더·모든 북마크 이동 버튼, [정리하기], 정리 기록 버튼), 날짜, 웹 검색창, 앱 폴더(맨 앞에 잊고 있던 북마크), 모든 북마크(북마크 검색창 포함) 순서다. 고정됨(독)은 화면 아래에 맨 아래에서 72px 이상 띄워 고정돼 있다. (F12-01)
  - 앱은 색 타일 위의 파비콘과 제목으로 보인다. 파비콘이 없으면 제목 첫 글자다. (F02-01, F02-03)
  - 표시한 북마크 개수가 크롬 북마크 관리자의 개수와 같다. (F01-01)
  - 다른 창의 `chrome://bookmarks`에서 북마크를 하나 추가·이름 변경·삭제·이동하면, 새로고침하지 않아도 새 탭에 반영된다. (F01-02)
  - 창 너비를 480px·768px·1280px로 바꾸면 한 줄의 앱 개수가 바뀌고 가로 스크롤이 생기지 않는다. (F12-02)
  - 빈 북마크 안내를 본 뒤에는 새 탭을 새로고침해 원래 화면으로 돌린다.
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N31 showFirstCard / showOrganizeDialog / showPinPicker: 정리 카드와 정리 창 · P1·P2
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: view/cards.js · 팀원 D
- 관련 요구사항: F06-01, F06-03, F06-05, F06-06, F06-07, F09-01, F12-03, F12-04
- 안전 등급: 화면. **카드와 창의 [정리하기]는 누르지 않는다.** 가짜 계획이라도 폴더를 만든다.
- 사전 조건: 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N31
  await (async () => {
    T.begin("C-N31");
    const c = await T.cats();
    const vid = T.ofCat(c, 1, 4), dev = T.ofCat(c, 5, 3);
    const kw = T.fakeBm("kw", "2026 하반기 신입 채용", "https://careers.example.com/");
    const plan = { type: "folders", folders: [{ name: "영상", items: vid, reasons: [] }, { name: "취업", items: [kw, ...T.ofCat(c, 6, 2)], reasons: [] }, { name: "개발", items: dev, reasons: [] }], rest: T.unknown(5) };
    const actions = { showResultNotice: (e) => console.log("actions.showResultNotice", e), openFolder: (id) => console.log("actions.openFolder", id), showContextMenu: (b) => console.log("actions.showContextMenu", b) };
    T.cards.showFirstCard(plan, actions);
    const card = document.querySelector("#organize-suggestion")?.textContent ?? "";
    T.expect("F06-01 #organize-suggestion에 첫 정리 카드", card.trim() !== "", card);
    T.expect("F06-01 폴더 이름이 보인다", ["영상", "취업", "개발"].every((n) => card.includes(n)), card);
    T.expect("F06-01 \"나머지 5개는 그대로\"", card.includes("나머지 5개는 그대로"), card);
    T.expect("F06-01 [정리하기]·[자세히 보기]·[나중에] 버튼", ["정리하기", "자세히 보기", "나중에"].every((n) => card.includes(n)), card);
    T.cards.showFirstCard(plan, actions);
    T.expect("두 번 불러도 카드는 하나", (document.querySelector("#organize-suggestion")?.textContent ?? "") === card);
    T.cards.showOrganizeDialog(plan, actions);
    const dlg = document.querySelector("#dialogs dialog[open]");
    T.expect("F06-03 정리 창이 #dialogs의 <dialog>로 열린다", !!dlg, document.querySelector("#dialogs")?.innerHTML.slice(0, 200));
    T.expect("F06-03 들어갈 북마크 목록이 보인다", !!dlg && dlg.textContent.includes(kw.title), dlg?.textContent.slice(0, 200));
    T.expect("F06-05 제목 키워드로 분류된 북마크에 \"확인 필요\"", !!dlg && dlg.textContent.includes("확인 필요"), dlg?.textContent.slice(0, 200));
  })();
  ```
- 눈으로 확인:
  - 카드 보조 문구가 "직접 만든 폴더와 북마크바에서 요즘 쓰는 북마크는 그대로 둬요"다. (F06-01 비고)
  - 정리 창이 메인 화면 위에 어둡게 겹친 팝업이다. Esc나 바깥 클릭으로 닫힌다. (F12-03, F12-04)
  - 정리 창에 폴더별 분류 근거가 보인다. (F06-03)
  - 카드의 [나중에]를 누르면 카드가 닫히고 `(await T.stored()).state?.firstCard`가 `"later"`다. 헤더의 [정리하기]를 누르면 같은 카드가 다시 열린다. (F06-06, N38)
  - (P2) `T.cards.showFirstCard({ type: "pin", reason: "" }, actions)` → "북마크들이 서로 달라서 아직 묶을 폴더가 없어요. 대신 자주 쓰는 북마크 5개를 고정할까요?"와 [고정하기]·[고르기]·[나중에]가 보인다. (F06-07, F09-01)
  - (P2) `T.cards.showPinPicker()` → "고정할 북마크 고르기" 창이 열린다(F09-05, F09-06). 이 함수의 입력은 아직 정하지 않았다(`docs/file-structure.md` 12번).
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N32 onCreated 처리: 새 북마크 기록 · P2
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: background.js · 팀원 B
- 관련 요구사항: F10-01, F10-09, F01-07
- 안전 등급: ⚠ 크롬 북마크를 바꿈 (임시 북마크)
- 사전 조건: `sample-100`을 가져온 프로필, 2장 실행. 함수를 직접 부르지 않고(서비스 워커에서는 `import()`가 막힘), 새 탭 콘솔에서 북마크를 만든 뒤 저장 항목을 본다.
- 붙여 넣을 코드:
  ```js
  // C-N32
  await (async () => {
    T.begin("C-N32");
    T.before = await T.snap();
    const nb0 = (await T.stored()).newBookmarks || [];
    const sample = (await T.flat()).filter((b) => !b.title.startsWith(T.prefix)).map((b) => b.id);
    T.expect("F01-07 가져오기로 들어온 샘플 북마크는 newBookmarks에 없다", !sample.some((id) => nb0.includes(id)), nb0.filter((id) => sample.includes(id)).length);
    const onBar = await T.mk("새 북마크(북마크바)");
    const raw = await T.rawRoots();
    const onOther = await T.mk("새 북마크(기타)", undefined, raw.other.id);
    const user = await T.findFolder("졸업프로젝트");
    const inUser = user ? await T.mk("새 북마크(사용자 폴더)", undefined, user.id) : null;
    const folder = await T.mkFolder("새 폴더");
    await T.wait(1500);
    const nb = (await T.stored()).newBookmarks || [];
    T.expect("F10-01 북마크바 바로 아래에 저장하면 newBookmarks에 추가", nb.includes(onBar.id), nb);
    T.expect("F10-01 기타 북마크 바로 아래도 추가", nb.includes(onOther.id), nb);
    T.expect("F10-09 사용자 폴더 안에 바로 저장하면 추가하지 않는다", inUser && !nb.includes(inUser.id), { inUser, nb });
    T.expect("폴더는 추가하지 않는다", !nb.includes(folder.id), nb);
  })();
  ```
- 워커를 멈춘 상태에서 한 번 더 (F07-06 "새 탭이 닫혀 있어도"):
  1. 새 탭을 하나만 남기고, `chrome://serviceworker-internals`에서 `chrome-extension://<ID>/` 항목의 **Stop**을 누른다. "Running Status"가 STOPPED인지 본다.
  2. 다른 창에서 `chrome://bookmarks`를 열고 북마크바에 북마크를 하나 추가한다(오른쪽 위 점 3개 → 새 북마크 추가, 제목 `[검증] 워커 멈춤`).
  3. 1~2초 뒤 새 탭 콘솔에서 아래를 실행한다. 기대: `true`.
     ```js
     ((await T.stored()).newBookmarks ?? []).includes((await T.findTitle("[검증] 워커 멈춤"))?.id)
     ```
- 기대 결과: 북마크바·기타·모바일 바로 아래에 새로 저장된 북마크만 `newBookmarks`에 들어간다. 폴더이거나 사용자 폴더 안에 저장된 것, 가져오기 중에 들어온 것은 넣지 않는다. 워커가 멈춰 있어도 알림에 깨어나 기록한다. (N32, F10-01, F10-09, F01-07)
- 되돌리는 법: `await T.cleanup()` (지우면 C-N34대로 `newBookmarks`에서도 빠져야 한다)
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N33 onMoved 처리: 직접 옮김 기록 · P1·P2
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: background.js · 팀원 B
- 관련 요구사항: F07-05, F07-06, F10-08, F15-05
- 안전 등급: ⚠ 크롬 북마크를 바꿈 (임시 북마크) · 저장 항목을 바꿈(`pendingMoves`)
- 사전 조건: 2장 실행. 사전 조건으로 C-N14가 통과해야 한다(우리 정리의 이동인지는 `pendingMoves`로 판별).
- 붙여 넣을 코드:
  ```js
  // C-N33
  await (async () => {
    T.begin("C-N33");
    T.before = await T.snap();
    const bar = await T.bar();
    const f = await T.mkFolder("옮겨 갈 폴더");
    const a = await T.mk("직접 옮길 새 북마크");
    const b = await T.mk("순서만 바꿀 북마크");
    const p = await T.mk("우리 정리가 옮길 북마크");
    const e = await T.mk("만료된 표시로 옮길 북마크");
    await T.wait(1500);
    await chrome.bookmarks.move(a.id, { parentId: f.id });
    await chrome.bookmarks.move(b.id, { parentId: bar.id, index: 0 });
    await T.store.setPending([{ id: p.id, toParentId: f.id }]);
    await chrome.bookmarks.move(p.id, { parentId: f.id });
    const pm = (await T.stored()).pendingMoves || {};
    await chrome.storage.local.set({ pendingMoves: { ...pm, [e.id]: { toParentId: f.id, at: Date.now() - 61000 } } });
    await chrome.bookmarks.move(e.id, { parentId: f.id });
    await T.wait(1500);
    const s = await T.stored();
    T.expect("F07-06 다른 폴더로 옮기면 manualMoves에 기록", a.id in (s.manualMoves || {}), s.manualMoves);
    T.expect("F10-08 새 북마크를 옮기면 newBookmarks에서 지운다", !(s.newBookmarks || []).includes(a.id), s.newBookmarks);
    T.expect("순서만 바뀐 이동은 기록하지 않는다(C10)", !(b.id in (s.manualMoves || {})), s.manualMoves);
    T.expect("F07-05 1분 안에 pendingMoves에 같은 목적지로 표시된 이동은 기록하지 않는다", !(p.id in (s.manualMoves || {})), s.manualMoves);
    T.expect("F07-05 1분이 지난 표시면 직접 옮김으로 기록", e.id in (s.manualMoves || {}), s.manualMoves);
  })();
  ```
- 워커를 멈춘 상태에서 한 번 더: C-N32의 1번처럼 워커를 Stop한 뒤 `chrome://bookmarks`에서 `[검증]` 북마크 하나를 다른 폴더로 끌어 옮긴다. 1~2초 뒤 `(await T.stored()).manualMoves`에 그 ID가 있다. (F07-06)
- 기대 결과: 폴더가 바뀐 이동이면 `newBookmarks`에서 지우고, 우리 정리의 이동(1분 안의 `pendingMoves`)이 아니면 `manualMoves`에 기록한다. 순서만 바뀐 이동은 기록하지 않는다. (N33, F07-05, F07-06, F10-08)
- 손으로 확인 (P2, F15-05): 우클릭 "폴더로 이동"에서 지금 들어 있는 폴더를 고르면 `manualMoves`에 기록되지 않는다. C-N41 이후에 본다.
- 되돌리는 법: `await T.cleanup()`
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N34 onRemoved 처리: 지워진 북마크 ID 정리 · P1
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: background.js · 팀원 B
- 관련 요구사항: F01-06
- 안전 등급: ⚠ 크롬 북마크를 바꿈 (임시 북마크) · 저장 항목을 바꿈
- 사전 조건: 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N34
  await (async () => {
    T.begin("C-N34");
    T.before = await T.snap();
    const one = await T.mk("지울 북마크");
    const f = await T.mkFolder("통째로 지울 폴더");
    const c1 = await T.mk("폴더 안 북마크", undefined, f.id);
    await T.wait(1500);
    // 서비스 워커가 쓰는 두 항목에 ID를 넣어 둔다 (확인용으로만 새 탭에서 쓴다)
    const s0 = await T.stored();
    await chrome.storage.local.set({ manualMoves: { ...(s0.manualMoves || {}), [one.id]: Date.now(), [c1.id]: Date.now() }, newBookmarks: [...new Set([...(s0.newBookmarks || []), one.id, c1.id])] });
    await chrome.bookmarks.remove(one.id);
    await chrome.bookmarks.removeTree(f.id);
    await T.wait(1500);
    const s = await T.stored();
    T.expect("F01-06 지운 북마크 ID가 manualMoves·newBookmarks에서 사라졌다", !(one.id in (s.manualMoves || {})) && !(s.newBookmarks || []).includes(one.id), s);
    T.expect("폴더를 통째로 지우면 안의 북마크 ID도 사라진다(node.children)", !(c1.id in (s.manualMoves || {})) && !(s.newBookmarks || []).includes(c1.id), s);
  })();
  ```
- 기대 결과: 지워진 북마크(폴더면 안의 북마크까지)의 ID를 서비스 워커가 쓰는 `manualMoves`·`newBookmarks`에서 바로 지운다. 새 탭이 쓰는 항목은 C-N16(`cleanupMissing`)이 맡는다. (N34, F01-06)
- 되돌리는 법: `await T.cleanup()`
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N35 suggestSubfolders: 세부 폴더 제안 · P3
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: topic.js · 팀원 C
- 관련 요구사항: F16-01, F16-03
- 안전 등급: 읽기만
- 사전 조건: 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N35
  await (async () => {
    T.begin("C-N35");
    const filler = Array.from({ length: 15 }, (_, i) => T.fakeBm("f" + i, `기타 글 ${i}번`, `https://site${i}.example/`));
    const react = [T.fakeBm("r1", "리액트 훅 정리", "https://a.tistory.com/1"), T.fakeBm("r2", "리액트 상태 관리", "https://a.tistory.com/2"), T.fakeBm("r3", "리액트 라우터", "https://velog.io/@b/3")];
    const py = [T.fakeBm("p1", "파이썬 기초", "https://c.tistory.com/1"), T.fakeBm("p2", "파이썬 문법", "https://c.tistory.com/2"), T.fakeBm("p3", "파이썬 예제", "https://c.tistory.com/3")];
    const r = T.topic.suggestSubfolders([...filler, ...react, ...py]) || [];
    const hit = r.find((x) => x.word === "리액트");
    T.expect("F16-01 북마크 3개 이상·사이트 2곳 이상에 나온 단어로 제안", hit && T.same(hit.items.map((b) => b.id).sort(), ["r1", "r2", "r3"]), r);
    T.expect("F16-01 한 사이트에만 나온 단어(파이썬)는 제안하지 않는다", !r.some((x) => x.word === "파이썬"), r);
    T.expect("F16-03 맞는 단어가 없으면 빈 배열", T.same(T.topic.suggestSubfolders(filler), []), T.topic.suggestSubfolders(filler));
    T.record("북마크가 20개 이하일 때(\"20개를 넘으면\"을 이 함수가 볼지, 부르는 쪽이 볼지 명세에 없다)", T.topic.suggestSubfolders([...react, ...py]));
  })();
  ```
- 기대 결과: 제목에 반복되는 주제 단어 중 북마크 3개 이상·사이트 2곳 이상에 나타나는 단어로 `[{ word, items }]`를 돌려준다. 없으면 빈 배열이다. (N35, F16-01, F16-03)
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N36 initDnd: 드래그 이동 · P3
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: dnd.js · 팀원 D
- 관련 요구사항: F17-01, F17-02, F17-03
- 안전 등급: 화면 · ⚠ 크롬 북마크를 바꿈
- 사전 조건: `sample-100`, 새 탭 화면이 그려진 상태. 보통은 `render.js`가 부르므로 콘솔에서 따로 부를 필요가 없다. 부르지 않는다면: `T.dnd.initDnd(document.querySelector("#all-bookmarks"))`
- 붙여 넣을 코드:
  ```js
  // C-N36
  await (async () => {
    T.begin("C-N36");
    T.before = await T.snap();
    console.log("화면에서 아래 '눈으로 확인'대로 끌어 본 뒤, T.diff(T.before, await T.snap())로 바뀐 줄을 본다");
  })();
  ```
- 눈으로 확인:
  - 앱의 점 6개 손잡이로 앱을 끌어 앱 폴더 위에 놓으면 북마크가 그 폴더로 옮겨지고, 1~2초 뒤 `(await T.stored()).manualMoves`에 그 ID가 있다. (F17-01)
  - 앱이나 폴더를 끌어 순서를 바꾸면 `chrome://bookmarks`에도 같은 순서로 보인다. 같은 폴더 안에서 뒤쪽으로 옮겨도 놓은 자리에 정확히 놓인다(한 칸 앞에 놓이지 않는다). (F17-02, C06)
  - 놓을 수 없는 곳(검색창, 헤더)에 놓으면 앱이 원래 자리로 돌아가고 `T.diff`가 "(차이 없음)"이다. (F17-03)
- 되돌리는 법: 옮긴 북마크를 `chrome://bookmarks`에서 원래 자리로 끌어 놓는다. `T.before`와 비교한다.
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N37 suggestNewFolders: 새 폴더 제안 · P2
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: plan.js · 팀원 C
- 관련 요구사항: F10-06
- 안전 등급: 읽기만 (상한 확인에서 임시 폴더 하나를 만들었다 지운다)
- 사전 조건: `sample-100`, 2장 실행. 사전 조건으로 C-N19, C-N20이 통과해야 한다.
- 붙여 넣을 코드:
  ```js
  // C-N37
  await (async () => {
    T.begin("C-N37");
    const c = await T.cats();
    const names = c.categories.map((x) => x.name);
    const tree = await T.tree();
    const r = T.plan.suggestNewFolders(tree, T.emptyStored(), c) || [];
    T.expect("F10-06 우리 폴더가 없고 폴더 밖에 같은 카테고리가 3개 이상이면 제안한다", r.length > 0, r);
    T.expect("제안마다 북마크 3개 이상", r.every((x) => x.items?.length >= 3), r.map((x) => [x.name, x.items?.length]));
    T.expect("제안 이름은 카테고리 이름이고 \"기타\"가 없다", r.every((x) => names.includes(x.name) && x.name !== "기타"), r.map((x) => x.name));
    T.expect("정리 대상 90개면 상한 5개를 넘지 않는다", r.length <= 5, r.length);
    const existing = new Set((tree?.folders || []).map((f) => f.title));
    T.expect("같은 이름의 폴더가 이미 있으면 제안하지 않는다", r.every((x) => !existing.has(x.name)), r.map((x) => x.name));
    // 우리가 만든 폴더(history.createdFolderIds 중 남아 있는 것)가 상한(5개)에 찼으면 빈 배열
    const tmp = await T.mkFolder("상한 확인용");
    const ours = [...["졸업프로젝트", "알바·취준", "자취템", "가져온 북마크"].map((n) => tree?.folders?.find((f) => f.title === n)?.id), tmp.id].filter(Boolean);
    const stored = { ...T.emptyStored(), history: [{ id: "검증-h", at: Date.now(), type: "first", createdFolderIds: ours, moves: [], fromOrder: {}, skipped: 0 }] };
    const full = T.plan.suggestNewFolders(await T.tree(), stored, c);
    T.expect("상한에 찼으면 빈 배열", ours.length === 5 && T.same(full, []), { ours: ours.length, full });
    await chrome.bookmarks.remove(tmp.id);
  })();
  ```
- 기대 결과: 폴더 밖에 같은 카테고리가 3개 이상 모였고, 우리가 만든 폴더 수(`history`의 `createdFolderIds` 중 남아 있는 것)가 상한보다 적을 때만 `[{ name, items }]`로 제안한다. 같은 이름의 폴더가 이미 있으면 제안하지 않고, 상한에 찼으면 빈 배열이다. (N37, F10-06)
- 판단: 상한은 "폴더 밖 정리 대상 + 우리 폴더 안 북마크"의 수로 정한다(F10-06 비고). 샘플 폴더를 우리가 만든 폴더로 꾸며 넣었으므로, 그 안의 북마크 수가 상한 계산에 더해져도 90 + 10 = 100개로 상한이 6개가 될 수 있다. 이때 이 줄이 실패하면 담당과 상한 계산을 함께 본다.
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N38 setFirstCard: 첫 정리 카드 상태 · P1
- 구현 상태: 구현됨 (main `049b9be`)
- 파일·담당: store.js · 팀원 A
- 관련 요구사항: F06-01, F06-06
- 안전 등급: 저장 항목을 바꿈 (끝에 되돌림)
- 사전 조건: 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N38
  await (async () => {
    T.begin("C-N38");
    const saved = await T.saveStore();
    try {
      for (const v of ["later", "done", "pending"]) {
        await T.store.setFirstCard(v);
        T.expect(`state.firstCard === "${v}"`, (await T.stored()).state?.firstCard === v, (await T.stored()).state);
      }
      T.record("정해진 세 값이 아닌 값을 넣었을 때(명세에 없다)", await T.throws(() => T.store.setFirstCard("zzz")) ? "오류" : (await T.stored()).state);
    } finally {
      await T.restoreStore(saved);
    }
  })();
  ```
- 기대 결과: `state`에 `{ firstCard: "pending" | "done" | "later" }`를 저장한다. (N38)
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N39 markHandledNew: '그대로 두기' 기록 · P2
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: store.js · 팀원 A
- 관련 요구사항: F10-05
- 안전 등급: 저장 항목을 바꿈 (끝에 되돌림)
- 사전 조건: 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N39
  await (async () => {
    T.begin("C-N39");
    const saved = await T.saveStore();
    try {
      await chrome.storage.local.remove("handledNew");
      await T.store.markHandledNew(["검증-a", "검증-b"]);
      T.expect("handledNew에 ID 배열을 더한다", T.same(((await T.stored()).handledNew || []).slice().sort(), ["검증-a", "검증-b"]), (await T.stored()).handledNew);
      await T.store.markHandledNew(["검증-b", "검증-c"]);
      const h = (await T.stored()).handledNew || [];
      T.expect("앞의 기록을 지우지 않고 더한다", ["검증-a", "검증-b", "검증-c"].every((x) => h.includes(x)), h);
      T.record("같은 ID를 두 번 넣었을 때 중복 여부(명세에 없다)", h.filter((x) => x === "검증-b").length);
    } finally {
      await T.restoreStore(saved);
    }
  })();
  ```
- 기대 결과: '그대로 두기'로 둔 새 북마크 ID를 `handledNew`에 기록한다. "새로" 표시와 버튼 개수는 `newBookmarks`에서 `handledNew`를 뺀 것이다. (N39, '참고_저장 항목')
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N40 addNew / removeNew / purgeWorkerKeys: 서비스 워커의 저장 항목 · P1·P2
- 구현 상태: 구현됨 (main `049b9be`)
- 파일·담당: store.js · 팀원 A
- 관련 요구사항: F10-01, F10-08, F01-06
- 안전 등급: ⚠ 크롬 북마크를 바꿈 (임시 북마크)
- 사전 조건: 2장 실행. 서비스 워커만 부르는 함수라(`store.js` 주석) 새 탭에서 부르면 "서비스 워커만 쓴다" 오류가 난다. 그래서 함수를 직접 부르지 않고, C-N32~C-N34처럼 새 탭 콘솔에서 북마크를 만들고·옮기고·지운 뒤 `newBookmarks`·`manualMoves`를 본다. `background.js`의 N32~N34가 구현돼 있어야 의미가 있다.
- 붙여 넣을 코드:
  ```js
  // C-N40
  await (async () => {
    T.begin("C-N40");
    T.before = await T.snap();
    const f = await T.mkFolder("워커 항목 폴더");
    const n1 = await T.mk("새 북마크1");     // 옮긴다 → removeNew
    const n2 = await T.mk("새 북마크2");     // 지운다 → purgeWorkerKeys(newBookmarks)
    const keep = await T.mk("남길 새 북마크");
    await T.wait(1500);
    let nb = (await T.stored()).newBookmarks || [];
    T.expect("addNew: 북마크바에 만든 북마크가 newBookmarks에 들어간다", [n1, n2, keep].every((b) => nb.includes(b.id)), nb);
    T.expect("addNew: 같은 ID는 한 번만 들어간다", [n1, n2, keep].every((b) => nb.filter((id) => id === b.id).length === 1), nb);
    await chrome.bookmarks.move(n1.id, { parentId: f.id });
    await T.wait(1500);
    let s = await T.stored();
    T.expect("removeNew: 다른 폴더로 옮긴 북마크는 newBookmarks에서 빠진다", !(s.newBookmarks || []).includes(n1.id), s.newBookmarks);
    T.expect("(옮긴 북마크는 manualMoves에 들어간다)", n1.id in (s.manualMoves || {}), s.manualMoves);
    const m2 = await T.mk("직접 옮겨 남길 북마크", undefined, f.id);
    await T.wait(1500);
    await chrome.bookmarks.move(m2.id, { parentId: (await T.bar()).id });
    await T.wait(1500);
    await chrome.bookmarks.remove(n1.id);
    await chrome.bookmarks.remove(n2.id);
    await T.wait(1500);
    s = await T.stored();
    T.expect("purgeWorkerKeys: 지운 ID가 manualMoves에서 빠진다", !(n1.id in (s.manualMoves || {})), s.manualMoves);
    T.expect("purgeWorkerKeys: 지운 ID가 newBookmarks에서 빠진다", !(s.newBookmarks || []).includes(n2.id), s.newBookmarks);
    T.expect("purgeWorkerKeys: 지우지 않은 ID는 그대로다", (s.newBookmarks || []).includes(keep.id) && m2.id in (s.manualMoves || {}), s);
  })();
  ```
- 되돌리는 법: `await T.cleanup()`
- 기대 결과: `addNew`·`removeNew`는 `newBookmarks`에 추가·제거하고, `purgeWorkerKeys`는 삭제된 북마크 ID를 서비스 워커가 쓰는 두 항목(`newBookmarks`, `manualMoves`)에서 지운다. (N40)
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N41 showFolders / openFolderPopup / showContextMenu: 내 폴더 줄, 폴더 팝업, 우클릭 메뉴 · P1·P2
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: view/folders.js · 팀원 C
- 관련 요구사항: F03-01~03, F03-08, F12-03, F12-04, F15-01, F15-04
- 안전 등급: 화면 (메뉴의 "폴더로 이동"과 폴더 만들기·이름 바꾸기·삭제는 크롬 북마크를 바꾼다. `[검증]` 북마크로만 해 본다)
- 사전 조건: `sample-100`, 2장 실행. 사전 조건으로 C-N01이 통과해야 한다.
- 붙여 넣을 코드:
  ```js
  // C-N41
  await (async () => {
    T.begin("C-N41");
    const tree = await T.tree();
    T.folders.showFolders(tree);
    T.folders.showFolders(tree);   // 두 번 불러도 같아야 한다
    const row = document.querySelector("#folder-list")?.textContent ?? "";
    T.expect("F03-01 사용자 폴더가 앱 폴더로 보인다", ["졸업프로젝트", "알바·취준", "가져온 북마크"].every((n) => row.includes(n)), row);
    T.expect("F03-02 북마크바·기타 북마크 자체는 앱 폴더가 아니다", !row.includes("북마크바") && !row.includes("기타 북마크"), row);
    T.expect("F03-01 개수가 보인다(졸업프로젝트 4)", row.includes("4"), row);
    const grad = await T.findFolder("졸업프로젝트");
    T.folders.openFolderPopup(grad.id);
    const pop = document.querySelector("#dialogs dialog[open]");
    T.expect("F03-03 팝업(<dialog>)이 열린다", !!pop, document.querySelector("#dialogs")?.innerHTML.slice(0, 200));
    T.expect("F03-03 그 폴더 안의 앱이 보인다", !!pop && (await T.kids(grad.id)).every((b) => pop.textContent.includes(b.title)), pop?.textContent.slice(0, 200));
    T.folders.showFolders(tree);
    T.expect("다시 그려도 열린 팝업은 닫히지 않는다", !!document.querySelector("#dialogs dialog[open]"));
  })();
  ```
- 눈으로 확인:
  - 앱 폴더마다 안에 든 앱의 미리보기 칸, 이름, 개수가 있다. (F03-01)
  - 팝업은 한 줄에 4개이고, 넘치면 팝업 안에서 스크롤된다. Esc나 바깥 클릭으로 닫힌다. (N41, F12-04)
  - (P2) "가져온 북마크" 팝업에서 `자취템`이 앱 폴더로 보이고, 누르면 같은 팝업 안에서 들어간다. 위쪽에 상위 폴더로 돌아가는 버튼이 있다. (F03-08)
  - (P2) 앱을 우클릭하면 브라우저 메뉴 대신 "새 탭에서 열기", "고정하기", "폴더로 이동"이 보인다. 독에 고정된 앱이면 "고정 해제"가 보인다. 콘솔에서 `T.folders.showContextMenu((await T.tree()).bookmarks[0])`로도 열 수 있다. (F15-01, F15-04)
  - (P2) 폴더 만들기·이름 바꾸기·삭제는 C-N02·C-N04·C-N05의 기대 결과와 같고, 빈 이름이면 "폴더 이름을 입력해 주세요"가 보인다. (F03-04~07)
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N42 showForgotten: 잊고 있던 북마크 폴더와 팝업 · P1
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: view/forgottenFolder.js · 팀원 B
- 관련 요구사항: F04-04, F04-05, F04-07, F04-09, F04-10, F04-11, F04-12
- 안전 등급: 화면 (팝업의 버튼은 저장 항목을 바꾸거나 페이지를 연다)
- 사전 조건: `sample-100`, 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N42
  await (async () => {
    T.begin("C-N42");
    const slot = () => document.querySelector("#forgotten-slot");
    const actions = { openFolder: (id) => console.log("actions.openFolder", id), showContextMenu: (b) => console.log("actions.showContextMenu", b) };
    T.forgottenFolder.showForgotten([], actions);
    T.expect("F04-11 후보가 없으면 폴더를 표시하지 않는다", (slot()?.textContent.trim() ?? "") === "", slot()?.innerHTML);
    const items = (await T.flat()).filter((b) => !b.title.startsWith(T.prefix)).slice(0, 10);   // 북마크 10개를 후보로 넣는다
    T.forgottenFolder.showForgotten(items, actions);
    T.forgottenFolder.showForgotten(items, actions);
    const t = slot()?.textContent ?? "";
    T.expect("F04-04 \"잊고 있던 북마크\" 폴더를 표시한다", t.includes("잊고 있던 북마크"), t);
    T.expect("F04-04 개수 배지는 최대 8", t.includes("8") && !t.includes("10"), t);
  })();
  ```
- 눈으로 확인:
  - 앱 폴더 줄 맨 앞에 있고, 다른 폴더와 구별되는 어두운 색 카드다. (F04-04)
  - 누르면 팝업에 최대 8개가 보이고, 각 앱에 "N개월 전 저장"과 "N개월 전에 열어 봄"이 있다. 연 기록이 없는 앱은 "연 기록 없음"이다. (F04-05, F04-12)
  - 아이콘이나 제목을 누르면 페이지가 열리고, `(await T.stored()).lastOpenedByUs`에 그 ID가 생긴다. (F04-07)
  - [이제 안 봐도 됨]을 누르면 `(await T.stored()).dismissed`에 그 ID가 생기고, [되돌리기]가 6초 동안 보인다. 누르면 다시 빠진다. (F04-09)
  - [어디 있는지 보기]를 누르면 콘솔에 `actions.openFolder <폴더 ID>`가 찍힌다. 실제 화면(`render.js`가 부른 경우)에서는 그 폴더의 팝업이 열린다. (F04-10)
  - (P2) 8개를 넘으면 "N개 더 있어요 · 모두 보기"가 보이고, [고정하기]를 누르면 독에 추가된다. (F04-05 비고, F04-08)
- 되돌리는 법: 저장 항목을 바꿨으면 1-6의 저장 항목 백업으로 되돌린다.
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N43 showResultNotice / showHistory: 정리 결과 안내와 정리 기록 화면 · P1·P2
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: view/history.js · 팀원 A
- 관련 요구사항: F07-03, F07-09, F13-01, F13-02, F13-09, F13-10
- 안전 등급: 화면 · 저장 항목을 바꿈 (끝에 되돌림). **가짜 기록의 [되돌리기]는 누르지 않는다.**
- 사전 조건: 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N43
  await (async () => {
    T.begin("C-N43");
    // 눈으로 확인하는 동안 되돌리지 않는다. 중간에 오류가 나도 되돌릴 수 있게 먼저 T에 둔다
    T.savedN43 = await T.saveStore();
    const now = Date.now();
    const mv = (i) => ({ bookmarkId: "b" + i, title: "가짜 북마크 " + i, fromParentId: "1", fromIndex: i, toParentId: "f1" });
    const entry = { id: "검증-h1", at: now, type: "first", createdFolderIds: ["f1", "f2"], moves: [0, 1, 2, 3, 4].map(mv), fromOrder: {}, skipped: 0 };
    T.history.showResultNotice(entry);
    const n = () => document.querySelector("#notice")?.textContent ?? "";
    T.expect("F07-03 \"폴더 2개를 만들고 북마크 5개를 넣었어요\"와 [되돌리기]", n().includes("폴더 2개를 만들고 북마크 5개를 넣었어요") && n().includes("되돌리기"), n());
    T.history.showResultNotice({ ...entry, skipped: 2 });
    T.record("F07-09 건너뛴 개수 2가 안내에 보이는지(문구는 명세에 없다)", n());
    await T.wait(12500);
    T.expect("F07-03 12초 뒤에는 안내가 사라진다", !n().includes("넣었어요"), n());
    await chrome.storage.local.set({ history: [] });
    T.history.showHistory();
    T.expect("F13-10 기록이 없으면 \"아직 정리한 기록이 없어요\"", document.body.textContent.includes("아직 정리한 기록이 없어요"));
    document.querySelectorAll("#dialogs dialog[open]").forEach((d) => d.close());
    await chrome.storage.local.set({ history: [{ ...entry, id: "검증-old", at: now - 3 * T.day, undoneAt: now - 2 * T.day }, { ...entry, id: "검증-new", at: now, type: "new" }] });
    T.history.showHistory();
    const dlg = document.querySelector("#dialogs dialog[open]");
    T.expect("F13-01 정리 기록 화면이 <dialog>로 열린다", !!dlg, document.querySelector("#dialogs")?.innerHTML.slice(0, 200));
    T.expect("F13-01 종류(첫 정리, 새 북마크 정리)가 보인다", !!dlg && dlg.textContent.includes("첫 정리") && dlg.textContent.includes("새 북마크 정리"), dlg?.textContent.slice(0, 200));
    T.expect("F13-09 이미 되돌린 내역은 \"되돌림\"", !!dlg && dlg.textContent.includes("되돌림"), dlg?.textContent.slice(0, 200));
    console.log("눈으로 확인을 마친 뒤 T.restoreStore(T.savedN43)로 저장 항목을 되돌린다");
  })();
  ```
- 눈으로 확인:
  - 정리 결과 안내는 `#notice`에 보이고 사용자가 닫을 수 있다. (F07-03)
  - 정리 기록 화면에서 내역이 최신순(새 북마크 정리 → 첫 정리)이고, 날짜·종류·이동 개수(5)가 보인다. (F13-01)
  - 내역 하나를 펼치면 북마크별로 "원래 위치 → 옮긴 폴더"가 보인다. (F13-02)
  - 되돌리지 않은 내역에는 [되돌리기]가, 되돌린 내역에는 "되돌림"이 보인다. (F13-09)
  - C-N23-예외처럼 원래 폴더가 없어 기타 북마크로 되돌렸으면 "원래 폴더가 없어 기타 북마크로 되돌렸어요"가 보인다. 실제 정리 기록의 [되돌리기]로 본다. (F13-07)
- 되돌리는 법: `await T.restoreStore(T.savedN43)`
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N44 appIcon: 앱 아이콘 · P1
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: ui.js · 팀원 D
- 관련 요구사항: F02-01, F02-03
- 안전 등급: 읽기만
- 사전 조건: 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N44
  await (async () => {
    T.begin("C-N44");
    const el = T.ui.appIcon({ title: "가나다", url: "https://no-favicon.invalid/" });
    T.expect("HTMLElement를 돌려준다", el instanceof HTMLElement, el);
    document.body.append(el);
    await T.wait(1500);   // 파비콘이 있는지 비동기로 확인하는 경우를 기다린다
    T.expect("F02-03 파비콘이 없으면 제목의 첫 글자", el.textContent.trim() === "가", el.outerHTML);
    T.record("기본 크기 56일 때 그려진 크기(px)", el.getBoundingClientRect().width);
    const big = T.ui.appIcon({ title: "B", url: "https://no-favicon.invalid/" }, 80);
    document.body.append(big);
    T.record("크기 80일 때 그려진 크기(px)", big.getBoundingClientRect().width);
    el.remove(); big.remove();
  })();
  ```
- 눈으로 확인: 새 탭 화면의 모든 앱 아이콘(모든 북마크, 폴더 팝업, 잊고 있던 북마크, 독)이 같은 모양(색 타일 위의 파비콘)이다. (F02-01, N44)
- 기대 결과: 색 타일 위에 파비콘을 올린 아이콘 요소를 돌려주고, 파비콘이 없으면 제목의 첫 글자를 넣는다. (N44, F02-03)
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N45 showToast: 짧은 안내 문구 · P1
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: ui.js · 팀원 D
- 관련 요구사항: F04-09, F08-06
- 안전 등급: 화면
- 사전 조건: 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N45
  await (async () => {
    T.begin("C-N45");
    const toast = () => document.querySelector("#toast")?.textContent ?? "";
    T.ui.showToast("검증 문구 하나");
    T.expect("#toast에 문구가 보인다", toast().includes("검증 문구 하나"), toast());
    await T.wait(2700);
    T.expect("기본 2.2초 뒤 사라진다", !toast().includes("검증 문구 하나"), toast());
    let clicked = false;
    T.ui.showToast("검증 문구 둘", { actionLabel: "되돌리기", onAction: () => { clicked = true; }, duration: 6000 });
    T.ui.showToast("검증 문구 셋", { actionLabel: "되돌리기", onAction: () => { clicked = true; }, duration: 6000 });
    T.expect("한 번에 하나만(새 문구가 이전 것을 바꾼다)", toast().includes("검증 문구 셋") && !toast().includes("검증 문구 둘"), toast());
    const btn = [...document.querySelectorAll("#toast button")].find((b) => b.textContent.includes("되돌리기"));
    T.expect("actionLabel이 있으면 버튼이 보인다", !!btn, document.querySelector("#toast")?.innerHTML);
    btn?.click();
    T.expect("버튼을 누르면 onAction을 부른다", clicked);
  })();
  ```
- 기대 결과: 문구를 `#toast`에 띄우고 `duration`(기본 2.2초)이 지나면 지운다. 한 번에 하나만 보이고, `actionLabel`이 있으면 버튼을 함께 보여 누르면 `onAction`을 부른다. (N45)
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

#### C-N46 icon: 선 아이콘 · P1
- 구현 상태: 뼈대(미구현) · 명세 기준으로 작성, 코드와 대조하지 못함
- 파일·담당: ui.js · 팀원 D
- 관련 요구사항: F12-01
- 안전 등급: 읽기만
- 사전 조건: 2장 실행
- 붙여 넣을 코드:
  ```js
  // C-N46
  await (async () => {
    T.begin("C-N46");
    const names = ["bookmark", "check", "chevron", "clock", "close", "folder", "grid", "history", "lock", "plus", "search", "sparkles"];
    for (const n of names) {
      const el = T.ui.icon(n);
      T.expect(`icon("${n}")은 안에 그림이 있는 SVGElement`, el instanceof SVGElement && el.childElementCount > 0, el?.outerHTML);
    }
    const none = T.ui.icon("없는이름");
    T.expect("없는 이름이면 빈 요소", none instanceof SVGElement && none.childElementCount === 0, none?.outerHTML);
    T.expect("외부 그림 파일을 쓰지 않는다(<image>·<use href> 없음)", !names.some((n) => /<image|href=/.test(T.ui.icon(n).outerHTML)));
    T.record("기본 크기 20의 width 속성", T.ui.icon("check").getAttribute("width"));
  })();
  ```
- 기대 결과: 12개 이름마다 선으로 그린 SVG 아이콘을 만들고, 없는 이름이면 빈 요소를 돌려준다. 그림 파일이나 외부 아이콘 글꼴을 쓰지 않는다. (N46)
- 결과: 통과 / 실패 / 보류   확인자:   날짜:

---

## 4장. 아직 없는 것 · 명세와 다른 것

기준: `main` `309b583` (2026-10-28). 코드는 고치지 않았다. 함수가 구현되면 그 기능 PR에서 이 표를 고친다.

### 4-1. 아직 구현되지 않은 함수 (뼈대)

export는 모두 있지만(자동 검사가 확인한다), 몸체가 비어 있거나 빈 값만 돌려준다. `store.js`의 `load()`는 기본값 객체를 돌려주지만 `chrome.storage`를 읽지 않으므로 뼈대로 본다.

2026-10-30 `main` `049b9be`: `bookmarks.js`·`store.js`가 합쳐져 N01~N03, N05~N10, N12~N16, N38, N40이 구현됐다. 이 두 파일에서 아직 뼈대인 것은 N04 `renameFolder`, N11 `pin`·`unpin`, N39 `markHandledNew`다. 아래 표는 작성 시점(`309b583`) 그대로 둔다.

| N | 함수 | 파일 | 담당 | 이슈 |
|---|---|---|---|---|
| N01 | loadTree | bookmarks.js | 팀원 A | #2 |
| N02 | createFolder | bookmarks.js | 팀원 A | #2 |
| N03 | moveBookmark | bookmarks.js | 팀원 A | #2 |
| N04 | renameFolder | bookmarks.js | 팀원 A | #2 |
| N05 | deleteFolderKeepChildren | bookmarks.js | 팀원 A | #2 |
| N06 | openBookmark | bookmarks.js | 팀원 A | #2 |
| N07 | faviconUrl / hasFavicon | bookmarks.js | 팀원 A | #2 |
| N08 | load | store.js | 팀원 A | #3 |
| N09 | update | store.js | 팀원 A | #3 |
| N10 | recordOpened | store.js | 팀원 A | #3 |
| N11 | pin / unpin | store.js | 팀원 A | #3 |
| N12 | dismiss / undismiss | store.js | 팀원 A | #3 |
| N13 | markManualMove | store.js | 팀원 A | #3 |
| N14 | setPending / isPending | store.js | 팀원 A | #3 |
| N15 | addHistory / markUndone | store.js | 팀원 A | #3 |
| N16 | cleanupMissing | store.js | 팀원 A | #3 |
| N17 | classify | classify.js | 팀원 B | #7 |
| N18 | measure | classify.js | 팀원 B | #7 |
| N19 | getTargets | plan.js | 팀원 C | #11 |
| N20 | makePlan | plan.js | 팀원 C | #11 |
| N21 | pickPinCandidates | plan.js | 팀원 C | #11 |
| N22 | applyPlan | organize.js | 팀원 A | #4 |
| N23 | undo | organize.js | 팀원 A | #4 |
| N24 | suggestForNew | classify.js | 팀원 B | #7 |
| N25 | lastOpened | forgotten.js | 팀원 B | #8 |
| N26 | pickForgotten | forgotten.js | 팀원 B | #8 |
| N27 | searchBookmarks | search.js | 팀원 D | #18 |
| N28 | isUrlLike | search.js | 팀원 D | #18 |
| N29 | runWebSearch | search.js | 팀원 D | #18 |
| N30 | renderAll | render.js | 팀원 D | #15 |
| N31 | showFirstCard / showOrganizeDialog / showPinPicker | view/cards.js | 팀원 D | #17 |
| N32 | onCreated 처리 | background.js | 팀원 B | #6 |
| N33 | onMoved 처리 | background.js | 팀원 B | #6 |
| N34 | onRemoved 처리 | background.js | 팀원 B | #6 |
| N35 | suggestSubfolders | topic.js | 팀원 C | #12 |
| N36 | initDnd | dnd.js | 팀원 D | #19 |
| N37 | suggestNewFolders | plan.js | 팀원 C | #11 |
| N38 | setFirstCard | store.js | 팀원 A | #3 |
| N39 | markHandledNew | store.js | 팀원 A | #3 |
| N40 | addNew / removeNew / purgeWorkerKeys | store.js | 팀원 A | #3 |
| N41 | showFolders / openFolderPopup / showContextMenu | view/folders.js | 팀원 C | #13 |
| N42 | showForgotten | view/forgottenFolder.js | 팀원 B | #9 |
| N43 | showResultNotice / showHistory | view/history.js | 팀원 A | #5 |
| N44 | appIcon | ui.js | 팀원 D | #16 |
| N45 | showToast | ui.js | 팀원 D | #16 |
| N46 | icon | ui.js | 팀원 D | #16 |

`background.js`의 `onInstalled`(C03), `onImportBegan`·`onImportEnded`(C13)도 비어 있다. N 번호가 없는 크롬 알림 처리라 3장 항목은 없고, 가져오기 중 기록을 멈추는지는 C-N32의 첫 줄(F01-07)로 본다.

코드에는 있는데 명세에 없는 export 함수는 없다.

### 4-2. 이름·인자·출력이 명세와 다른 것

| N | 코드 (`main` `309b583`) | 명세 (v15) |
|---|---|---|
| N07 `hasFavicon(url)` | `309b583`: 뼈대가 `false`를 돌려줌 → `049b9be`: 쓸 파비콘 주소 또는 `null` (명세와 같아졌다) | 출력: 쓸 파비콘 주소 또는 `null` (v15에서 바뀜). 이슈 #2는 아직 v13의 `true·false`다 |

### 4-3. 명세에 형태가 정해지지 않아 이 문서가 고른 것

함수의 입력·출력 중 명세에 키 이름이나 원소 형태가 없는 것이다. 이 문서는 아래처럼 넣었다. 구현할 때 다르게 정하면 명세를 먼저 고치고(conventions 8번) 이 문서의 해당 항목도 고친다.

| N | 정해지지 않은 것 | 이 문서가 넣은 것 | 항목 |
|---|---|---|---|
| N01 | 북마크에 붙이는 "들어 있는 폴더와 최상위 폴더 종류"의 필드 이름 | 기록만 한다. `main` `049b9be`의 코드는 `folderTitle`, `path`, `rootType`, `rootId`, `rootChosen` | C-N01 |
| N14 | `setPending(moves)` 원소의 키 이름 (`[{북마크ID, 목적지 폴더}]`) | 명세 v16에서 `{ id, toParentId }`로 정해졌다(`store.js`와 같다). 처음에는 `history.moves`의 이름(`bookmarkId`)을 넣었다. `history.moves` 안의 `bookmarkId`는 그대로다 | C-N14, C-N33 |
| N18 | `measure(samples, answers, …)`의 samples와 answers 형태 | 둘 다 `answer-key-100.json` 배열 | C-N18 |
| N19 | options `{북마크바 제외, 포함할 사용자 폴더}`의 키 이름 | `{}`(기본값)만 확인 | C-N19 |
| N20 | `rest`가 배열인지 개수인지, `reasons`의 형태 | 둘 다 받게 썼다 / 기록만 | C-N20 |
| N22 | `folders[].items`의 원소(북마크 노드인지 ID인지), `keep`의 원소 | 크롬 북마크 노드 / 북마크 ID | C-N22, C-N22-예외 |
| N24 | `folders`(현재 폴더)의 원소 | 크롬 폴더 노드처럼 `{ id, title }` | C-N24 |
| N31 | `showPinPicker()`의 입력 (P2를 시작할 때 정한다, `docs/file-structure.md` 12번) | 입력 없이 부름 | C-N31 |

---

## 5장. 결과표

| 칸 | 값 |
|---|---|
| 검증한 커밋 해시 (`git rev-parse --short HEAD`) | |
| 크롬 버전 (`chrome://version`의 첫 줄) | |
| 날짜 | |
| 확인자 | |

| N | 함수 | 우선순위 | 구현 상태 (작성 시점) | 확인자 | 결과 | 비고 (이슈) |
|---|---|---|---|---|---|---|
| N01 | loadTree | P1 | 뼈대 | | | #2 |
| N02 | createFolder | P1 | 뼈대 | | | #2 |
| N03 | moveBookmark | P1 | 뼈대 | | | #2 |
| N04 | renameFolder | P2 | 뼈대 | | | #2 |
| N05 | deleteFolderKeepChildren | P2 | 뼈대 | | | #2 |
| N06 | openBookmark | P1 | 뼈대 | | | #2 |
| N07 | faviconUrl / hasFavicon | P1 | 뼈대 | | | #2 · 4-2 |
| N08 | load | P1 | 뼈대 | | | #3 |
| N09 | update | P1 | 뼈대 | | | #3 |
| N10 | recordOpened | P1 | 뼈대 | | | #3 |
| N11 | pin / unpin | P2 | 뼈대 | | | #3 |
| N12 | dismiss / undismiss | P1 | 뼈대 | | | #3 |
| N13 | markManualMove | P1·P2 | 뼈대 | | | #3 |
| N14 | setPending / isPending | P1 | 뼈대 | | | #3 |
| N15 | addHistory / markUndone | P1 | 뼈대 | | | #3 |
| N16 | cleanupMissing | P1 | 뼈대 | | | #3 |
| N17 | classify (+ 정답지) | P1 | 뼈대 | | | #7 |
| N18 | measure | P1 | 뼈대 | | | #7 |
| N19 | getTargets (+ 예외) | P1 | 뼈대 | | | #11 |
| N20 | makePlan (+ 예외) | P1 | 뼈대 | | | #11 |
| N21 | pickPinCandidates | P2 | 뼈대 | | | #11 |
| N22 | applyPlan (+ 예외) | P1 | 뼈대 | | | #4 |
| N23 | undo (+ 예외) | P1 | 뼈대 | | | #4 |
| N24 | suggestForNew | P2 | 뼈대 | | | #7 |
| N25 | lastOpened | P1 | 뼈대 | | | #8 |
| N26 | pickForgotten | P1 | 뼈대 | | | #8 |
| N27 | searchBookmarks | P2 | 뼈대 | | | #18 |
| N28 | isUrlLike | P1 | 뼈대 | | | #18 |
| N29 | runWebSearch | P1 | 뼈대 | | | #18 |
| N30 | renderAll | P1 | 뼈대 | | | #15 |
| N31 | showFirstCard / showOrganizeDialog / showPinPicker | P1·P2 | 뼈대 | | | #17 |
| N32 | onCreated 처리 | P2 | 뼈대 | | | #6 |
| N33 | onMoved 처리 | P1·P2 | 뼈대 | | | #6 |
| N34 | onRemoved 처리 | P1 | 뼈대 | | | #6 |
| N35 | suggestSubfolders | P3 | 뼈대 | | | #12 |
| N36 | initDnd | P3 | 뼈대 | | | #19 |
| N37 | suggestNewFolders | P2 | 뼈대 | | | #11 |
| N38 | setFirstCard | P1 | 뼈대 | | | #3 |
| N39 | markHandledNew | P2 | 뼈대 | | | #3 |
| N40 | addNew / removeNew / purgeWorkerKeys | P1·P2 | 뼈대 | | | #3 |
| N41 | showFolders / openFolderPopup / showContextMenu | P1·P2 | 뼈대 | | | #13 |
| N42 | showForgotten | P1 | 뼈대 | | | #9 |
| N43 | showResultNotice / showHistory | P1·P2 | 뼈대 | | | #5 |
| N44 | appIcon | P1 | 뼈대 | | | #16 |
| N45 | showToast | P1 | 뼈대 | | | #16 |
| N46 | icon | P1 | 뼈대 | | | #16 |

- 결과 칸에는 통과 / 실패 / 보류를 적고, 실패면 비고에 요구사항 번호와 `T.summary()`의 실패 이름을 적는다.
- 우선순위는 그 함수가 받치는 요구사항 줄의 우선순위다('기능 명세' 시트). P1·P2는 두 우선순위의 줄을 함께 받친다는 뜻이다.
- 오류가 나서 끝까지 돌지 않은 항목은 "보류"로 적고, 오류 문구를 PR 댓글이나 Issue로 남긴다.
