// extension/js/bookmarks.js 테스트 (팀원 A · 이슈 #2)
// 실행: node --test "tests/*.test.mjs"   (Node 20 이상. 따옴표가 필요하다)
// 크롬 없이 돌리기 위해 가짜 chrome.bookmarks · tabs · runtime · storage.local과 가짜 fetch를 넣는다.
// 가짜 chrome.bookmarks.move는 실제 크롬에서 확인한 동작을 따른다: 없는 ID·목적지는 오류,
// index가 목적지 폴더의 개수보다 크면 "Index out of bounds", 같은 폴더 안에서 뒤쪽으로 옮기면 한 칸 앞에 놓임.

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

// 크롬 호출 순서 기록 ("storage.set", "tabs.update" 등)
let calls = [];

// ---- 가짜 chrome.storage.local (store.js가 쓴다) ----
let data = {};
const storage = {
  async get(keys) {
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
    await new Promise((resolve) => setTimeout(resolve, 2));
    for (const [key, value] of Object.entries(items)) data[key] = structuredClone(value);
    calls.push("storage.set");
  },
};

// ---- 가짜 chrome.bookmarks ----
// nodes: id → { id, parentId, title, url?, dateAdded, dateLastUsed?, folderType?, syncing, children?: [id] }
let nodes = new Map();
let nextId = 1000;

function view(id, deep) {
  const node = nodes.get(id);
  const out = { id: node.id, title: node.title, dateAdded: node.dateAdded, syncing: node.syncing };
  if (node.parentId !== undefined) {
    out.parentId = node.parentId;
    out.index = nodes.get(node.parentId).children.indexOf(id);
  }
  if (node.url !== undefined) out.url = node.url;
  if (node.dateLastUsed !== undefined) out.dateLastUsed = node.dateLastUsed;
  if (node.folderType !== undefined) out.folderType = node.folderType;
  if (node.unmodifiable !== undefined) out.unmodifiable = node.unmodifiable;
  if (node.children && deep) out.children = node.children.map((child) => view(child, true));
  return out;
}

function need(id, message = "Can't find bookmark for id.") {
  const node = nodes.get(String(id));
  if (!node) throw new Error(message);
  return node;
}

const bookmarks = {
  async getTree() {
    return [view("0", true)];
  },
  async get(id) {
    need(id);
    return [view(String(id), false)];
  },
  async getChildren(id) {
    const node = need(id);
    if (!node.children) return [];
    return node.children.map((child) => view(child, false));
  },
  async create({ parentId, title, url }) {
    const parent = need(parentId, "Can't find parent bookmark for id.");
    if (parent.id === "0") throw new Error("Can't modify the root bookmark folders.");
    const id = String(nextId++);
    const node = { id, parentId: parent.id, title, dateAdded: 1, syncing: parent.syncing };
    if (url !== undefined) node.url = url;
    else node.children = [];
    nodes.set(id, node);
    parent.children.push(id);
    calls.push("bookmarks.create");
    return view(id, false);
  },
  async move(id, { parentId, index }) {
    const node = need(id);
    const parent = need(parentId, "Can't find parent bookmark for id.");
    if (node.parentId === "0" || parent.id === "0") throw new Error("Can't modify the root bookmark folders.");
    const count = parent.children.length;
    if (index === undefined) index = count;
    if (index > count) throw new Error("Index out of bounds.");
    const from = nodes.get(node.parentId).children;
    const oldIndex = from.indexOf(node.id);
    from.splice(oldIndex, 1);
    if (parent.id === node.parentId && index > oldIndex) index -= 1;
    parent.children.splice(index, 0, node.id);
    node.parentId = parent.id;
    calls.push("bookmarks.move");
    return view(node.id, false);
  },
  async remove(id) {
    const node = need(id);
    if (node.parentId === "0") throw new Error("Can't modify the root bookmark folders.");
    if (node.children && node.children.length > 0) throw new Error("Can't remove non-empty folder.");
    const siblings = nodes.get(node.parentId).children;
    siblings.splice(siblings.indexOf(node.id), 1);
    nodes.delete(node.id);
    calls.push("bookmarks.remove");
  },
};

