// 담당: 팀원 A · 이슈 #2 · 명세: N01~N07 (F01, F02, F03, F07) · 크롬 API: C04~C08, C18, C22
// 크롬 북마크를 읽고 바꾸는 통로. 크롬을 부르는 함수는 async다.

import { recordOpened, setPending } from "./store.js";

// 최상위 폴더의 folderType → rootType
const ROOT_TYPES = {
  "bookmarks-bar": "bar",
  other: "other",
  mobile: "mobile",
  managed: "managed",
};

// 파비콘 비교에 쓰는 크기와, 파비콘이 있을 수 없는 주소 (기본 그림을 받는 데 씀)
const FAVICON_SIZE = 32;
const NO_FAVICON_PAGE = "https://no-favicon.invalid/";

// N01: 크롬 북마크를 읽어 화면과 규칙이 쓰기 쉬운 목록으로 바꾼다
export async function loadTree() {
  const [top] = await chrome.bookmarks.getTree();
  const tops = top?.children ?? [];
  const roots = {
    bar: pickRoot(tops, "bookmarks-bar"),
    other: pickRoot(tops, "other"),
    mobile: pickRoot(tops, "mobile"),
  };
  const chosen = new Set(Object.values(roots).filter(Boolean).map((root) => root.id));

  const bookmarks = [];
  const folders = [];
  // 고르지 않은 쪽(두 번째 기타 북마크 등)의 북마크도 넣는다. 북마크 관리자의 개수와 맞추기 위해서다 (F01-01)
  for (const root of tops) {
    const base = {
      rootType: ROOT_TYPES[root.folderType] ?? null,
      rootId: root.id,
      rootChosen: chosen.has(root.id),
    };
    collect(root.children ?? [], root.title, [], base, bookmarks, folders);
  }
  return { roots, bookmarks, folders };
}

// 같은 folderType이 둘이면 동기화되는 쪽, 둘 다 같으면 앞쪽을 고른다. 없으면 null
function pickRoot(tops, folderType) {
  const candidates = tops.filter((node) => node.folderType === folderType);
  const root = candidates.find((node) => node.syncing === true) ?? candidates[0];
  if (!root) return null;
  return {
    id: root.id,
    title: root.title,
    folderType: root.folderType,
    syncing: root.syncing === true,
    childIds: (root.children ?? []).map((child) => child.id),
  };
}

// 트리를 내려가며 북마크와 폴더를 펼친다. path는 최상위 폴더 아래의 폴더 이름들
function collect(nodes, folderTitle, path, base, bookmarks, folders) {
  for (const node of nodes) {
    if (node.url !== undefined) {
      const item = {
        id: node.id,
        title: node.title,
        url: node.url,
        parentId: node.parentId,
        index: node.index,
        dateAdded: node.dateAdded,
      };
      // 한 번도 안 연 북마크에는 dateLastUsed가 없다. 크롬처럼 필드를 넣지 않는다
      if (node.dateLastUsed !== undefined) item.dateLastUsed = node.dateLastUsed;
      // path는 항목마다 복사한다. 한 항목의 path를 고쳐도 다른 항목이 바뀌지 않게
      bookmarks.push({ ...item, folderTitle, ...base, path: [...path] });
      continue;
    }
    const children = node.children ?? [];
    folders.push({
      id: node.id,
      title: node.title,
      parentId: node.parentId,
      index: node.index,
      dateAdded: node.dateAdded,
      ...base,
      path: [...path],
      childIds: children.map((child) => child.id),
    });
    collect(children, node.title, [...path, node.title], base, bookmarks, folders);
  }
}

// N02: 같은 이름의 폴더가 있으면 그 폴더를, 없으면 새로 만들어 돌려준다
export async function createFolder(name, parentId) {
  const title = typeof name === "string" ? name.trim() : "";
  if (!title) throw new Error("폴더 이름이 비어 있어요");
  // 최상위(루트) 바로 아래에는 만들 수 없다 (C05)
  if (String(parentId) === "0") throw new Error("최상위에는 폴더를 만들 수 없어요");
  const children = await chrome.bookmarks.getChildren(String(parentId));
  // 북마크바·기타 북마크 같은 최상위 폴더(folderType 있음)는 같은 이름이어도 고르지 않는다
  const same = children
    .filter((node) => node.url === undefined && !node.folderType && node.title === title)
    .sort((a, b) => a.index - b.index)[0];
  if (same) return same;
  return chrome.bookmarks.create({ parentId: String(parentId), title });
}

// N03: 북마크 하나를 옮긴다. 북마크가 없으면 null
// index는 옮긴 뒤 놓일 위치다. 크롬은 같은 폴더 안에서 뒤쪽으로 옮기면 한 칸 앞에 놓으므로 그만큼 맞춘다
export async function moveBookmark(id, parentId, index) {
  const node = await findNode(id);
  if (!node) return null;
  const destination = { parentId: String(parentId) };
  // 유한한 수가 아니면(NaN, "abc", "" 등) index를 넘기지 않는다(맨 뒤). 음수는 0, 소수는 버린다
  const wanted = typeof index === "number" || (typeof index === "string" && index.trim() !== "") ? Number(index) : NaN;
  if (Number.isFinite(wanted)) {
    const count = (await chrome.bookmarks.getChildren(destination.parentId)).length;
    let target = Math.max(0, Math.trunc(wanted));
    if (node.parentId === destination.parentId) {
      target = Math.min(target, count - 1);
      if (target > node.index) target += 1;
    } else {
      // 목적지 폴더의 개수보다 크면 "Index out of bounds" 오류가 나므로 줄인다
      target = Math.min(target, count);
    }
    destination.index = target;
  }
  try {
    return await chrome.bookmarks.move(node.id, destination);
  } catch (error) {
    // 그사이 지워졌으면 null, 그 밖의 오류(목적지 없음 등)는 그대로 던진다
    if (!(await findNode(node.id))) return null;
    throw error;
  }
}

