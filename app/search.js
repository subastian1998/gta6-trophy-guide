// Advanced search — a second, deeper search than the checklist's
// single box. It splits the query into words and requires EVERY word
// to match somewhere (AND search), looks in the name, the official
// description, the guide, the target and the trophy's searchKeywords,
// and adds filters the checklist does not have: hidden only, missable
// only, unconfirmed only, unearned only, and a minimum-points floor.
// Matches are highlighted in the results. Everything is computed
// from app/data/trophies.json; nothing is fetched.

const GRADE_LABELS = { platinum: "Platinum", gold: "Gold", silver: "Silver", bronze: "Bronze" };
const GRADE_POINTS = { platinum: 10, gold: 5, silver: 3, bronze: 1 };
const KIND_LABELS = {
  story: "Story",
  missable: "Missable",
  collectibles: "Collectibles",
  activities: "Activities",
  robbery: "Robbery",
  combat: "Combat",
  money: "Money",
  completion: "100% completion",
  online: "Online",
};
const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };

// Split a query into lowercased words, dropping empties and
// one-letter words (a lone "a" matches almost everything).
export function splitQuery(query) {
  return (query ?? "")
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((w) => w.length > 1);
}

// All the text one trophy can be found through, lowercased once.
export function searchableText(trophy) {
  return [
    trophy.name,
    trophy.description,
    trophy.guide ?? "",
    trophy.target ?? "",
    (trophy.searchKeywords ?? []).join(" "),
    KIND_LABELS[trophy.kind] ?? trophy.kind,
    GRADE_LABELS[trophy.grade] ?? trophy.grade,
  ]
    .join(" ")
    .toLowerCase();
}

// True when every query word appears in the trophy's searchable text.
export function matchesAllWords(trophy, words) {
  if (words.length === 0) return true;
  const hay = searchableText(trophy);
  return words.every((w) => hay.includes(w));
}

// The filter state: grades is a set of grade keys to keep (empty
// means all), kinds a set of kind keys (empty means all).
export function defaultSearchFilters() {
  return {
    grades: new Set(),
    kinds: new Set(),
    hiddenOnly: false,
    missableOnly: false,
    unconfirmedOnly: false,
    unearnedOnly: false,
    minPoints: 0,
    sort: "default",
  };
}

export function applySearchFilters(trophies, earned, words, filters) {
  let out = trophies.filter((t) => matchesAllWords(t, words));
  if (filters.grades.size > 0) out = out.filter((t) => filters.grades.has(t.grade));
  if (filters.kinds.size > 0) out = out.filter((t) => filters.kinds.has(t.kind));
  if (filters.hiddenOnly) out = out.filter((t) => t.hidden);
  if (filters.missableOnly) out = out.filter((t) => t.missable);
  if (filters.unconfirmedOnly) out = out.filter((t) => t.confirmed === false);
  if (filters.unearnedOnly) out = out.filter((t) => !earned.has(t.name));
  if (filters.minPoints > 0) out = out.filter((t) => (GRADE_POINTS[t.grade] ?? 1) >= filters.minPoints);
  if (filters.sort === "name") out = [...out].sort((a, b) => a.name.localeCompare(b.name));
  if (filters.sort === "grade") out = [...out].sort((a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || a.id - b.id);
  if (filters.sort === "points") out = [...out].sort((a, b) => (GRADE_POINTS[b.grade] ?? 1) - (GRADE_POINTS[a.grade] ?? 1) || a.id - b.id);
  return out;
}

// Which words of the query actually matched this trophy, for the
// "matched: ..." line under a result.
export function matchedWords(trophy, words) {
  const hay = searchableText(trophy);
  return words.filter((w) => hay.includes(w));
}

// Recent searches, kept in this browser only: the last five distinct
// queries, newest first. They are a shortcut, not a history log —
// nothing is sent anywhere and clearing them is one call.
export const RECENT_SEARCH_KEY = "gta6-trophy-guide-recent-searches-v1";
export const RECENT_SEARCH_LIMIT = 5;

export function loadRecentSearches() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_SEARCH_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((q) => typeof q === "string" && q.trim().length > 1).slice(0, RECENT_SEARCH_LIMIT) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearches(queries) {
  try {
    localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(queries.slice(0, RECENT_SEARCH_LIMIT)));
  } catch {
    // Storage full or unavailable: recent searches simply do not persist.
  }
}