// ---- 가짜 chrome.tabs ----
let tabsLog = [];
let currentTab = { id: 77 };
const tabs = {
  async getCurrent() {
    return currentTab;
  },
  async update(tabId, props) {
    calls.push("tabs.update");
    tabsLog.push({ method: "update", tabId, props });
  },
  async create(props) {
    calls.push("tabs.create");
    tabsLog.push({ method: "create", props });
  },
};

globalThis.chrome = {
  bookmarks,
  tabs,
  storage: { local: storage },
  runtime: { getURL: (path) => "chrome-extension://test" + path },
};
// store.js는 document가 있으면 새 탭으로 본다
globalThis.document = {};

// ---- 샘플 트리 ----
// 0
// ├─ 1 북마크바 (bookmarks-bar, 동기화)
// │   ├─ 10 네이버
// │   ├─ 11 [공부]
// │   │   ├─ 110 [강의]
// │   │   │   └─ 1100 MDN
// │   │   └─ 111 구글 (dateLastUsed 없음)
// │   ├─ 12 [빈 폴더]
// │   └─ 13 설정 (chrome://)
// ├─ 3 기타 북마크 (other, 이 PC만)  ← 동기화되는 쪽보다 앞에 둔다
// │   └─ 30 이 PC
// └─ 2 기타 북마크 (other, 동기화)
//     ├─ 20 메모 (file://)
//     └─ 21 북마클릿 (javascript:)
function build(spec) {
  nodes = new Map();
  nextId = 1000;
  const add = (item, parentId, syncing) => {
    const node = { ...item, parentId, dateAdded: item.dateAdded ?? 1, syncing: item.syncing ?? syncing };
    delete node.kids;
    if (item.url === undefined) node.children = [];
    nodes.set(node.id, node);
    if (parentId !== undefined) nodes.get(parentId).children.push(node.id);
    for (const kid of item.kids ?? []) add(kid, node.id, node.syncing);
  };
  add({ id: "0", title: "", kids: spec, syncing: false }, undefined, false);
}

const SAMPLE = [
  {
    id: "1", title: "북마크바", folderType: "bookmarks-bar", syncing: true,
    kids: [
      { id: "10", title: "네이버", url: "https://naver.com/", dateAdded: 100, dateLastUsed: 200 },
      {
        id: "11", title: "공부",
        kids: [
          { id: "110", title: "강의", kids: [{ id: "1100", title: "MDN", url: "https://developer.mozilla.org/ko/" }] },
          { id: "111", title: "구글", url: "https://google.com/", dateAdded: 300 },
        ],
      },
      { id: "12", title: "빈 폴더" },
      { id: "13", title: "설정", url: "chrome://settings/" },
    ],
  },
  { id: "3", title: "기타 북마크", folderType: "other", syncing: false, kids: [{ id: "30", title: "이 PC", url: "https://example.com/" }] },
  {
    id: "2", title: "기타 북마크", folderType: "other", syncing: true,
    kids: [
      { id: "20", title: "메모", url: "file:///C:/memo.txt" },
      { id: "21", title: "북마클릿", url: "javascript:alert(1)" },
    ],
  },
];

const childIds = (id) => [...nodes.get(id).children];

const b = await import("../extension/js/bookmarks.js");

beforeEach(() => {
  build(structuredClone(SAMPLE));
  data = {};
  calls = [];
  tabsLog = [];
  currentTab = { id: 77 };
});

// ---- N01 loadTree ----

