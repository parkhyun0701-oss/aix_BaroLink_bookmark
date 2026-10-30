// extension/js/store.js 테스트 (팀원 A · 이슈 #3)
// 실행: node --test "tests/*.test.mjs"   (Node 20 이상. 따옴표가 필요하다)
// 크롬 없이 돌리기 위해 가짜 chrome.storage.local을 넣는다. get·set마다 0~3ms 임의로 늦어지고, 값은 복사해서 주고받는다.
// 쓰는 쪽: globalThis.document가 있으면 새 탭, 없으면 서비스 워커로 본다.

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

let data = {};
const delay = () => new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 4)));

globalThis.chrome = {
  storage: {
    local: {
      async get(keys) {
        await delay();
        let list;
        if (keys === undefined || keys === null) list = Object.keys(data);
        else if (typeof keys === "string") list = [keys];
        else if (Array.isArray(keys)) list = keys;
        else list = Object.keys(keys);
        const out = {};
        for (const key of list) {
          if (Object.hasOwn(data, key)) out[key] = structuredClone(data[key]);
        }
        return out;
      },
      async set(items) {
        await delay();
        for (const [key, value] of Object.entries(items)) data[key] = structuredClone(value);
      },
    },
  },
};

const store = await import("../extension/js/store.js");

const asNewTab = () => { globalThis.document = {}; };
const asWorker = () => { delete globalThis.document; };

// Date.now를 잠시 바꿔 fn을 실행하고, 끝나면 원래대로 돌려놓는다
async function withNow(time, fn) {
  const original = Date.now;
  Date.now = () => time;
  try {
    return await fn();
  } finally {
    Date.now = original;
  }
}

beforeEach(() => {
  data = {};
  asNewTab();
});

