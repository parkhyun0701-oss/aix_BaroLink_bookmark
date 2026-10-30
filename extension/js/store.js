// 담당: 팀원 A · 이슈 #3 · 명세: N08~N16, N38~N40 · 크롬 API: C14, C15
// 저장 항목을 읽고 쓰는 통로. 모든 저장은 이 파일을 거친다. 한 키는 한쪽(새 탭 또는 서비스 워커)만 쓴다.

// 저장 항목 9개의 기본값. 밖으로 내보낼 때는 항상 복사본을 준다
const DEFAULTS = Object.freeze({
  pinned: [],
  lastOpenedByUs: {},
  dismissed: {},
  manualMoves: {},
  newBookmarks: [],
  handledNew: [],
  pendingMoves: {},
  history: [],
  state: { firstCard: "pending" },
});

// '옮기는 중' 표시가 유효한 시간 (1분)
const PENDING_TTL = 60000;

// 고정됨(독)에 넣을 수 있는 최대 개수 (N11 pin에서 쓴다. pin은 P2에서 채운다)
const MAX_PINNED = 8;

// 키마다 쓰는 쪽. 두 쪽이 같은 키를 동시에 쓰면 값이 사라진다(실행 확인: 120번 중 91개만 남음)
const WRITER = {
  pinned: "newtab",
  lastOpenedByUs: "newtab",
  dismissed: "newtab",
  handledNew: "newtab",
  pendingMoves: "newtab",
  history: "newtab",
  state: "newtab",
  manualMoves: "worker",
  newBookmarks: "worker",
};

const SIDE_NAME = { newtab: "새 탭", worker: "서비스 워커" };

const FIRST_CARD_VALUES = ["pending", "done", "later"];

// 읽고 → 고치고 → 쓰기 작업을 한 줄로 세우는 큐
let queue = Promise.resolve();

// 지금 코드가 도는 쪽. 부를 때마다 판별한다 (서비스 워커에는 document가 없다)
function currentSide() {
  return typeof document === "undefined" ? "worker" : "newtab";
}

function clone(value) {
  return structuredClone(value);
}

// 북마크 ID는 문자열로 맞춘다 (숫자로 들어와도 String())
function toId(id) {
  if (id === undefined || id === null || id === "") {
    throw new Error("store.js: 북마크 ID가 비어 있다");
  }
  return String(id);
}

function toIdList(ids) {
  if (!Array.isArray(ids)) {
    throw new Error("store.js: ID 배열이 필요하다");
  }
  return ids.map(toId);
}

// 저장소에서 읽은 값에 기본값을 채운다. state는 기본값과 합친다
function withDefault(key, stored) {
  if (key === "state") {
    const value = stored && typeof stored === "object" ? stored : {};
    return { ...DEFAULTS.state, ...value };
  }
  return stored === undefined ? clone(DEFAULTS[key]) : stored;
}

// N08: 저장 항목 전체를 읽는다 (없는 키는 기본값)
// 같은 쪽에서 update를 await 하지 않고 곧바로 load()를 부르면 고치기 전 값을 읽을 수 있다. update를 await 한 뒤에 부른다.
export async function load() {
  const keys = Object.keys(DEFAULTS);
  const stored = await chrome.storage.local.get(keys);
  const result = {};
  for (const key of keys) {
    result[key] = withDefault(key, stored[key]);
  }
  return result;
}

