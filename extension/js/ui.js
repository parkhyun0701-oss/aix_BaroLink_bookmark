// 담당: 팀원 D · 이슈 #16 · 명세: N44, N45, N46 (F02, F04, F12)
// 모든 화면 파일이 함께 쓰는 공통 화면 조각. 화면 파일(render.js, view/*, search.js)은 이 파일을 불러 쓸 수 있다.
// 이 파일은 화면 파일을 부르지 않는다. 색과 크기는 newtab.css의 공통 값(CSS 변수)을 쓴다.

// bookmarks.js(이슈 #2)에서 파비콘 정보를 얻는다. hasFavicon(url)은 async로 "쓸 파비콘 주소 또는 null"을 돌려준다 (명세 v15).
import { hasFavicon } from "./bookmarks.js";

const SVG_NS = "http://www.w3.org/2000/svg";

// 아이콘 12종 — 선으로 그린 공통 아이콘의 path 데이터
// bookmark, check, chevron, clock, close, folder, grid, history, lock, plus, search, sparkles
// 각 값은 <path d="..."> 한 개 이상을 그린다
const ICON_PATHS = {
  bookmark: ["M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3.5L6 21V4.5Z"],
  check: ["m5 12.5 4.5 4.5L19 7.5"],
  chevron: ["m9 18 6-6-6-6"],
  clock: ["M12 7v5l3.5 2", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"],
  close: ["m7 7 10 10", "M17 7 7 17"],
  folder: ["M3.5 7A2 2 0 0 1 5.5 5h4l2 2h7A2 2 0 0 1 20.5 9v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7Z"],
  grid: [
    "M4 5.5A1.5 1.5 0 0 1 5.5 4h3A1.5 1.5 0 0 1 10 5.5v3A1.5 1.5 0 0 1 8.5 10h-3A1.5 1.5 0 0 1 4 8.5v-3Z",
    "M14 5.5A1.5 1.5 0 0 1 15.5 4h3A1.5 1.5 0 0 1 20 5.5v3A1.5 1.5 0 0 1 18.5 10h-3A1.5 1.5 0 0 1 14 8.5v-3Z",
    "M4 15.5A1.5 1.5 0 0 1 5.5 14h3A1.5 1.5 0 0 1 10 15.5v3A1.5 1.5 0 0 1 8.5 20h-3A1.5 1.5 0 0 1 4 18.5v-3Z",
    "M14 15.5A1.5 1.5 0 0 1 15.5 14h3A1.5 1.5 0 0 1 20 15.5v3A1.5 1.5 0 0 1 18.5 20h-3A1.5 1.5 0 0 1 14 18.5v-3Z",
  ],
  history: ["M4 6v5h5", "M5.8 17.5A8.5 8.5 0 1 0 4 11", "M12 7.5V12l3 2"],
  lock: ["M5 12a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6Z", "M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10"],
  plus: ["M12 5v14", "M5 12h14"],
  search: ["M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z", "m16 16 4 4"],
  sparkles: [
    "m12 3 1.1 3 2.9 1.5-2.9 1.4L12 12l-1.1-3.1L8 7.5 10.9 6 12 3Z",
    "m5.5 13 .8 2.2 2.2.8-2.2.8L5.5 19l-.8-2.2-2.2-.8 2.2-.8.8-2.2Z",
    "m18.5 12 .7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z",
  ],
};

// 타일 색은 newtab.css의 공통 값 --tile-1 ~ --tile-10을 쓴다 (색 코드를 이 파일에 직접 두지 않는다. AGENTS.md 3번)
const TILE_COLOR_COUNT = 10;

// 문자열을 받아 늘 같은 타일 색 변수를 돌려준다 (같은 북마크는 늘 같은 색)
function pickTileColorVar(seed) {
  const text = String(seed || "");
  let sum = 0;
  for (let i = 0; i < text.length; i += 1) {
    sum = (sum + text.charCodeAt(i)) % TILE_COLOR_COUNT;
  }
  return `var(--tile-${sum + 1})`;
}

// 제목의 첫 "글자"(공백 제외). 이모지도 한 글자로 센다. 없으면 물음표
// text[0]은 이모지를 반쪽만 잘라 깨진 글자(�)가 되므로 쓰지 않는다.
function firstLetter(title) {
  const text = String(title || "").trim();
  if (!text) return "?";
  // Intl.Segmenter가 있으면 자모·국기·가족 이모지까지 한 글자로 센다
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const first = segmenter.segment(text)[Symbol.iterator]().next().value;
    if (first) return first.segment.toUpperCase();
  }
  // 폴백: 코드 포인트 단위로 쪼개면 기본 이모지는 통째로 나온다
  return [...text][0].toUpperCase();
}