// 1. load
test("load: 저장된 것이 없으면 키 9개 모두 기본값", async () => {
  const all = await store.load();
  assert.deepEqual(all, {
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
});

test("load: state가 일부만 있으면 기본값과 합친다", async () => {
  data.state = { other: 1 };
  data.pinned = ["5"];
  const all = await store.load();
  assert.deepEqual(all.state, { firstCard: "pending", other: 1 });
  assert.deepEqual(all.pinned, ["5"]);
});

test("load: 돌려받은 값을 고쳐도 기본값은 그대로", async () => {
  const first = await store.load();
  first.pinned.push("x");
  first.state.firstCard = "done";
  first.lastOpenedByUs.y = 1;
  const second = await store.load();
  assert.deepEqual(second.pinned, []);
  assert.deepEqual(second.state, { firstCard: "pending" });
  assert.deepEqual(second.lastOpenedByUs, {});
});

// 2. 동시에 쓰기
test("recordOpened: 120번을 동시에 불러도 120개 모두 남는다", async () => {
  await Promise.all(Array.from({ length: 120 }, (_, i) => store.recordOpened(i)));
  assert.equal(Object.keys(data.lastOpenedByUs).length, 120);
});

// 3. 쓰는 쪽 검사
test("update: 쓰는 쪽이 아니면 오류, 모르는 키도 오류", async () => {
  asNewTab();
  await assert.rejects(store.markManualMove("1"));
  await assert.rejects(store.addNew("1"));
  await assert.rejects(store.update("unknownKey", (v) => v));
  asWorker();
  await assert.rejects(store.dismiss("1"));
  await assert.rejects(store.setFirstCard("done"));
  await assert.rejects(store.update("unknownKey", (v) => v));
  assert.deepEqual(data, {});
});

// 4. fn 오류 뒤에도 큐가 계속 돈다
test("update: fn이 오류를 내도 다음 update는 동작한다", async () => {
  const failing = store.update("pinned", () => {
    throw new Error("일부러 낸 오류");
  });
  const next = store.update("pinned", (list) => [...list, "a"]);
  await assert.rejects(failing, /일부러 낸 오류/);
  assert.deepEqual(await next, ["a"]);
  assert.deepEqual(data.pinned, ["a"]);
});

test("update: fn이 undefined를 돌려주면 쓰지 않고 현재 값을 돌려준다", async () => {
  const result = await store.update("pinned", () => undefined);
  assert.deepEqual(result, []);
  assert.equal(Object.hasOwn(data, "pinned"), false);
});

test("update: fn은 복사본을 받는다", async () => {
  data.pinned = ["1"];
  await store.update("pinned", (list) => {
    list.push("2");
    return undefined;
  });
  assert.deepEqual(data.pinned, ["1"]);
});

// 5. dismiss / undismiss (pin·unpin은 P2에서 테스트한다)
test("dismiss 뒤 undismiss하면 원래대로", async () => {
  await store.dismiss("7");
  assert.equal(typeof data.dismissed["7"], "number");
  await store.undismiss("7");
  assert.deepEqual(data.dismissed, {});
});

// 6. setPending / isPending
test("setPending → isPending: 같은 목적지면 true, 다른 목적지면 false, 숫자 ID도 맞는다", async () => {
  await store.setPending([{ id: 10, toParentId: 2 }, { id: "11", toParentId: "3" }]);
  asWorker();
  assert.equal(await store.isPending("10", "2"), true);
  assert.equal(await store.isPending(10, 2), true);
  assert.equal(await store.isPending("11", "3"), true);
  assert.equal(await store.isPending("11", "2"), false);
  assert.equal(await store.isPending("99", "2"), false);
});

test("setPending: 1분이 지나면 false, 다음 setPending 때 만료된 항목을 지운다", async () => {
  const base = 1_000_000;
  await withNow(base, () => store.setPending([{ id: "1", toParentId: "a" }]));
  await withNow(base + 59999, async () => {
    assert.equal(await store.isPending("1", "a"), true);
  });
  await withNow(base + 60000, async () => {
    assert.equal(await store.isPending("1", "a"), false);
  });
  assert.ok(Object.hasOwn(data.pendingMoves, "1"));
  await withNow(base + 61000, () => store.setPending([{ id: "2", toParentId: "b" }]));
  assert.deepEqual(data.pendingMoves, { 2: { toParentId: "b", at: base + 61000 } });
});

test("setPending: 잘못된 입력은 오류, 서비스 워커에서 부르면 오류", async () => {
  await assert.rejects(store.setPending("1"));
  await assert.rejects(store.setPending([{ id: "1" }]));
  await assert.rejects(store.setPending([null]));
  asWorker();
  await assert.rejects(store.setPending([{ id: "1", toParentId: "2" }]));
  assert.deepEqual(data, {});
});

// 7. addHistory / markUndone
test("addHistory: 최신이 앞, id 없으면 오류, markUndone은 그 기록에만 시각을 남긴다", async () => {
  await store.addHistory({ id: "h1", at: 1, type: "first", moves: [] });
  await store.addHistory({ id: "h2", at: 2, type: "new", moves: [] });
  assert.deepEqual(data.history.map((h) => h.id), ["h2", "h1"]);
  await assert.rejects(store.addHistory({ at: 3 }));
  await assert.rejects(store.addHistory(null));
  assert.equal(data.history.length, 2);

  await withNow(5000, () => store.markUndone("h1"));
  assert.equal(data.history[1].undoneAt, 5000);
  assert.equal(Object.hasOwn(data.history[0], "undoneAt"), false);

  const before = structuredClone(data.history);
  await store.markUndone("없는-id");
  assert.deepEqual(data.history, before);
});

// 8. cleanupMissing
function seedForCleanup() {
  data.pinned = ["1", "2", "9"];
  data.handledNew = ["2", "8"];
  data.lastOpenedByUs = { 1: 100, 9: 100 };
  data.dismissed = { 8: 100, 3: 100 };
  data.history = [{ id: "h1", moves: [{ bookmarkId: "9", title: "지운 북마크" }] }];
  data.manualMoves = { 9: 100 };
  data.newBookmarks = ["9"];
}

test("cleanupMissing: 크롬에 없는 ID를 지우고 개수를 돌려준다. history와 서비스 워커 키는 그대로", async () => {
  seedForCleanup();
  const tree = { bookmarks: [{ id: "1" }, { id: "2" }, { id: "3" }], folders: [{ id: "100" }] };
  const removed = await store.cleanupMissing(tree);
  assert.equal(removed, 4);
  assert.deepEqual(data.pinned, ["1", "2"]);
  assert.deepEqual(data.handledNew, ["2"]);
  assert.deepEqual(data.lastOpenedByUs, { 1: 100 });
  assert.deepEqual(data.dismissed, { 3: 100 });
  assert.deepEqual(data.history, [{ id: "h1", moves: [{ bookmarkId: "9", title: "지운 북마크" }] }]);
  assert.deepEqual(data.manualMoves, { 9: 100 });
  assert.deepEqual(data.newBookmarks, ["9"]);
});

test("cleanupMissing: ID가 하나도 없으면 아무것도 지우지 않고 0", async () => {
  seedForCleanup();
  const before = structuredClone(data);
  assert.equal(await store.cleanupMissing({ bookmarks: [], folders: [] }), 0);
  assert.equal(await store.cleanupMissing([]), 0);
  assert.equal(await store.cleanupMissing(new Set()), 0);
  assert.equal(await store.cleanupMissing(undefined), 0);
  assert.deepEqual(data, before);
});

test("cleanupMissing: 노드 배열(children 포함)과 ID Set도 받는다", async () => {
  seedForCleanup();
  const nodes = [{ id: "0", children: [{ id: "1" }, { id: "x", children: [{ id: "2" }, { id: "3" }] }] }];
  assert.equal(await store.cleanupMissing(nodes), 4);
  assert.deepEqual(data.pinned, ["1", "2"]);

  seedForCleanup();
  assert.equal(await store.cleanupMissing(new Set([1, 2, 3])), 4);
  assert.deepEqual(data.dismissed, { 3: 100 });
});

// 9. setFirstCard / addNew · removeNew · purgeWorkerKeys (markHandledNew는 P2에서 테스트한다)
test("setFirstCard: 허용된 값만, 잘못된 값은 오류", async () => {
  await store.setFirstCard("done");
  assert.deepEqual(data.state, { firstCard: "done" });
  await store.setFirstCard("later");
  assert.deepEqual((await store.load()).state, { firstCard: "later" });
  await assert.rejects(store.setFirstCard("finished"));
  await assert.rejects(store.setFirstCard(undefined));
  assert.deepEqual(data.state, { firstCard: "later" });
});

test("addNew / removeNew / purgeWorkerKeys: 서비스 워커에서 동작", async () => {
  asWorker();
  await store.addNew("1");
  await store.addNew(2);
  await store.addNew("1");
  assert.deepEqual(data.newBookmarks, ["1", "2"]);
  await store.removeNew("1");
  assert.deepEqual(data.newBookmarks, ["2"]);

  await store.addNew("3");
  await store.markManualMove("2");
  await store.markManualMove("4");
  await store.purgeWorkerKeys(["2", 4]);
  assert.deepEqual(data.newBookmarks, ["3"]);
  assert.deepEqual(data.manualMoves, {});
});