// N09: 읽고 → 고치고 → 쓰기를 한 번에 처리. 고친 값을 돌려준다
// 모든 작업을 한 줄(큐)로 세워 순서대로 처리한다. fn은 현재 값의 복사본을 받고,
// undefined를 돌려주면 쓰지 않는다(이때는 현재 값을 돌려준다). fn이 오류를 내도 다음 작업은 계속된다.
export async function update(key, fn) {
  if (!Object.hasOwn(WRITER, key)) {
    throw new Error(`store.js: 모르는 저장 키 "${key}"`);
  }
  if (typeof fn !== "function") {
    throw new Error("store.js: update의 두 번째 값은 함수여야 한다");
  }
  const side = currentSide();
  if (WRITER[key] !== side) {
    throw new Error(`store.js: "${key}"는 ${SIDE_NAME[WRITER[key]]}만 쓴다 (지금: ${SIDE_NAME[side]})`);
  }

  const task = queue.then(async () => {
    const stored = await chrome.storage.local.get(key);
    const current = withDefault(key, stored[key]);
    const next = await fn(clone(current));
    if (next === undefined) return current;
    await chrome.storage.local.set({ [key]: next });
    return next;
  });
  // 실패한 작업이 큐를 막지 않게 한다 (오류는 task를 부른 쪽이 받는다)
  queue = task.catch(() => {});
  return task;
}

// N10: 연 시각 기록 (lastOpenedByUs)
export async function recordOpened(id) {
  const key = toId(id);
  await update("lastOpenedByUs", (opened) => {
    opened[key] = Date.now();
    return opened;
  });
}

// N11: 독에 추가. 이미 8개면 넣지 않고 false
export async function pin(id) {
  return false;
}

// N11: 독에서 제거. 고정 목록을 돌려준다
export async function unpin(id) {
  return [];
}

// N12: "이제 안 봐도 됨" 기록 · 취소 (dismissed)
export async function dismiss(id) {
  const key = toId(id);
  await update("dismissed", (dismissed) => {
    dismissed[key] = Date.now();
    return dismissed;
  });
}
export async function undismiss(id) {
  const key = toId(id);
  await update("dismissed", (dismissed) => {
    if (!Object.hasOwn(dismissed, key)) return undefined;
    delete dismissed[key];
    return dismissed;
  });
}

// N13: 직접 옮김 기록 (manualMoves). 서비스 워커만 호출
export async function markManualMove(id) {
  const key = toId(id);
  await update("manualMoves", (moves) => {
    moves[key] = Date.now();
    return moves;
  });
}

// N14: 우리 정리가 옮길 북마크를 목적지 · 시각과 함께 표시 (pendingMoves). 새 탭만 호출
// moves: [{ id, toParentId }]. 만료(1분)된 표시는 이때 함께 지운다. 옮긴 뒤에 표시를 지우지 않는다(1분 뒤 만료).
// 부르는 쪽은 반드시 await로 저장이 끝난 뒤에 북마크를 옮기기 시작한다.
// 그렇지 않으면 서비스 워커가 표시를 못 보고 우리 이동을 직접 옮김으로 기록한다.
export async function setPending(moves) {
  if (!Array.isArray(moves)) {
    throw new Error("store.js: setPending에는 [{ id, toParentId }] 배열이 필요하다");
  }
  const items = moves.map((move) => {
    if (!move || typeof move !== "object") {
      throw new Error("store.js: setPending의 항목은 { id, toParentId } 형태여야 한다");
    }
    return { id: toId(move.id), toParentId: toId(move.toParentId) };
  });

  await update("pendingMoves", (pending) => {
    const now = Date.now();
    for (const [key, entry] of Object.entries(pending)) {
      if (!entry || !(now - entry.at < PENDING_TTL)) delete pending[key];
    }
    for (const item of items) {
      pending[item.id] = { toParentId: item.toParentId, at: now };
    }
    return pending;
  });
}

// N14: 그 이동이 우리 것인지 확인. 서비스 워커가 부름, 읽기만 함 (update를 쓰지 않는다)
// 같은 북마크가 같은 목적지로 1분 안에 표시되어 있으면 true
export async function isPending(id, parentId) {
  const key = String(id);
  const stored = await chrome.storage.local.get("pendingMoves");
  const entry = (stored.pendingMoves || {})[key];
  if (!entry) return false;
  return String(entry.toParentId) === String(parentId) && Date.now() - entry.at < PENDING_TTL;
}