// 북마크 하나를 찾는다. 없으면 null
async function findNode(id) {
  try {
    const [node] = await chrome.bookmarks.get(String(id));
    return node ?? null;
  } catch {
    return null;
  }
}

// N04: 앱 폴더 이름 바꾸기
export async function renameFolder(id, name) {
  return null;
}

// N05: 안의 북마크를 상위 폴더로 꺼낸 뒤 폴더만 삭제. 꺼낸 북마크 수를 돌려준다
// 꺼낸 것은 폴더가 있던 자리에 원래 순서대로 놓는다. 안의 폴더도 함께 꺼내지만(비어야 지울 수 있다) 세지 않는다
// 중간에 이동이 실패하면 일부만 꺼낸 채 오류를 던진다 (이미 꺼낸 것은 상위 폴더에 남는다)
export async function deleteFolderKeepChildren(id) {
  const [folder] = await chrome.bookmarks.get(String(id));
  // 관리자가 정한 폴더(managed)는 바꿀 수 없다
  if (folder.unmodifiable) throw new Error("바꿀 수 없는 폴더예요");
  if (folder.url !== undefined) throw new Error("폴더가 아니에요");
  if (folder.folderType) throw new Error("북마크바·기타 북마크·모바일 북마크는 지울 수 없어요");

  const children = await chrome.bookmarks.getChildren(folder.id);
  let placed = 0;
  let moved = 0;
  if (children.length > 0) {
    // 꺼내는 이동이 직접 옮김으로 기록되지 않게, 저장이 끝난 뒤에 옮긴다
    await setPending(children.map((child) => ({ id: child.id, toParentId: folder.parentId })));
    for (const child of children) {
      const result = await moveBookmark(child.id, folder.parentId, folder.index + placed);
      if (!result) continue;
      placed++;
      if (result.url !== undefined) moved++;
    }
  }
  // removeTree는 쓰지 않는다(안의 북마크까지 지워짐). 비어 있지 않으면 크롬이 오류를 낸다
  await chrome.bookmarks.remove(folder.id);
  return moved;
}

// N06: 연 시각을 기록한 뒤 주소를 연다. javascript: 주소(또는 해석할 수 없는 주소)면 열지 않고 false를 돌려준다
// 모든 주소를 chrome.tabs로 연다. 현재 탭은 이 탭의 id로, 새 탭은 뒤에 연다
export async function openBookmark(bookmark, { newTab = false } = {}) {
  const url = bookmark?.url;
  if (typeof url !== "string" || url === "") throw new Error("열 주소가 없어요");
  if (!isOpenable(url)) return false;

  try {
    await recordOpened(bookmark.id);
  } catch (error) {
    console.warn("연 시각을 기록하지 못했어요", error);
  }

  if (newTab) {
    await chrome.tabs.create({ url, active: false });
    return;
  }
  const tab = await chrome.tabs.getCurrent();
  if (tab?.id === undefined) throw new Error("현재 탭을 찾지 못했어요");
  await chrome.tabs.update(tab.id, { url });
}

// 크롬과 같은 방식(URL 해석)으로 javascript: 주소를 가린다. 해석하지 못한 주소도 열지 않는다
function isOpenable(url) {
  try {
    return new URL(url).protocol !== "javascript:";
  } catch {
    return false;
  }
}

// N07: _favicon 주소 만들기
export function faviconUrl(url, size = 32) {
  return chrome.runtime.getURL("/_favicon/") + "?pageUrl=" + encodeURIComponent(url) + "&size=" + size;
}

// N07: 쓸 파비콘 주소를 돌려준다. 원래 주소에 없으면 첫 페이지 주소로 다시 찾고, 둘 다 없으면 null
// 파비콘은 페이지 주소 단위로 저장되므로, 받은 그림이 기본 그림과 다른지로 있는지를 본다
export async function hasFavicon(url) {
  if (typeof url !== "string") return null;
  try {
    const blank = await loadDefaultIcon();
    if (!sameBytes(await readIcon(url), blank)) return faviconUrl(url, FAVICON_SIZE);
    const home = homePage(url);
    if (!home || home === url) return null;
    return sameBytes(await readIcon(home), blank) ? null : faviconUrl(home, FAVICON_SIZE);
  } catch (error) {
    console.warn("파비콘을 확인하지 못했어요", error);
    return null;
  }
}

// 기본 그림은 한 번만 받아 둔다. 받지 못했으면 다음에 다시 받는다
let defaultIcon = null;
function loadDefaultIcon() {
  defaultIcon ??= readIcon(NO_FAVICON_PAGE).catch((error) => {
    defaultIcon = null;
    throw error;
  });
  return defaultIcon;
}

// 확장 프로그램 안의 _favicon 주소에서 그림을 받는다 (밖으로 보내지 않음)
async function readIcon(pageUrl) {
  const response = await fetch(faviconUrl(pageUrl, FAVICON_SIZE));
  if (!response.ok) throw new Error(`파비콘을 받지 못했어요 (${response.status})`);
  return new Uint8Array(await response.arrayBuffer());
}

function sameBytes(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// http(s) 주소의 첫 페이지 주소. 그 밖의 주소(chrome://, file:// 등)는 null
function homePage(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.origin + "/";
  } catch {
    return null;
  }
}