export function recordRecentSearch(query) {
  const clean = (query ?? "").trim().toLowerCase();
  if (clean.length < 2) return loadRecentSearches();
  const rest = loadRecentSearches().filter((q) => q !== clean);
  const next = [clean, ...rest].slice(0, RECENT_SEARCH_LIMIT);
  saveRecentSearches(next);
  return next;
}

// Escape user text before it goes into innerHTML for highlighting.
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Wrap each occurrence of any query word in <mark>. Longest words
// first so a short word inside a longer one does not split it.
export function highlightMatches(text, words) {
  const safe = escapeHtml(text);
  const sorted = [...words].sort((a, b) => b.length - a.length);
  let out = safe;
  for (const w of sorted) {
    const re = new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    out = out.replace(re, "<mark>$1</mark>");
  }
  return out;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function checkRow(label, checked, onChange) {
  const lab = el("label", "adv-check");
  const box = document.createElement("input");
  box.type = "checkbox";
  box.checked = checked;
  box.addEventListener("change", () => onChange(box.checked));
  lab.append(box, document.createTextNode(label));
  return lab;
}

export function renderSearch(root, { trophies, getEarned, onOpenGuide }) {
  const filters = defaultSearchFilters();
  let query = "";
  const state = { results: trophies };

  const panel = el("div", "adv-panel");
  const intro = el("p", "r4-intro",
    "Search every word of the guide at once. Type several words and only trophies matching ALL of them are shown — " +
    "for example “fishing gold” finds gold trophies whose guide mentions fishing.");
  panel.append(intro);

  const queryRow = el("div", "adv-query-row");
  const queryInput = document.createElement("input");
  queryInput.type = "search";
  queryInput.className = "adv-query";
  queryInput.placeholder = "Try: chapter 1 meditation · fishing · 100% · hidden";
  queryInput.setAttribute("aria-label", "Advanced search query");
  queryInput.addEventListener("input", () => {
    query = queryInput.value;
    if (splitQuery(query).length > 0) recordRecentSearch(query);
    run();
  });
  queryRow.append(queryInput);
  const clearBtn = el("button", "adv-clear", "Clear");
  clearBtn.type = "button";
  clearBtn.addEventListener("click", () => {
    query = "";
    queryInput.value = "";
    filters.grades.clear();
    filters.kinds.clear();
    filters.hiddenOnly = false;
    filters.missableOnly = false;
    filters.unconfirmedOnly = false;
    filters.unearnedOnly = false;
    filters.minPoints = 0;
    filters.sort = "default";
    buildFilterRows();
    run();
  });
  queryRow.append(clearBtn);
  panel.append(queryRow);

  const filterBox = el("div", "adv-filters");
  panel.append(filterBox);

  const sortRow = el("div", "adv-sort-row");
  const sortLabel = el("label", "adv-sort-label", "Sort ");
  const sortSelect = document.createElement("select");
  sortSelect.className = "adv-sort";
  for (const [value, label] of [["default", "List order"], ["name", "Name A–Z"], ["grade", "Grade (best first)"], ["points", "Points (most first)"]]) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    sortSelect.append(opt);
  }
  sortSelect.addEventListener("change", () => {
    filters.sort = sortSelect.value;
    run();
  });
  sortLabel.append(sortSelect);
  sortRow.append(sortLabel);
  const pointsLabel = el("label", "adv-sort-label", "Min points ");
  const pointsSelect = document.createElement("select");
  pointsSelect.className = "adv-sort";
  for (const [value, label] of [[0, "Any"], [3, "3+ (silver or better)"], [5, "5+ (gold or better)"], [10, "10 (platinum only)"]]) {
    const opt = document.createElement("option");
    opt.value = String(value);
    opt.textContent = label;
    pointsSelect.append(opt);
  }
  pointsSelect.addEventListener("change", () => {
    filters.minPoints = Number(pointsSelect.value);
    run();
  });
  pointsLabel.append(pointsSelect);
  sortRow.append(pointsLabel);
  panel.append(sortRow);

  const countLine = el("p", "adv-count");
  panel.append(countLine);
  const recentEl = el("p", "adv-recent");
  panel.append(recentEl);
  const resultsEl = el("div", "adv-results");
  panel.append(resultsEl);

  function buildFilterRows() {
    filterBox.replaceChildren();
    const gradeGroup = el("div", "adv-group");
    gradeGroup.append(el("span", "adv-group-label", "Grades:"));
    for (const g of ["platinum", "gold", "silver", "bronze"]) {
      gradeGroup.append(checkRow(GRADE_LABELS[g], filters.grades.has(g), (on) => {
        if (on) filters.grades.add(g);
        else filters.grades.delete(g);
        run();
      }));
    }
    filterBox.append(gradeGroup);
    const kindGroup = el("div", "adv-group");
    kindGroup.append(el("span", "adv-group-label", "Kinds:"));
    for (const k of Object.keys(KIND_LABELS)) {
      if (trophies.filter((t) => t.kind === k).length === 0) continue;
      kindGroup.append(checkRow(KIND_LABELS[k], filters.kinds.has(k), (on) => {
        if (on) filters.kinds.add(k);
        else filters.kinds.delete(k);
        run();
      }));
    }
    filterBox.append(kindGroup);
    const flagGroup = el("div", "adv-group");
    flagGroup.append(el("span", "adv-group-label", "Only:"));
    flagGroup.append(checkRow("Hidden on PS5", filters.hiddenOnly, (on) => { filters.hiddenOnly = on; run(); }));
    flagGroup.append(checkRow("Missable", filters.missableOnly, (on) => { filters.missableOnly = on; run(); }));
    flagGroup.append(checkRow("Method unconfirmed", filters.unconfirmedOnly, (on) => { filters.unconfirmedOnly = on; run(); }));
    flagGroup.append(checkRow("Not earned yet", filters.unearnedOnly, (on) => { filters.unearnedOnly = on; run(); }));
    filterBox.append(flagGroup);
  }

  function renderRecent() {
    recentEl.replaceChildren();
    const recent = loadRecentSearches();
    if (recent.length === 0) return;
    recentEl.append(el("span", "adv-recent-label", "Recent searches:"));
    for (const q of recent) {
      const chip = el("button", "adv-recent-chip", q);
      chip.type = "button";
      chip.addEventListener("click", () => {
        query = q;
        queryInput.value = q;
        run();
      });
      recentEl.append(chip);
    }
  }

  function run() {
    const earned = getEarned();
    const words = splitQuery(query);
    state.results = applySearchFilters(trophies, earned, words, filters);
    countLine.textContent =
      `${state.results.length} of ${trophies.length} trophies` +
      (words.length ? ` matching all of: ${words.map((w) => `“${w}”`).join(", ")}` : " (no query — showing everything the filters allow)") +
      ".";
    renderRecent();
    resultsEl.replaceChildren();
    if (state.results.length === 0) {
      resultsEl.append(el("p", "adv-empty", "No trophies match. Drop a word or clear a filter."));
      return;
    }
    for (const t of state.results) {
      const item = el("article", "adv-item" + (earned.has(t.name) ? " is-earned" : ""));
      const top = el("div", "adv-item-top");
      top.append(el("span", `adv-grade grade-${t.grade}`, GRADE_LABELS[t.grade]));
      const name = el("button", "adv-name", t.name);
      name.type = "button";
      name.addEventListener("click", () => onOpenGuide(t));
      top.append(name);
      if (earned.has(t.name)) top.append(el("span", "adv-earned", "✓ Earned"));
      item.append(top);
      const desc = document.createElement("p");
      desc.className = "adv-desc";
      desc.innerHTML = words.length ? highlightMatches(t.description, words) : escapeHtml(t.description);
      item.append(desc);
      const meta = el("p", "adv-meta",
        `${KIND_LABELS[t.kind] ?? t.kind} · ${GRADE_POINTS[t.grade] ?? 1} pt${(GRADE_POINTS[t.grade] ?? 1) === 1 ? "" : "s"}` +
        (t.hidden ? " · Hidden on PS5" : "") +
        (t.missable ? " · Potentially missable" : "") +
        (t.confirmed === false ? " · Method unconfirmed" : ""));
      item.append(meta);
      if (words.length) {
        item.append(el("p", "adv-matched", `Matched: ${matchedWords(t, words).join(", ")}`));
      }
      resultsEl.append(item);
    }
  }

  buildFilterRows();
  run();
  root.replaceChildren();
  root.append(panel);
  return { render: run };
}
