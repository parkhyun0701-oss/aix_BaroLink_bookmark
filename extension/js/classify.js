// 담당: 팀원 B · 이슈 #7 · 명세: N17, N18, N24 (F05, F10)
// 분류 규칙. 계산만 한다 (크롬 API를 쓰지 않고, 필요한 값은 모두 입력으로 받는다).

// 주소에서 앞의 www.를 뗀 호스트만 꺼낸다. 해석할 수 없거나 호스트가 없으면(file:// 등) null
function hostOf(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (!host) return null;
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return null;
  }
}

// 점(.) 단위 비교: 호스트가 항목과 같거나 "." + 항목으로 끝날 때만 맞는다 (coupangeats.com은 coupang.com에 맞지 않음)
function matchesHost(host, entry) {
  return host === entry || host.endsWith("." + entry);
}

// N17: 분류표 → 주소 끝 → 제목 키워드 순서로 확인해 처음 맞는 곳에서 멈춘다
// 분류표 형태: { categories: [{ name, sites, suffixes, keywords }], noCategorySites: [] } (docs/category-definitions.md 10번)
// 주소가 noCategorySites에 맞으면 주소 끝과 제목 키워드를 보지 않고 { category: null }. 제목은 띄어쓰기를 없애지 않고 비교한다
// 출력: { category, step: "site" | "suffix" | "keyword", rule, needsCheck } 또는 { category: null }
export function classify(bookmark, categories) {
  const host = hostOf(bookmark.url);
  if (!host) return { category: null };

  // ① 분류표와 분류하지 않는 사이트를 함께 비교해, 여러 개가 맞으면 더 긴 주소를 따른다
  let best = null;
  const consider = (site, category) => {
    if (matchesHost(host, site) && (!best || site.length > best.site.length)) best = { site, category };
  };
  for (const c of categories.categories) {
    for (const site of c.sites) consider(site, c.name);
  }
  for (const site of categories.noCategorySites) consider(site, null);
  if (best) {
    if (best.category === null) return { category: null };
    return { category: best.category, step: "site", rule: best.site, needsCheck: false };
  }

  // ② 주소 끝. 항목이 "."로 시작하므로 endsWith가 곧 점 단위 비교다
  for (const c of categories.categories) {
    const suffix = c.suffixes.find((s) => host.endsWith(s));
    if (suffix) return { category: c.name, step: "suffix", rule: suffix, needsCheck: false };
  }

  // ③ 제목 키워드. 여러 카테고리에 맞으면 분류표에 먼저 적힌 카테고리를 따른다
  // 영문 키워드는 대소문자를 구분하지 않는다 (docs/category-definitions.md 5번)
  const title = (bookmark.title || "").toLowerCase();
  for (const c of categories.categories) {
    const keyword = c.keywords.find((k) => title.includes(k.toLowerCase()));
    if (keyword) return { category: c.name, step: "keyword", rule: keyword, needsCheck: true };
  }

  return { category: null };
}

// N18: 정답지와 비교해 적용률 · 정확도 계산
// 입력: samples는 [{ id, title, url }], answers는 [{ id, answer }] (answer가 null이면 분류 안 됨이 정답). id로 짝짓는다
// 정답지에 없는 샘플이 있으면 분류 안 됨과 구분할 수 없으므로 계산하지 않고 오류를 낸다
// tests/answer-key-100.json은 두 형태를 모두 가지므로 samples와 answers에 같은 배열을 넘겨도 된다
// 출력: { coverage, accuracy, wrong } (적용률, 정확도, 틀린 목록)
// 적용률 = 분류된 것 / 전체, 정확도 = 정답과 같은 것 / 분류된 것 (0~1). wrong에는 분류 안 됨으로 틀린 것도 들어간다
export function measure(samples, answers, categories) {
  const answerOf = new Map(answers.map((a) => [a.id, a.answer]));
  let classified = 0;
  let correct = 0;
  const wrong = [];
  for (const sample of samples) {
    if (!answerOf.has(sample.id)) throw new Error(`정답지에 없는 샘플: id ${sample.id}`);
    const result = classify(sample, categories);
    const answer = answerOf.get(sample.id);
    if (result.category !== null) {
      classified += 1;
      if (result.category === answer) correct += 1;
    }
    if (result.category !== answer) {
      wrong.push({ id: sample.id, title: sample.title, url: sample.url, answer, ...result });
    }
  }
  return {
    coverage: samples.length ? classified / samples.length : 0,
    accuracy: classified ? correct / classified : 0,
    wrong,
  };
}

// N24: 새 북마크마다 분류해, 분류된 카테고리와 이름이 같은 폴더를 추천 폴더로 정한다
// 출력: [{ bookmarkId, folderId }]. 분류되지 않았거나 같은 이름의 폴더가 없으면 folderId는 null(그대로 두기)
// 새 폴더를 만들자는 제안은 이 함수가 아니라 plan.js의 suggestNewFolders가 맡는다 (명세 v14)
export function suggestForNew(newBookmarks, folders, categories) {
  return [];
}
