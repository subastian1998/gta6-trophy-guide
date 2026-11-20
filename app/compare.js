// Compare — two trophies side by side, fact against fact.
// Pick any two of the 55 and the table lines up their grade, kind,
// hidden and missable flags, confirmation state, official
// description, target, number of tips, number of sources, guide
// length and points, plus whether each is earned yet. The verdict
// line at the bottom says which one is the bigger prize (grade
// first, points as the tiebreak) and which one is the quicker win
// (fewer words in its guide is a rough proxy for a simpler job).
// Every cell comes from app/data/trophies.json — nothing is ranked
// by opinion, only by the data itself.

const GRADE_LABELS = { platinum: "Platinum", gold: "Gold", silver: "Silver", bronze: "Bronze" };
const GRADE_RANK = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
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

export function pointsOf(trophy) {
  return GRADE_POINTS[trophy.grade] ?? 1;
}

export function guideWordCount(trophy) {
  return (trophy.guide ?? "").split(/\s+/).filter(Boolean).length;
}

// Which of the two is the bigger prize: higher grade wins, and
// points break a tie (same grade always means same points, so the
// tiebreak only matters for future grades). Returns "a", "b" or
// "tie".
export function biggerPrize(a, b) {
  if (GRADE_RANK[a.grade] !== GRADE_RANK[b.grade]) return GRADE_RANK[a.grade] < GRADE_RANK[b.grade] ? "a" : "b";
  if (pointsOf(a) !== pointsOf(b)) return pointsOf(a) > pointsOf(b) ? "a" : "b";
  return "tie";
}

// Which one looks like the quicker win: fewer guide words first,
// then fewer tips, then the one already earned.
export function quickerWin(a, b, earned) {
  const aEarned = earned.has(a.name);
  const bEarned = earned.has(b.name);
  if (aEarned !== bEarned) return aEarned ? "a" : "b";
  if (guideWordCount(a) !== guideWordCount(b)) return guideWordCount(a) < guideWordCount(b) ? "a" : "b";
  const aTips = a.tips?.length ?? 0;
  const bTips = b.tips?.length ?? 0;
  if (aTips !== bTips) return aTips < bTips ? "a" : "b";
  return "tie";
}