test("loadTree: folderType과 syncing으로 roots를 고른다. 모바일 폴더가 없으면 null", async () => {
  const { roots } = await b.loadTree();
  assert.deepEqual(roots.bar, { id: "1", title: "북마크바", folderType: "bookmarks-bar", syncing: true, childIds: ["10", "11", "12", "13"] });
  assert.equal(roots.other.id, "2", "기타 북마크가 둘이면 동기화되는 쪽");
  assert.deepEqual(roots.other.childIds, ["20", "21"]);
  assert.equal(roots.mobile, null);
});

test("loadTree: 고르지 않은 기타 북마크 쪽의 북마크도 bookmarks에 넣고 rootChosen=false", async () => {
  const { bookmarks } = await b.loadTree();
  assert.equal(bookmarks.length, 7);
  const other = bookmarks.find((item) => item.id === "30");
  assert.equal(other.rootType, "other");
  assert.equal(other.rootId, "3");
  assert.equal(other.rootChosen, false);
  assert.equal(bookmarks.find((item) => item.id === "20").rootChosen, true);
});

test("loadTree: 북마크 필드 (folderTitle, path, dateLastUsed 없음)", async () => {
  const { bookmarks } = await b.loadTree();
  const naver = bookmarks.find((item) => item.id === "10");
  assert.deepEqual(naver, {
    id: "10", title: "네이버", url: "https://naver.com/", parentId: "1", index: 0, dateAdded: 100, dateLastUsed: 200,
    folderTitle: "북마크바", rootType: "bar", rootId: "1", rootChosen: true, path: [],
  });
  const mdn = bookmarks.find((item) => item.id === "1100");
  assert.equal(mdn.folderTitle, "강의");
  assert.deepEqual(mdn.path, ["공부", "강의"]);
  assert.equal(mdn.parentId, "110");
  const google = bookmarks.find((item) => item.id === "111");
  assert.equal(Object.hasOwn(google, "dateLastUsed"), false);
  assert.equal(google.index, 1);
});

test("loadTree: folders에는 최상위 폴더가 없고, 상위 폴더와 childIds가 있다", async () => {
  const { folders } = await b.loadTree();
  assert.deepEqual(folders.map((folder) => folder.id), ["11", "110", "12"]);
  const study = folders.find((folder) => folder.id === "11");
  assert.deepEqual(study, {
    id: "11", title: "공부", parentId: "1", index: 1, dateAdded: 1,
    rootType: "bar", rootId: "1", rootChosen: true, path: [], childIds: ["110", "111"],
  });
  const lecture = folders.find((folder) => folder.id === "110");
  assert.equal(lecture.parentId, "11");
  assert.deepEqual(lecture.path, ["공부"]);
  assert.deepEqual(folders.find((folder) => folder.id === "12").childIds, []);
});

test("loadTree: path는 항목마다 따로다 (한 항목을 고쳐도 다른 항목은 그대로)", async () => {
  const { bookmarks, folders } = await b.loadTree();
  const naver = bookmarks.find((item) => item.id === "10");
  naver.path.push("바꿈");
  assert.deepEqual(bookmarks.find((item) => item.id === "13").path, []);
  assert.deepEqual(folders.find((folder) => folder.id === "11").path, []);
  const lecture = folders.find((folder) => folder.id === "110");
  lecture.path.push("바꿈");
  assert.deepEqual(bookmarks.find((item) => item.id === "111").path, ["공부"]);
});

test("loadTree: 모바일 폴더가 있으면 roots.mobile, managed는 bookmarks에만", async () => {
  build([
    { id: "1", title: "북마크바", folderType: "bookmarks-bar", syncing: true, kids: [] },
    { id: "2", title: "기타 북마크", folderType: "other", syncing: true, kids: [] },
    { id: "4", title: "모바일 북마크", folderType: "mobile", syncing: true, kids: [{ id: "40", title: "폰", url: "https://m.example.com/" }] },
    { id: "5", title: "회사", folderType: "managed", syncing: false, kids: [{ id: "50", title: "사내", url: "https://intra.example.com/" }] },
  ]);
  const { roots, bookmarks } = await b.loadTree();
  assert.equal(roots.mobile.id, "4");
  assert.deepEqual(Object.keys(roots), ["bar", "other", "mobile"]);
  const managed = bookmarks.find((item) => item.id === "50");
  assert.equal(managed.rootType, "managed");
  assert.equal(managed.rootChosen, false);
  assert.equal(bookmarks.length, 2);
});

