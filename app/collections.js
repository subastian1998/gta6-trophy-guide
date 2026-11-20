// Collections — themed sets of trophies, each with its own progress.
// A set is a slice of the official 55 chosen by one rule: a kind, a
// grade band, the hidden flag, the unconfirmed flag, or the missable
// flag. Nothing here invents a trophy: every set is computed from
// app/data/trophies.json at render time, so the counts always agree
// with the checklist.
//
// Sets shown, in order:
//   The story arc — every story trophy, in list order.
//   Gold & platinum — the three trophies above silver.
//   The hidden ones — the 28 trophies hidden on PS5.
//   Unconfirmed methods — the five with no confirmed unlock yet.
//   The missable one — Positive Mental Attitude, alone in its set.
//   One set per remaining kind: collectibles, activities, robbery,
//   combat, money, 100% completion.
// Each set card shows earned/total, a progress bar, and the trophy
// names; clicking a name opens that trophy's guide.

const GRADE_POINTS = { platinum: 10, gold: 5, silver: 3, bronze: 1 };

const KIND_SET_META = {
  collectibles: {
    title: "Collectibles",
    blurb: "Every hidden package, letter and stunt jump the 100% checklist counts.",
  },
  activities: {
    title: "Side activities",
    blurb: "Races, sports, minigames and odd jobs — the long tail of the list.",
  },
  robbery: {
    title: "Heists & robberies",
    blurb: "The scores. Plan them, run them, walk away richer.",
  },
  combat: {
    title: "Combat",
    blurb: "Gunplay trophies — accuracy, variety and getting out alive.",
  },
  money: {
    title: "Money makers",
    blurb: "Ways to get rich in Leonida, legal or otherwise.",
  },
  completion: {
    title: "100% completion",
    blurb: "The checklist itself, plus the platinum it unlocks.",
  },
};

const GRADE_LABELS = { platinum: "Platinum", gold: "Gold", silver: "Silver", bronze: "Bronze" };

// Build the set list from the trophy data. Pure: no DOM, no storage,
// so the same input always yields the same sets in the same order.
export function buildCollections(trophies) {
  const byKind = (kind) => trophies.filter((t) => t.kind === kind);
  const sets = [];
  sets.push({
    id: "story",
    title: "The story arc",
    blurb: "All 18 story trophies, from the opening mission to the finale. Play the missions in order and these follow.",
    trophies: byKind("story"),
  });
  sets.push({
    id: "top-grades",
    title: "Gold & platinum",
    blurb: "The three trophies above silver — the platinum and its two gold companions.",
    trophies: trophies.filter((t) => t.grade === "gold" || t.grade === "platinum"),
  });
  sets.push({
    id: "hidden",
    title: "The hidden ones",
    blurb: "28 trophies are hidden on PS5: their descriptions stay secret until they pop. Earn them to reveal them.",
    trophies: trophies.filter((t) => t.hidden),
  });
  sets.push({
    id: "unconfirmed",
    title: "Unconfirmed methods",
    blurb: "Five trophies have no confirmed unlock method at launch. This guide does not invent one for them.",
    trophies: trophies.filter((t) => t.confirmed === false),
  });
  sets.push({
    id: "missable",
    title: "The missable one",
    blurb: "One trophy can be missed: meditate with Lucia in Chapter 1, before the chapter ends.",
    trophies: trophies.filter((t) => t.missable),
  });
  for (const kind of ["collectibles", "activities", "robbery", "combat", "money", "completion"]) {
    const meta = KIND_SET_META[kind];
    sets.push({ id: `kind-${kind}`, title: meta.title, blurb: meta.blurb, trophies: byKind(kind) });
  }
  return sets;
}

// Earned/total for one set, plus the points it is worth.
export function collectionProgress(set, earned) {
  const total = set.trophies.length;
  const got = set.trophies.filter((t) => earned.has(t.name)).length;
  const pointsTotal = set.trophies.reduce((n, t) => n + (GRADE_POINTS[t.grade] ?? 1), 0);
  const pointsGot = set.trophies
    .filter((t) => earned.has(t.name))
    .reduce((n, t) => n + (GRADE_POINTS[t.grade] ?? 1), 0);
  return { total, got, pct: total === 0 ? 0 : Math.round((got / total) * 100), pointsTotal, pointsGot };
}