function yesNo(value) {
  return value ? "Yes" : "No";
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

// One row of the comparison table. `winner` is "a", "b" or null;
// the winning cell gets a highlight class.
function compareRow(label, aText, bText, winner) {
  const tr = document.createElement("tr");
  tr.append(el("th", "cmp-label", label));
  const aCell = el("td", "cmp-cell" + (winner === "a" ? " is-winner" : ""), aText);
  const bCell = el("td", "cmp-cell" + (winner === "b" ? " is-winner" : ""), bText);
  tr.append(aCell, bCell);
  return tr;
}

export function renderCompare(root, { trophies, getEarned, onOpenGuide }) {
  const byId = new Map(trophies.map((t) => [t.id, t]));
  // Defaults: the missable trophy against the platinum — the two
  // trophies a new player asks about first.
  let aId = trophies.find((t) => t.missable)?.id ?? trophies[0].id;
  let bId = trophies.find((t) => t.grade === "platinum")?.id ?? trophies[0].id;

  const shell = el("div", "cmp-shell");
  shell.append(el("p", "r4-intro",
    "Pick any two trophies and line them up. Grade decides the bigger prize; " +
    "guide length hints at the quicker win. Click a name to open its full guide."));

  const pickers = el("div", "cmp-pickers");
  function makePicker(which) {
    const wrap = el("label", "cmp-picker-label", which === "a" ? "Trophy A " : "Trophy B ");
    const select = document.createElement("select");
    select.className = "cmp-select";
    for (const t of trophies) {
      const opt = document.createElement("option");
      opt.value = String(t.id);
      opt.textContent = `${t.name} (${GRADE_LABELS[t.grade]})`;
      select.append(opt);
    }
    select.value = String(which === "a" ? aId : bId);
    select.addEventListener("change", () => {
      if (which === "a") aId = Number(select.value);
      else bId = Number(select.value);
      renderTable();
    });
    wrap.append(select);
    return wrap;
  }
  pickers.append(makePicker("a"));
  const swapBtn = el("button", "cmp-swap", "⇄ Swap");
  swapBtn.type = "button";
  swapBtn.addEventListener("click", () => {
    [aId, bId] = [bId, aId];
    pickers.querySelectorAll("select").forEach((s, i) => {
      s.value = String(i === 0 ? aId : bId);
    });
    renderTable();
  });
  pickers.append(swapBtn);
  pickers.append(makePicker("b"));
  shell.append(pickers);

  const tableWrap = el("div", "cmp-table-wrap");
  shell.append(tableWrap);
  const verdict = el("p", "cmp-verdict");
  shell.append(verdict);

  function renderTable() {
    const earned = getEarned();
    const a = byId.get(aId) ?? trophies[0];
    const b = byId.get(bId) ?? trophies[0];
    tableWrap.replaceChildren();
    const table = document.createElement("table");
    table.className = "cmp-table";
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    headRow.append(el("th", "cmp-label", ""));
    const aHead = el("th", "cmp-head", a.name);
    aHead.addEventListener("click", () => onOpenGuide(a));
    const bHead = el("th", "cmp-head", b.name);
    bHead.addEventListener("click", () => onOpenGuide(b));
    headRow.append(aHead, bHead);
    thead.append(headRow);
    table.append(thead);
    const tbody = document.createElement("tbody");
    const prize = biggerPrize(a, b);
    tbody.append(compareRow("Grade", GRADE_LABELS[a.grade], GRADE_LABELS[b.grade], prize === "tie" ? null : prize));
    tbody.append(compareRow("Points", String(pointsOf(a)), String(pointsOf(b)), prize === "tie" ? null : prize));
    tbody.append(compareRow("Kind", KIND_LABELS[a.kind] ?? a.kind, KIND_LABELS[b.kind] ?? b.kind, null));
    tbody.append(compareRow("Official description", a.description, b.description, null));
    tbody.append(compareRow("Target", a.target ?? "—", b.target ?? "—", null));
    tbody.append(compareRow("Hidden on PS5", yesNo(a.hidden), yesNo(b.hidden), null));
    tbody.append(compareRow("Potentially missable", yesNo(a.missable), yesNo(b.missable), null));
    tbody.append(compareRow("Method confirmed", yesNo(a.confirmed !== false), yesNo(b.confirmed !== false), null));
    tbody.append(compareRow("Earned", earned.has(a.name) ? "✓ Earned" : "Not yet", earned.has(b.name) ? "✓ Earned" : "Not yet", null));
    const quick = quickerWin(a, b, earned);
    tbody.append(compareRow("Guide length", `${guideWordCount(a)} words`, `${guideWordCount(b)} words`, quick === "tie" ? null : quick));
    tbody.append(compareRow("Tips", String(a.tips?.length ?? 0), String(b.tips?.length ?? 0), null));
    tbody.append(compareRow("Sources cited", String(a.sources?.length ?? 0), String(b.sources?.length ?? 0), null));
    table.append(tbody);
    tableWrap.append(table);

    if (a.id === b.id) {
      verdict.textContent = "Same trophy on both sides — pick a different one to compare against.";
      return;
    }
    const prizeName = prize === "tie" ? "Neither is the bigger prize — same grade, same points." : `${prize === "a" ? a.name : b.name} is the bigger prize (${GRADE_LABELS[prize === "a" ? a.grade : b.grade]}).`;
    const quickName = quick === "tie" ? "Both look equally quick." : `${quick === "a" ? a.name : b.name} looks like the quicker win (shorter guide).`;
    verdict.textContent = `${prizeName} ${quickName}`;
  }

  renderTable();
  root.replaceChildren();
  root.append(shell);
  return { render: renderTable };
}