test("loadTree: 북마크바가 둘이고 둘 다 동기화되지 않으면 앞쪽", async () => {
  build([
    { id: "1", title: "북마크바", folderType: "bookmarks-bar", syncing: false, kids: [] },
    { id: "6", title: "북마크바", folderType: "bookmarks-bar", syncing: false, kids: [] },
    { id: "2", title: "기타 북마크", folderType: "other", syncing: false, kids: [] },
  ]);
  const { roots } = await b.loadTree();
  assert.equal(roots.bar.id, "1");
});

// ---- N02 createFolder ----

test("createFolder: 같은 이름(앞뒤 공백 제거)이 있으면 그 폴더를 돌려준다", async () => {
  assert.equal((await b.createFolder("공부", "1")).id, "11");
  assert.equal((await b.createFolder("  공부 ", "1")).id, "11");
  assert.equal(calls.includes("bookmarks.create"), false);
});

test("createFolder: 없으면 맨 뒤에 만들고, 두 번 불러도 하나만 있다", async () => {
  const first = await b.createFolder(" 새 폴더 ", "1");
  assert.equal(first.title, "새 폴더");
  assert.equal(first.index, 4);
  const second = await b.createFolder("새 폴더", "1");
  assert.equal(second.id, first.id);
  assert.equal(childIds("1").filter((id) => nodes.get(id).title === "새 폴더").length, 1);
});

test("createFolder: 같은 제목의 북마크는 폴더로 보지 않고, 대소문자는 구별한다", async () => {
  const folder = await b.createFolder("네이버", "1");
  assert.notEqual(folder.id, "10");
  assert.equal(folder.url, undefined);
  const upper = await b.createFolder("ABC", "1");
  const lower = await b.createFolder("abc", "1");
  assert.notEqual(upper.id, lower.id);
});

test("createFolder: 같은 이름이 여럿이면 index가 작은 것", async () => {
  await bookmarks.create({ parentId: "1", title: "겹침" });
  await bookmarks.create({ parentId: "1", title: "겹침" });
  const [firstId] = childIds("1").filter((id) => nodes.get(id).title === "겹침");
  assert.equal((await b.createFolder("겹침", "1")).id, firstId);
});

test("createFolder: 최상위(루트 \"0\") 아래에는 같은 이름이 있어도 오류", async () => {
  await assert.rejects(b.createFolder("기타 북마크", "0"));
  await assert.rejects(b.createFolder("새 폴더", "0"));
  await assert.rejects(b.createFolder("새 폴더", 0));
  assert.equal(calls.includes("bookmarks.create"), false);
});

test("createFolder: 빈 이름·공백뿐인 이름은 오류", async () => {
  await assert.rejects(b.createFolder("", "1"));
  await assert.rejects(b.createFolder("   ", "1"));
  await assert.rejects(b.createFolder(undefined, "1"));
  assert.equal(calls.includes("bookmarks.create"), false);
});

// ---- N03 moveBookmark ----

test("moveBookmark: 없는 북마크는 오류 없이 null", async () => {
  assert.equal(await b.moveBookmark("999", "1"), null);
});

test("moveBookmark: 없는 목적지·최상위로 옮기기는 오류", async () => {
  await assert.rejects(b.moveBookmark("10", "999"));
  await assert.rejects(b.moveBookmark("10", "0"));
});

test("moveBookmark: index를 안 주면 맨 뒤", async () => {
  const moved = await b.moveBookmark("10", "2");
  assert.equal(moved.parentId, "2");
  assert.deepEqual(childIds("2"), ["20", "21", "10"]);
});