// N15: 정리 기록 추가 (history). 최신 기록이 맨 앞
export async function addHistory(entry) {
  if (!entry || typeof entry !== "object" || entry.id === undefined || entry.id === null || entry.id === "") {
    throw new Error("store.js: 정리 기록에 id가 없다");
  }
  await update("history", (history) => [entry, ...history]);
}

// N15: 되돌린 시각 기록 (history). 없는 기록 ID면 아무것도 하지 않는다
export async function markUndone(historyId) {
  await update("history", (history) => {
    const entry = history.find((item) => String(item.id) === String(historyId));
    if (!entry) return undefined;
    entry.undoneAt = Date.now();
    return history;
  });
}

// cleanupMissing의 입력(loadTree 결과 · 노드 배열 · ID Set)에서 크롬에 있는 ID를 모은다
function collectIds(tree) {
  const ids = new Set();
  if (!tree) return ids;
  if (tree instanceof Set) {
    for (const id of tree) ids.add(String(id));
    return ids;
  }
  const walk = (nodes) => {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      if (!node) continue;
      if (node.id !== undefined && node.id !== null) ids.add(String(node.id));
      walk(node.children);
    }
  };
  if (Array.isArray(tree)) {
    walk(tree);
  } else {
    walk(tree.bookmarks);
    walk(tree.folders);
  }
  return ids;
}

// N16: 크롬에 더 이상 없는 북마크 ID를 새 탭이 쓰는 저장 항목에서 지운다. 지운 개수를 돌려준다
// 대상: pinned, handledNew, lastOpenedByUs, dismissed. history(기록 화면의 제목)와 서비스 워커 키는 건드리지 않는다.
// 안전장치: 읽은 ID가 하나도 없으면(읽기 실패) 아무것도 지우지 않는다.
export async function cleanupMissing(tree) {
  const alive = collectIds(tree);
  if (alive.size === 0) return 0;

  let removed = 0;
  for (const key of ["pinned", "handledNew"]) {
    await update(key, (list) => {
      const kept = list.filter((id) => alive.has(String(id)));
      if (kept.length === list.length) return undefined;
      removed += list.length - kept.length;
      return kept;
    });
  }
  for (const key of ["lastOpenedByUs", "dismissed"]) {
    await update(key, (map) => {
      let count = 0;
      for (const id of Object.keys(map)) {
        if (!alive.has(id)) {
          delete map[id];
          count++;
        }
      }
      if (count === 0) return undefined;
      removed += count;
      return map;
    });
  }
  return removed;
}

// N38: 첫 정리 카드 상태 ("pending" | "done" | "later"). 새 탭만 호출
export async function setFirstCard(value) {
  if (!FIRST_CARD_VALUES.includes(value)) {
    throw new Error(`store.js: 첫 정리 카드 상태는 pending, done, later 중 하나여야 한다 (받은 값: ${value})`);
  }
  await update("state", (state) => ({ ...state, firstCard: value }));
}

// N39: '그대로 두기'로 둔 새 북마크를 기록 (handledNew). 새 탭만 호출
export async function markHandledNew(ids) {}

// N40: 새 북마크 목록에 추가 · 제거, 삭제된 ID 정리 (newBookmarks, manualMoves). 서비스 워커만 호출
export async function addNew(id) {
  const key = toId(id);
  await update("newBookmarks", (list) => (list.includes(key) ? undefined : [...list, key]));
}
export async function removeNew(id) {
  const key = toId(id);
  await update("newBookmarks", (list) => (list.includes(key) ? list.filter((item) => item !== key) : undefined));
}
export async function purgeWorkerKeys(ids) {
  const gone = new Set(toIdList(ids));
  if (gone.size === 0) return;
  await update("newBookmarks", (list) => {
    const kept = list.filter((id) => !gone.has(String(id)));
    return kept.length === list.length ? undefined : kept;
  });
  await update("manualMoves", (moves) => {
    let changed = false;
    for (const id of Object.keys(moves)) {
      if (gone.has(id)) {
        delete moves[id];
        changed = true;
      }
    }
    return changed ? moves : undefined;
  });
}
