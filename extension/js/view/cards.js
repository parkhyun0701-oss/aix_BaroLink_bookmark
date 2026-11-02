// 담당: 팀원 D · 이슈 #17 · 명세: N31 (F06, F09, F10) · 크롬 API: C19~C21
// 화면 파일끼리는 서로 부르지 않는다 (공통 조각은 ui.js). 크롬은 bookmarks.js와 store.js를 거친다 (권한 요청과 topSites만 예외).
// 이 PR은 P1(F06-01~03·05~06)만 다룬다. 고정 제안 카드·고르기 창(F06-07, F09, F10)은 P2 브랜치에서 한다.

import { applyPlan } from "../organize.js";
import { setFirstCard } from "../store.js";
import { appIcon, icon, showToast } from "../ui.js";

// 그리는 칸과 팝업을 붙이는 칸 (newtab.html)
const SLOT_ID = "organize-suggestion";
const DIALOG_HOST_ID = "dialogs";
const ORGANIZE_DIALOG_ID = "dialog-organize";

// 분류 단계(step)별 한국어 이름 (F06-03 근거 표시에 쓴다)
const STEP_LABEL = { site: "사이트", suffix: "주소 끝", keyword: "제목 키워드" };

// 칸을 비운다. 그리기 함수는 여러 번 불려도 결과가 같아야 한다 (자기 칸을 비우고 다시 그린다)
function clearSlot(slot) {
  slot.replaceChildren();
}

// rest는 명세상 "폴더에 안 들어간 북마크 수"(숫자)다. 혹시 배열로 오면 길이로 센다 (명세 N20 확정 전 안전장치)
function restCount(plan) {
  if (Array.isArray(plan.rest)) return plan.rest.length;
  return typeof plan.rest === "number" ? plan.rest : 0;
}

// 폴더 계획의 요약 문구를 만든다: "영상 8 · 학교 6 · … · 나머지 N개는 그대로"
function planSummary(plan) {
  const parts = plan.folders.map((folder) => `${folder.name} ${folder.items.length}`);
  const rest = restCount(plan);
  if (rest > 0) parts.push(`나머지 ${rest}개는 그대로`);
  return parts.join(" · ");
}

// 분류 근거가 "제목 키워드"라서 사람이 확인하는 게 좋은 북마크인가 (F06-05)
// classify의 출력은 { step: "site" | "suffix" | "keyword", needsCheck }이다 (명세 N17).
function needsCheck(reason) {
  if (!reason || typeof reason !== "object") return false;
  if (typeof reason.needsCheck === "boolean") return reason.needsCheck;
  return reason.step === "keyword";
}