test("moveBookmark: 다른 폴더의 개수보다 큰 index는 맨 뒤로 줄인다", async () => {
  const moved = await b.moveBookmark("10", "2", 99);
  assert.equal(moved.index, 2);
  assert.deepEqual(childIds("2"), ["20", "21", "10"]);
});

test("moveBookmark: 다른 폴더의 index는 그 자리에 끼운다", async () => {
  await b.moveBookmark("10", "2", 1);
  assert.deepEqual(childIds("2"), ["20", "10", "21"]);
});

test("moveBookmark: 같은 폴더에서 뒤쪽으로 옮기면 넘긴 index에 놓인다", async () => {
  const moved = await b.moveBookmark("10", "1", 2);
  assert.equal(moved.index, 2);
  assert.deepEqual(childIds("1"), ["11", "12", "10", "13"]);
});

test("moveBookmark: 같은 폴더에서 앞쪽으로, 너무 큰 index는 맨 끝", async () => {
  await b.moveBookmark("13", "1", 0);
  assert.deepEqual(childIds("1"), ["13", "10", "11", "12"]);
  const moved = await b.moveBookmark("10", "1", 99);
  assert.equal(moved.index, 3);
  assert.deepEqual(childIds("1"), ["13", "11", "12", "10"]);
});

test("moveBookmark: 유한한 수가 아닌 index는 맨 뒤, 음수는 0, 소수는 버림", async () => {
  for (const index of [NaN, "abc", "", "  ", Infinity, true]) {
    build(structuredClone(SAMPLE));
    const moved = await b.moveBookmark("10", "2", index);
    assert.equal(moved.index, 2, `index ${String(index)}`);
    assert.deepEqual(childIds("2"), ["20", "21", "10"]);
  }
  for (const [index, expected] of [[-1, 0], [1.7, 1], ["1", 1]]) {
    build(structuredClone(SAMPLE));
    const moved = await b.moveBookmark("10", "2", index);
    assert.equal(moved.index, expected, `index ${String(index)}`);
  }
});

test("moveBookmark: 옮기는 사이 지워지면 null", async () => {
  const original = bookmarks.move;
  bookmarks.move = async (id) => {
    nodes.get("1").children.splice(nodes.get("1").children.indexOf(id), 1);
    nodes.delete(id);
    throw new Error("Can't find bookmark for id.");
  };
  try {
    assert.equal(await b.moveBookmark("10", "2"), null);
  } finally {
    bookmarks.move = original;
  }
});

// ---- N05 deleteFolderKeepChildren ----

test("deleteFolderKeepChildren: 안의 것을 폴더 자리에 꺼내고 폴더만 지운다. 꺼낸 북마크만 센다", async () => {
  const count = await b.deleteFolderKeepChildren("11");
  assert.equal(count, 1, "꺼낸 것은 [강의] 폴더와 구글. 폴더는 세지 않는다");
  assert.deepEqual(childIds("1"), ["10", "110", "111", "12", "13"]);
  assert.equal(nodes.has("11"), false);
  assert.equal(nodes.get("1100").parentId, "110", "안의 폴더 속 북마크는 그대로");
  assert.equal(calls.includes("bookmarks.remove"), true);
});

test("deleteFolderKeepChildren: 빈 폴더는 0을 돌려주고 지운다 (F13-04)", async () => {
  assert.equal(await b.deleteFolderKeepChildren("12"), 0);
  assert.equal(nodes.has("12"), false);
});

test("deleteFolderKeepChildren: 최상위 폴더·북마크·없는 폴더는 오류", async () => {
  await assert.rejects(b.deleteFolderKeepChildren("1"));
  await assert.rejects(b.deleteFolderKeepChildren("10"));
  await assert.rejects(b.deleteFolderKeepChildren("999"));
  assert.equal(nodes.has("1"), true);
  assert.equal(nodes.has("10"), true);
});