// The single most complete set, for a one-line summary.
export function bestCollection(sets, earned) {
  let best = null;
  let bestPct = -1;
  for (const set of sets) {
    const p = collectionProgress(set, earned);
    if (p.pct > bestPct || (p.pct === bestPct && p.got > (best ? collectionProgress(best, earned).got : 0))) {
      best = set;
      bestPct = p.pct;
    }
  }
  return best ? { set: best, ...collectionProgress(best, earned) } : null;
}

// Which sets still have anything left in them, in set order.
export function incompleteCollections(sets, earned) {
  return sets.filter((set) => collectionProgress(set, earned).got < set.trophies.length);
}

// Sets ranked by completion, best first (ties broken by more
// trophies earned). The top of this ranking is the closest finish.
export function rankedCollections(sets, earned) {
  return sets
    .map((set) => ({ set, ...collectionProgress(set, earned) }))
    .sort((a, b) => b.pct - a.pct || b.got - a.got || a.set.title.localeCompare(b.set.title));
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function buildSetCard(set, earned, onOpenGuide) {
  const p = collectionProgress(set, earned);
  const card = el("article", "col-card" + (p.got === p.total ? " is-complete" : ""));
  const head = el("div", "col-head");
  head.append(el("h3", "col-title", set.title));
  const count = el("span", "col-count", `${p.got}/${p.total} earned`);
  head.append(count);
  card.append(head);
  card.append(el("p", "col-blurb", set.blurb));
  const track = el("div", "col-track");
  const fill = el("div", "col-fill");
  fill.style.width = `${p.pct}%`;
  track.append(fill);
  card.append(track);
  const meta = el("p", "col-meta", `${p.pct}% complete · ${p.pointsGot}/${p.pointsTotal} points`);
  card.append(meta);
  const list = el("ul", "col-list");
  for (const t of set.trophies) {
    const li = el("li", "col-item" + (earned.has(t.name) ? " is-earned" : ""));
    const badge = el("span", `col-grade grade-${t.grade}`, GRADE_LABELS[t.grade]);
    const nameBtn = el("button", "col-name", t.name);
    nameBtn.type = "button";
    nameBtn.addEventListener("click", () => onOpenGuide(t));
    li.append(badge, nameBtn);
    if (earned.has(t.name)) li.append(el("span", "col-check", "✓"));
    if (t.missable) li.append(el("span", "col-flag", "missable"));
    if (t.hidden && !earned.has(t.name)) li.append(el("span", "col-flag", "hidden"));
    list.append(li);
  }
  card.append(list);
  return card;
}

export function renderCollections(root, { trophies, getEarned, onOpenGuide }) {
  const sets = buildCollections(trophies);
  function render() {
    const earned = getEarned();
    root.replaceChildren();
    const intro = el("p", "r4-intro",
      "The 55 trophies grouped into themed sets. A set is finished when every trophy in it is earned — " +
      "finish a set and its card turns green.");
    root.append(intro);
    const best = bestCollection(sets, earned);
    if (best) {
      const summary = el("p", "r4-summary",
        best.pct === 100
          ? `Best set: ${best.set.title} — complete at ${best.got}/${best.total}.`
          : `Closest set: ${best.set.title} at ${best.pct}% (${best.got}/${best.total}). ` +
            `${incompleteCollections(sets, earned).length} of ${sets.length} sets still have trophies left.`);
      root.append(summary);
    }
    const grid = el("div", "col-grid");
    for (const set of sets) grid.append(buildSetCard(set, earned, onOpenGuide));
    root.append(grid);
    const ranked = rankedCollections(sets, earned);
    const rankWrap = el("div", "col-ranked");
    rankWrap.append(el("h3", "col-ranked-title", "Closest to finished"));
    const rankList = el("ol", "col-ranked-list");
    for (const r of ranked.slice(0, 5)) {
      rankList.append(el("li", null, `${r.set.title} — ${r.pct}% (${r.got}/${r.total})`));
    }
    rankWrap.append(rankList);
    root.append(rankWrap);
  }
  render();
  return { render };
}