// 폴더의 분류 근거를 한 줄로 요약한다 (F06-03). 예: "사이트 2 · 제목 키워드 1"
// reasons는 folder.items와 같은 길이이고 각 원소는 { step, rule, needsCheck }이다 (명세 N20)
function folderReasonSummary(folder) {
  const reasons = Array.isArray(folder.reasons) ? folder.reasons : [];
  const counts = new Map();
  for (const reason of reasons) {
    const step = reason && reason.step;
    const label = STEP_LABEL[step];
    if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  if (counts.size === 0) return "";
  return [...counts].map(([label, n]) => `${label} ${n}`).join(" · ");
}

// 공통 버튼 하나를 만든다
function makeButton(label, { variant = "", onClick, ariaLabel } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = variant ? `btn ${variant}` : "btn";
  if (label) button.textContent = label;
  if (ariaLabel) button.setAttribute("aria-label", ariaLabel);
  if (onClick) button.addEventListener("click", onClick);
  return button;
}

// N31: 첫 정리 카드를 #organize-suggestion 칸에 그린다
// actions는 render.js가 넘겨 주는 동작 묶음이다. [정리하기]가 끝나면 actions.showResultNotice(entry)를 부른다
export function showFirstCard(plan, actions) {
  const slot = document.getElementById(SLOT_ID);
  if (!slot) return;
  clearSlot(slot);
  if (!plan) return;

  // 폴더 계획만 그린다. 고정 제안(plan.type === "pin")은 P2에서 다룬다 (칸을 비운 채 돌아간다)
  if (plan.type !== "folders" || !Array.isArray(plan.folders) || plan.folders.length === 0) return;

  renderFolderCard(slot, plan, actions);
}

// 첫 정리 카드: "북마크를 이렇게 묶어 볼까요?" + 요약 + [나중에] [자세히 보기] [정리하기]
function renderFolderCard(slot, plan, actions) {
  const logo = document.createElement("span");
  logo.className = "brand__logo brand__logo--primary";
  logo.appendChild(icon("sparkles", 24));

  const text = document.createElement("div");
  text.className = "suggestion__text";

  const title = document.createElement("div");
  title.className = "suggestion__title";
  title.textContent = "북마크를 이렇게 묶어 볼까요?";

  const desc = document.createElement("div");
  desc.className = "suggestion__desc";
  desc.textContent = planSummary(plan);

  const note = document.createElement("div");
  note.className = "suggestion__note";
  note.textContent = "직접 만든 폴더와 북마크바에서 요즘 쓰는 북마크는 그대로 둬요";

  text.append(title, desc, note);

  const buttons = document.createElement("div");
  buttons.className = "actions";
  buttons.append(
    makeButton("나중에", {
      variant: "btn--ghost",
      onClick: async () => {
        clearSlot(slot);
        await setFirstCard("later");
      },
    }),
    makeButton("자세히 보기", {
      variant: "btn--ghost",
      onClick: () => showOrganizeDialog(plan, actions),
    }),
    makeButton("정리하기", {
      variant: "btn--primary",
      onClick: (event) => runApply(plan, actions, event.currentTarget, slot),
    }),
  );

  slot.append(logo, text, buttons);
}

// [정리하기]를 눌렀을 때: applyPlan으로 실제 정리 → 상태 저장 → 결과 안내 (actions.showResultNotice)
async function runApply(plan, actions, triggerButton, slot) {
  if (triggerButton) triggerButton.disabled = true;
  try {
    const entry = await applyPlan(plan, "first");
    await setFirstCard("done");
    clearSlot(slot);
    // 열려 있던 자세히 보기 창이 있으면 닫는다
    const dialog = document.getElementById(ORGANIZE_DIALOG_ID);
    if (dialog && typeof dialog.close === "function" && dialog.open) dialog.close();
    // 화면 파일을 직접 부르지 않고 render.js가 넘겨 준 동작을 부른다
    if (actions && typeof actions.showResultNotice === "function") {
      actions.showResultNotice(entry);
    }
  } catch (error) {
    console.error("정리에 실패했어요", error);
    showToast("정리하지 못했어요");
    if (triggerButton) triggerButton.disabled = false;
  }
}

// N31: 자세히 보기와 [정리하기] 창
export function showOrganizeDialog(plan, actions) {
  const host = document.getElementById(DIALOG_HOST_ID);
  if (!host || !plan || plan.type !== "folders") return;

  // 이미 열려 있으면 다시 만들지 않는다 (멱등)
  const existing = document.getElementById(ORGANIZE_DIALOG_ID);
  if (existing) existing.remove();

  const dialog = document.createElement("dialog");
  dialog.className = "dialog";
  dialog.id = ORGANIZE_DIALOG_ID;

  const panel = document.createElement("div");
  panel.className = "dialog__panel";

  // 머리말
  const header = document.createElement("div");
  header.className = "dialog__header";
  const headText = document.createElement("div");
  const title = document.createElement("div");
  title.className = "dialog__title";
  const titleLogo = document.createElement("span");
  titleLogo.className = "brand__logo brand__logo--soft";
  titleLogo.appendChild(icon("sparkles", 16));
  title.append(titleLogo, document.createTextNode("북마크 정리하기"));
  const subtitle = document.createElement("div");
  subtitle.className = "dialog__subtitle";
  subtitle.textContent = "정리하기를 누르기 전까지 기존 북마크는 바뀌지 않아요.";
  headText.append(title, subtitle);
  const closeButton = makeButton("", { variant: "btn--icon", ariaLabel: "창 닫기" });
  closeButton.appendChild(icon("close", 20));
  closeButton.addEventListener("click", () => dialog.close());
  header.append(headText, closeButton);

  // 본문: 폴더별 근거 + 북마크 목록
  const body = document.createElement("div");
  body.className = "dialog__body";
  for (const folder of plan.folders) {
    body.appendChild(renderFolderBlock(folder));
  }

  // "나머지 N개는 그대로" 안내
  const rest = restCount(plan);
  if (rest > 0) {
    const restNote = document.createElement("div");
    restNote.className = "organize__rest";
    restNote.textContent = `나머지 ${rest}개는 애매하게 분류하지 않고 지금 위치에 그대로 둘게요.`;
    body.appendChild(restNote);
  }

  // 바닥 버튼 (오른쪽 정렬)
  const footer = document.createElement("div");
  footer.className = "actions actions--end organize__footer";
  footer.append(
    makeButton("취소", { variant: "btn--ghost", onClick: () => dialog.close() }),
    makeButton("정리하기", {
      variant: "btn--primary",
      onClick: (event) => runApply(plan, actions, event.currentTarget, document.getElementById(SLOT_ID)),
    }),
  );
  body.appendChild(footer);

  panel.append(header, body);
  dialog.appendChild(panel);
  // 바깥(backdrop) 클릭으로 닫기
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  // 닫히면 DOM에서 치운다
  dialog.addEventListener("close", () => dialog.remove());

  host.appendChild(dialog);
  dialog.showModal();
}

// 폴더 하나의 블록: 폴더 이름 · 개수 · 분류 근거(F06-03) + 북마크 목록(제목 키워드엔 "확인 필요" F06-05)
// reasons는 folder 안에 있고 folder.items와 같은 길이다 (명세 N20)
function renderFolderBlock(folder) {
  const block = document.createElement("div");
  block.className = "organize__folder surface";

  const head = document.createElement("div");
  head.className = "organize__folder-head";
  const name = document.createElement("div");
  name.className = "folder__name organize__folder-name";
  name.textContent = folder.name;
  const count = document.createElement("div");
  count.className = "folder__count";
  count.textContent = `${folder.items.length}개 이동`;
  head.append(name, count);

  block.append(head);

  // F06-03: 폴더별 분류 근거 요약
  const summary = folderReasonSummary(folder);
  if (summary) {
    const reasonLine = document.createElement("div");
    reasonLine.className = "organize__reason";
    reasonLine.textContent = `분류 근거: ${summary}`;
    block.append(reasonLine);
  }

  const list = document.createElement("div");
  list.className = "list";
  const reasons = Array.isArray(folder.reasons) ? folder.reasons : [];
  for (const [itemIndex, bookmark] of folder.items.entries()) {
    list.appendChild(renderBookmarkRow(bookmark, reasons[itemIndex]));
  }
  block.append(list);

  return block;
}

// 북마크 한 줄: 아이콘 + 제목/주소 (+ "확인 필요"). 제목·주소는 textContent로만 넣는다 (innerHTML 금지)
function renderBookmarkRow(bookmark, reason) {
  const row = document.createElement("div");
  row.className = "list__row";

  row.appendChild(appIcon(bookmark, 44));

  const text = document.createElement("div");
  text.className = "list__text";
  const title = document.createElement("span");
  title.className = "title";
  title.textContent = bookmark.title || bookmark.url || "";
  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent = bookmark.url || "";
  text.append(title, meta);
  row.appendChild(text);

  if (needsCheck(reason)) {
    const flag = document.createElement("span");
    flag.className = "organize__check";
    flag.textContent = "확인 필요";
    row.appendChild(flag);
  }

  return row;
}

// N31: 고정할 북마크 고르기 창 (P2). 입력 형태는 P2를 시작할 때 정한다 (docs/file-structure.md 12번)
export function showPinPicker() {}