test("deleteFolderKeepChildren: 바꿀 수 없는(managed) 폴더는 꺼내기 전에 오류", async () => {
  build([
    { id: "1", title: "북마크바", folderType: "bookmarks-bar", syncing: true, kids: [] },
    {
      id: "5", title: "회사", folderType: "managed", syncing: false, unmodifiable: "managed",
      kids: [{ id: "51", title: "팀", unmodifiable: "managed", kids: [{ id: "50", title: "사내", url: "https://intra.example.com/", unmodifiable: "managed" }] }],
    },
  ]);
  await assert.rejects(b.deleteFolderKeepChildren("51"));
  assert.equal(nodes.has("51"), true);
  assert.deepEqual(childIds("51"), ["50"]);
  assert.deepEqual(calls, []);
});

test("deleteFolderKeepChildren: pendingMoves 저장이 끝난 뒤 옮긴다", async () => {
  await b.deleteFolderKeepChildren("11");
  const firstMove = calls.indexOf("bookmarks.move");
  assert.ok(calls.indexOf("storage.set") !== -1 && calls.indexOf("storage.set") < firstMove);
  assert.deepEqual(Object.keys(data.pendingMoves).sort(), ["110", "111"]);
  assert.equal(data.pendingMoves["110"].toParentId, "1");
});

// ---- N06 openBookmark ----

const bm = (id) => ({ id, url: nodes.get(id).url });

test("openBookmark: javascript: 주소는 열지 않고 기록하지 않고 false", async () => {
  assert.equal(await b.openBookmark(bm("21")), false);
  assert.equal(await b.openBookmark({ id: "x", url: "  JavaScript:void(0)" }, { newTab: true }), false);
  assert.deepEqual(tabsLog, []);
  assert.equal(calls.includes("storage.set"), false);
});

test("openBookmark: 탭·줄 바꿈이 끼거나 앞에 공백이 있는 javascript:도, 해석할 수 없는 주소도 열지 않고 false", async () => {
  for (const url of ["java\tscript:alert(1)", " JavaScript:alert(1)", "javascript\n:alert(1)", "\u0001javascript:alert(1)", "주소 아님"]) {
    assert.equal(await b.openBookmark({ id: "x", url }), false, JSON.stringify(url));
    assert.equal(await b.openBookmark({ id: "x", url }, { newTab: true }), false, JSON.stringify(url));
  }
  assert.deepEqual(tabsLog, []);
  assert.equal(calls.includes("storage.set"), false);
});

test("openBookmark: 현재 탭은 이 탭의 id로 tabs.update", async () => {
  assert.equal(await b.openBookmark(bm("10")), undefined);
  assert.deepEqual(tabsLog, [{ method: "update", tabId: 77, props: { url: "https://naver.com/" } }]);
});

test("openBookmark: chrome://·file://도 tabs로 연다", async () => {
  await b.openBookmark(bm("13"));
  await b.openBookmark(bm("20"));
  assert.deepEqual(tabsLog.map((entry) => entry.props.url), ["chrome://settings/", "file:///C:/memo.txt"]);
});

test("openBookmark: 새 탭은 tabs.create, active: false", async () => {
  await b.openBookmark(bm("10"), { newTab: true });
  assert.deepEqual(tabsLog, [{ method: "create", props: { url: "https://naver.com/", active: false } }]);
});

test("openBookmark: 현재 탭 id를 못 얻으면 오류 (tabId 없이 부르지 않음)", async () => {
  currentTab = undefined;
  await assert.rejects(b.openBookmark(bm("10")));
  assert.deepEqual(tabsLog, []);
});