// 파비콘 확인 결과를 새 탭이 열려 있는 동안 캐시한다 (주소 → hasFavicon 결과 Promise)
// renderAll이 아이콘을 여러 번 다시 그려도 같은 주소는 _favicon 요청을 한 번만 보낸다
const faviconCache = new Map();

function cachedHasFavicon(url) {
  if (faviconCache.has(url)) return faviconCache.get(url);
  const promise = Promise.resolve(hasFavicon(url)).catch(() => null);
  faviconCache.set(url, promise);
  return promise;
}

// N46: 선으로 그린 공통 아이콘을 만든다. 없는 이름이면 빈 <svg>
export function icon(name, size = 20) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.8");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("icon");

  const paths = ICON_PATHS[name];
  if (!paths) return svg; // 없는 이름이면 그릴 path가 없는 빈 요소

  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  }
  return svg;
}

// N44: 색 타일 위에 파비콘을 올린 앱 아이콘을 만든다. 파비콘이 없으면 제목의 첫 글자를 넣는다
// 요소를 바로 돌려줘야 하므로(동기), 먼저 첫 글자 타일을 만들고 파비콘은 async로 확인해 있으면 교체한다.
// 모양은 newtab.css의 .app-icon 클래스를 쓰고, 크기처럼 입력으로 바뀌는 값만 인라인으로 둔다.
export function appIcon(bookmark = {}, size = 56) {
  const { title = "", url = "" } = bookmark;

  const tile = document.createElement("span");
  tile.className = "app-icon";
  tile.style.width = `${size}px`;
  tile.style.height = `${size}px`;
  tile.style.fontSize = `${Math.round(size * 0.4)}px`;
  tile.style.backgroundColor = pickTileColorVar(title || url);

  // 먼저 첫 글자로 채운다 (파비콘이 없거나 아직 확인 전인 기본 모양)
  tile.textContent = firstLetter(title);

  // http(s) 주소만 파비콘을 확인한다. 확인되면 첫 글자를 지우고 파비콘으로 바꾼다
  if (typeof url === "string" && /^https?:/i.test(url)) {
    cachedHasFavicon(url).then((iconUrl) => {
      if (!iconUrl) return; // 파비콘이 없으면 첫 글자 그대로 둔다
      const img = document.createElement("img");
      img.src = iconUrl;
      img.alt = "";
      img.setAttribute("aria-hidden", "true");
      img.className = "app-icon__img";
      const inner = Math.round(size * 0.6);
      img.width = inner;
      img.height = inner;
      // 파비콘 로딩이 실패하면 첫 글자로 되돌린다
      img.addEventListener("error", () => {
        img.remove();
        tile.textContent = firstLetter(title);
      });
      tile.textContent = "";
      tile.appendChild(img);
    });
  }

  return tile;
}

// N45: 짧은 안내 문구를 #toast 칸에 띄우고 시간이 지나면 지운다. 한 번에 하나만 표시한다
// options: { actionLabel, onAction, duration }. actionLabel이 있으면 버튼을 함께 보여 주고 누르면 onAction을 부른다
let toastTimer = null;

export function showToast(message, { actionLabel, onAction, duration = 2200 } = {}) {
  const toast = document.getElementById("toast");
  if (!toast) return; // #toast 칸이 없으면 조용히 지나간다

  // 이전 문구를 지우고(한 번에 하나만) 타이머도 끈다
  if (toastTimer !== null) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  toast.replaceChildren();

  // 체크 뱃지 + 문구. 모양은 newtab.css의 .toast__badge를 쓴다
  const badge = document.createElement("span");
  badge.className = "toast__badge";
  badge.appendChild(icon("check", 14));
  toast.appendChild(badge);

  const text = document.createElement("span");
  text.className = "toast__text";
  text.textContent = String(message ?? "");
  toast.appendChild(text);

  // actionLabel이 있으면 버튼([되돌리기] 등)을 함께 보여 준다
  if (actionLabel) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "toast__action";
    button.textContent = actionLabel;
    button.addEventListener("click", () => {
      // onAction에서 오류가 나도 토스트는 반드시 닫는다
      try {
        if (typeof onAction === "function") onAction();
      } finally {
        hideToast();
      }
    });
    toast.appendChild(button);
  }

  toast.classList.add("is-visible");

  if (duration > 0) {
    toastTimer = setTimeout(hideToast, duration);
  }
}

function hideToast() {
  const toast = document.getElementById("toast");
  if (toast) toast.classList.remove("is-visible");
  if (toastTimer !== null) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
}