test("openBookmark: 주소가 없으면(폴더)·빈 주소면 오류", async () => {
  await assert.rejects(b.openBookmark({ id: "11" }));
  await assert.rejects(b.openBookmark({ id: "10", url: "" }));
  await assert.rejects(b.openBookmark({ id: "10", url: "" }, { newTab: true }));
  assert.deepEqual(tabsLog, []);
});

test("openBookmark: 연 시각 기록(storage.set)이 여는 것보다 먼저", async () => {
  await b.openBookmark(bm("10"));
  assert.deepEqual(calls, ["storage.set", "tabs.update"]);
  assert.equal(typeof data.lastOpenedByUs["10"], "number");
});

test("openBookmark: 기록이 실패해도 연다", async () => {
  const original = storage.set;
  const warn = console.warn;
  storage.set = async () => { throw new Error("저장 실패"); };
  console.warn = () => {};
  try {
    await b.openBookmark(bm("10"));
    assert.equal(tabsLog.length, 1);
  } finally {
    storage.set = original;
    console.warn = warn;
  }
});

// ---- N07 faviconUrl / hasFavicon ----

test("faviconUrl: _favicon 주소를 만든다", () => {
  assert.equal(
    b.faviconUrl("https://a.com/x?y=1&z=2"),
    "chrome-extension://test/_favicon/?pageUrl=https%3A%2F%2Fa.com%2Fx%3Fy%3D1%26z%3D2&size=32",
  );
  assert.equal(b.faviconUrl("https://a.com/", 16), "chrome-extension://test/_favicon/?pageUrl=https%3A%2F%2Fa.com%2F&size=16");
});

// 가짜 fetch: icons에 있는 페이지 주소는 그 바이트, 없으면 기본 그림. 불린 페이지 주소를 기록한다
const DEFAULT_BYTES = [1, 2, 3, 4];
function fakeFetch(icons) {
  const fetched = [];
  globalThis.fetch = async (url) => {
    const pageUrl = new URL(url).searchParams.get("pageUrl");
    fetched.push(pageUrl);
    const bytes = new Uint8Array(icons[pageUrl] ?? DEFAULT_BYTES);
    return { ok: true, status: 200, arrayBuffer: async () => bytes.buffer };
  };
  return fetched;
}

let caseNo = 0;
const freshModule = () => import(`../extension/js/bookmarks.js?case=${++caseNo}`);

test("hasFavicon: 페이지 주소에 파비콘이 있으면 그 주소의 faviconUrl (첫 페이지는 보지 않음)", async () => {
  const fetched = fakeFetch({ "https://a.com/page": [9, 9, 9] });
  const m = await freshModule();
  assert.equal(await m.hasFavicon("https://a.com/page"), m.faviconUrl("https://a.com/page", 32));
  assert.deepEqual(fetched, ["https://no-favicon.invalid/", "https://a.com/page"]);
});

test("hasFavicon: 페이지에 없으면 첫 페이지 주소로 한 번 더 확인하고, 첫 페이지의 faviconUrl", async () => {
  const fetched = fakeFetch({ "https://a.com/": [7, 7] });
  const m = await freshModule();
  const result = await m.hasFavicon("https://a.com/deep/page");
  assert.equal(result, m.faviconUrl("https://a.com/", 32));
  assert.notEqual(result, m.faviconUrl("https://a.com/deep/page", 32));
  assert.deepEqual(fetched, ["https://no-favicon.invalid/", "https://a.com/deep/page", "https://a.com/"]);
});

test("hasFavicon: 둘 다 기본 그림이면 null. 같은 길이의 다른 바이트는 다른 그림", async () => {
  fakeFetch({ "https://c.com/": [1, 2, 3, 5] });
  const m = await freshModule();
  assert.equal(await m.hasFavicon("https://b.com/x"), null);
  assert.equal(await m.hasFavicon("https://c.com/"), m.faviconUrl("https://c.com/", 32));
});

test("hasFavicon: 첫 페이지 주소면 한 번만 확인하고, chrome://·file://·잘못된 주소는 첫 페이지로 다시 찾지 않는다 (아이콘이 없으면 null)", async () => {
  const fetched = fakeFetch({});
  const m = await freshModule();
  assert.equal(await m.hasFavicon("https://a.com/"), null);
  assert.equal(await m.hasFavicon("chrome://settings/"), null);
  assert.equal(await m.hasFavicon("file:///C:/memo.txt"), null);
  assert.equal(await m.hasFavicon("주소 아님"), null);
  assert.equal(await m.hasFavicon(undefined), null);
  assert.deepEqual(fetched, ["https://no-favicon.invalid/", "https://a.com/", "chrome://settings/", "file:///C:/memo.txt", "주소 아님"]);
});

test("hasFavicon: chrome://·file://은 첫 페이지로 다시 찾지 않는다(원래 주소에 아이콘이 있으면 그 주소)", async () => {
  const fetched = fakeFetch({ "chrome://settings/": [6, 6], "file:///C:/memo.txt": [4, 4] });
  const m = await freshModule();
  assert.equal(await m.hasFavicon("chrome://settings/"), m.faviconUrl("chrome://settings/", 32));
  assert.equal(await m.hasFavicon("file:///C:/memo.txt"), m.faviconUrl("file:///C:/memo.txt", 32));
  assert.deepEqual(fetched, ["https://no-favicon.invalid/", "chrome://settings/", "file:///C:/memo.txt"]);
});

test("hasFavicon: 돌려준 값은 참/거짓으로도 쓸 수 있다 (주소는 truthy, null은 falsy)", async () => {
  fakeFetch({ "https://a.com/": [8] });
  const m = await freshModule();
  assert.equal(Boolean(await m.hasFavicon("https://a.com/x")), true);
  assert.equal(Boolean(await m.hasFavicon("https://b.com/x")), false);
});

test("hasFavicon: 페이지 그림을 받지 못하면 warn을 남기고 null", async () => {
  const warn = console.warn;
  const warned = [];
  console.warn = (...args) => warned.push(args);
  try {
    globalThis.fetch = async (url) => {
      const pageUrl = new URL(url).searchParams.get("pageUrl");
      if (pageUrl === "https://a.com/x") return { ok: false, status: 500, arrayBuffer: async () => new ArrayBuffer(0) };
      return { ok: true, status: 200, arrayBuffer: async () => new Uint8Array(DEFAULT_BYTES).buffer };
    };
    const m = await freshModule();
    assert.equal(await m.hasFavicon("https://a.com/x"), null);
    assert.equal(warned.length, 1);
  } finally {
    console.warn = warn;
  }
});

test("hasFavicon: 기본 그림은 한 번만 받는다", async () => {
  const fetched = fakeFetch({});
  const m = await freshModule();
  await Promise.all([m.hasFavicon("https://a.com/"), m.hasFavicon("https://b.com/")]);
  await m.hasFavicon("https://c.com/");
  assert.equal(fetched.filter((url) => url === "https://no-favicon.invalid/").length, 1);
});

test("hasFavicon: 기본 그림을 못 받으면 null, 다음에 다시 받는다", async () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    let fail = true;
    const fetched = [];
    globalThis.fetch = async (url) => {
      const pageUrl = new URL(url).searchParams.get("pageUrl");
      fetched.push(pageUrl);
      if (fail) return { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
      const bytes = new Uint8Array(pageUrl === "https://a.com/" ? [5] : DEFAULT_BYTES);
      return { ok: true, status: 200, arrayBuffer: async () => bytes.buffer };
    };
    const m = await freshModule();
    assert.equal(await m.hasFavicon("https://a.com/"), null);
    fail = false;
    assert.equal(await m.hasFavicon("https://a.com/"), m.faviconUrl("https://a.com/", 32));
    assert.equal(fetched.filter((url) => url === "https://no-favicon.invalid/").length, 2);
  } finally {
    console.warn = warn;
  }
});
