// GTA VI Trophy Guide & Tracker: checklist, filters, spoiler mode, roadmap,
// missable warnings, and progress saved in localStorage with export/import.
// Data: app/data/trophies.json (official names/descriptions/grades + guides).
// Roadmap content: app/roadmap.js. No network requests beyond the local files.
import { PLATINUM_FACTS, ROADMAP_STAGES, MISSABLE_NOTES } from "./roadmap.js";
import { buildPlan, defaultTargetISO, nextSuggested, planProgress, planSummary } from "./planner.js";
import { initSessions } from "./sessions.js";
import { openTrophyModal } from "./trophy-modal.js";
import { initShortcuts } from "./shortcuts.js";
import { renderWeekOverview } from "./planner-week.js";

const STORAGE_KEY = "gta6-trophy-guide-v1";
const SPOILER_KEY = "gta6-trophy-guide-spoiler";
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
const GRADE_LABELS = { platinum: "Platinum", gold: "Gold", silver: "Silver", bronze: "Bronze" };

const params = new URLSearchParams(location.search);
const listEl = document.getElementById("trophyList");
const emptyEl = document.getElementById("emptyState");
const searchEl = document.getElementById("search");
const gradeEl = document.getElementById("gradeFilter");
const hideEarnedEl = document.getElementById("hideEarned");
const spoilerEl = document.getElementById("spoilerMode");
const filterNoteEl = document.getElementById("filterNote");
const spoilerNoteEl = document.getElementById("spoilerNote");
const detailEl = document.getElementById("detail");
const detailBodyEl = document.getElementById("detailBody");
const scrimEl = document.getElementById("scrim");
let detailTrophy = null;

const doc = await (await fetch("data/trophies.json")).json();
const trophies = doc.trophies;

let earned = new Set(loadEarned());
let kind = params.get("filter") && KIND_LABELS[params.get("filter")] ? params.get("filter") : "all";
let sort = "default";
let spoiler = params.get("spoiler") === "on" || localStorage.getItem(SPOILER_KEY) === "1";

function loadEarned() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((n) => trophies.some((t) => t.name === n)) : [];
  } catch {
    return [];
  }
}

function saveEarned() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned]));
}

function isStory(t) {
  return t.kind === "story";
}

function isSpoiled(t) {
  return spoiler && isStory(t) && !earned.has(t.name);
}

function saveSpoiler() {
  localStorage.setItem(SPOILER_KEY, spoiler ? "1" : "0");
}

function gradeCount(g) {
  return trophies.filter((t) => t.grade === g).length;
}

function renderProgress() {
  const n = earned.size;
  document.getElementById("earnedCount").textContent = n;
  document.getElementById("progressFill").style.width = `${(n / trophies.length) * 100}%`;
  document.getElementById("progressBar").setAttribute("aria-valuenow", String(n));
  document.getElementById("progressSub").textContent =
    `${Math.round((n / trophies.length) * 100)}% · Platinum: Vice Got a Price!` +
    (n === trophies.length ? " — all 55 earned!" : ` · ${trophies.length - n} to go`);
  document.getElementById("gradeCounts").textContent = ["platinum", "gold", "silver", "bronze"]
    .map((g) => `${earnedCountOf(g)}/${gradeCount(g)} ${GRADE_LABELS[g].toLowerCase()}`)
    .join(" · ");
  document.getElementById("kindProgress").textContent = Object.keys(KIND_LABELS)
    .map((k) => {
      const total = trophies.filter((t) => t.kind === k).length;
      const got = trophies.filter((t) => t.kind === k && earned.has(t.name)).length;
      return `${KIND_LABELS[k]} ${got}/${total}`;
    })
    .join(" · ");
}

function earnedCountOf(g) {
  return trophies.filter((t) => t.grade === g && earned.has(t.name)).length;
}

function renderKindFilters() {
  const box = document.getElementById("kindFilters");
  box.replaceChildren();
  const kinds = ["all", ...Object.keys(KIND_LABELS)];
  for (const k of kinds) {
    const inKind = k === "all" ? trophies : trophies.filter((t) => t.kind === k);
    const count = inKind.length;
    const got = inKind.filter((t) => earned.has(t.name)).length;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "kind-chip" + (kind === k ? " is-active" : "");
    b.dataset.kind = k;
    b.textContent = (k === "all" ? "All" : KIND_LABELS[k]) + " ";
    const n = document.createElement("span");
    n.className = "n";
    n.textContent = `(${got}/${count})`;
    b.append(n);
    b.addEventListener("click", () => {
      kind = k;
      renderKindFilters();
      renderList();
    });
    box.append(b);
  }
}

function matchesFilters(t) {
  if (kind !== "all" && t.kind !== kind) return false;
  if (gradeEl.value !== "all" && t.grade !== gradeEl.value) return false;
  if (hideEarnedEl.checked && earned.has(t.name)) return false;
  const q = searchEl.value.trim().toLowerCase();
  if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || (t.guide ?? "").toLowerCase().includes(q) || (t.target ?? "").toLowerCase().includes(q) || (KIND_LABELS[t.kind] ?? "").toLowerCase().includes(q))) return false;
  return true;
}

const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };

function sortShown(shown) {
  if (sort === "grade") return [...shown].sort((a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || a.id - b.id);
  if (sort === "name") return [...shown].sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "kind") return [...shown].sort((a, b) => (KIND_LABELS[a.kind] ?? "").localeCompare(KIND_LABELS[b.kind] ?? "") || a.id - b.id);
  return shown;
}

function renderList() {
  const shown = sortShown(trophies.filter(matchesFilters));
  listEl.replaceChildren();
  emptyEl.hidden = shown.length > 0;
  spoilerNoteEl.hidden = !spoiler;
  const kindText = kind === "all" ? "all kinds" : KIND_LABELS[kind].toLowerCase();
  filterNoteEl.textContent =
    `Showing ${shown.length} of ${trophies.length} trophies (${kindText}` +
    `${gradeEl.value !== "all" ? `, ${GRADE_LABELS[gradeEl.value].toLowerCase()}` : ""}` +
    `${hideEarnedEl.checked ? ", unearned only" : ""})` +
    (kind === "online" ? " — the game lists no online trophies: all 55 are single-player." : ".");
  for (const t of shown) {
    listEl.append(buildCard(t));
  }
  renderKindFilters();
  renderProgress();
  renderStats();
  renderPlanner();
}

function buildCard(t) {
  const card = document.createElement("article");
  const isEarned = earned.has(t.name);
  const spoiled = isSpoiled(t);
  card.className = "card" + (isEarned ? " is-earned" : "") + (spoiled ? " is-spoiled" : "") + (t.missable ? " is-missable" : "");
  if (t.missable && !spoiled) {
    const banner = document.createElement("p");
    banner.className = "missable-banner";
    banner.textContent = "⚠ POTENTIALLY MISSABLE — do the Chapter 1 meditation before the chapter ends. See Missables & saves.";
    card.append(banner);
  }
  const top = document.createElement("div");
  top.className = "card-top";
  const badge = document.createElement("span");
  badge.className = `grade-badge grade-${t.grade}`;
  badge.textContent = t.grade;
  const h = document.createElement("h2");
  h.textContent = spoiled ? "Hidden story trophy" : t.name;
  if (spoiled) h.className = "spoiled-name";
  top.append(badge, h);
  card.append(top);

  const desc = document.createElement("p");
  desc.className = "official";
  desc.textContent = spoiled ? "Hidden until earned — spoiler-free mode is on." : t.description;
  card.append(desc);

  const meta = document.createElement("div");
  meta.className = "meta";
  const kindTag = document.createElement("span");
  kindTag.className = "tag";
  kindTag.textContent = KIND_LABELS[t.kind] ?? t.kind;
  meta.append(kindTag);
  if (t.hidden) {
    const tag = document.createElement("span");
    tag.className = "tag hidden-tag";
    tag.textContent = "Hidden on PS5";
    meta.append(tag);
  }
  if (t.missable) {
    const tag = document.createElement("span");
    tag.className = "tag missable";
    tag.textContent = "Potentially missable";
    meta.append(tag);
  }
  if (t.confirmed === false) {
    const tag = document.createElement("span");
    tag.className = "tag unconfirmed";
    tag.textContent = "Method unconfirmed";
    meta.append(tag);
  }
  card.append(meta);

  if (t.target && !spoiled) {
    const target = document.createElement("p");
    target.className = "target";
    target.textContent = `Target: ${t.target}`;
    card.append(target);
  }

  if (!spoiled) {
    const preview = document.createElement("p");
    preview.className = "guide-preview";
    preview.textContent = t.guide;
    card.append(preview);
    if (t.sources?.length) {
      const src = document.createElement("p");
      src.className = "source-line";
      src.textContent = "Sources: " + t.sources.map((x) => x.label.split(" — ")[0]).join(" · ");
      card.append(src);
    }
  }

  const actions = document.createElement("div");
  actions.className = "card-actions";
  const guideBtn = document.createElement("button");
  guideBtn.type = "button";
  guideBtn.className = "btn-guide";
  guideBtn.textContent = spoiled ? "Guide hidden" : "Read the guide";
  guideBtn.disabled = spoiled;
  guideBtn.addEventListener("click", () => openDetail(t));
  const earnBtn = document.createElement("button");
  earnBtn.type = "button";
  earnBtn.className = "btn-earn" + (isEarned ? " is-on" : "");
  earnBtn.textContent = isEarned ? "✓ Earned" : "Mark earned";
  earnBtn.setAttribute("aria-pressed", String(isEarned));
  earnBtn.addEventListener("click", () => {
    if (earned.has(t.name)) earned.delete(t.name);
    else earned.add(t.name);
    saveEarned();
    renderList();
  });
  actions.append(guideBtn, earnBtn);
  card.append(actions);
  return card;
}

function openDetail(t) {
  detailTrophy = t;
  detailBodyEl.replaceChildren();
  const badge = document.createElement("span");
  badge.className = `grade-badge grade-${t.grade}`;
  badge.textContent = t.grade;
  const h = document.createElement("h2");
  h.textContent = t.name;
  const desc = document.createElement("p");
  desc.className = "official";
  desc.textContent = `Official description: “${t.description}”`;
  detailBodyEl.append(badge, h, desc);

  if (t.missable) {
    const warn = document.createElement("div");
    warn.className = "callout";
    const p = document.createElement("p");
    p.textContent = "Potentially missable — see the Missables & saves tab before you play past Chapter 1.";
    warn.append(p);
    detailBodyEl.append(warn);
  }
  if (t.confirmed === false) {
    const warn = document.createElement("div");
    warn.className = "callout";
    const p = document.createElement("p");
    p.textContent = "The unlock method for this trophy is not yet confirmed at launch. The description above is the only hint — do not trust a method that cites no source.";
    warn.append(p);
    detailBodyEl.append(warn);
  }

  const guideH = document.createElement("h3");
  guideH.textContent = "How to get it";
  const guideP = document.createElement("p");
  guideP.textContent = t.guide;
  detailBodyEl.append(guideH, guideP);

  if (t.tips?.length) {
    const tipsH = document.createElement("h3");
    tipsH.textContent = "Quick tips";
    const tipsList = document.createElement("ul");
    tipsList.className = "tips-list";
    for (const tip of t.tips) {
      const li = document.createElement("li");
      li.textContent = tip;
      tipsList.append(li);
    }
    detailBodyEl.append(tipsH, tipsList);
  }

  if (t.target) {
    const targetP = document.createElement("p");
    targetP.textContent = `Target: ${t.target}`;
    detailBodyEl.append(targetP);
  }

  const srcH = document.createElement("h3");
  srcH.textContent = "Sources for this guide";
  const srcList = document.createElement("ul");
  srcList.className = "sources";
  for (const s of t.sources ?? []) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = s.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = s.label;
    li.append(a);
    srcList.append(li);
  }
  const officialLi = document.createElement("li");
  officialLi.textContent = "Official name, description and grade: PlayStation trophy list, as listed by PSNProfiles and Exophase.";
  srcList.append(officialLi);
  detailBodyEl.append(srcH, srcList);

  const earnBtn = document.createElement("button");
  earnBtn.type = "button";
  earnBtn.className = "btn-earn" + (earned.has(t.name) ? " is-on" : "");
  earnBtn.textContent = earned.has(t.name) ? "✓ Earned — unmark" : "Mark earned";
  earnBtn.addEventListener("click", () => {
    if (earned.has(t.name)) earned.delete(t.name);
    else earned.add(t.name);
    saveEarned();
    renderList();
    openDetail(t);
  });
  detailBodyEl.append(earnBtn);

  const relatedBtn = document.createElement("button");
  relatedBtn.type = "button";
  relatedBtn.className = "btn-guide";
  relatedBtn.textContent = "Related trophies — what next?";
  relatedBtn.addEventListener("click", () => {
    openTrophyModal(t, trophies, earned, {
      onToggleEarned: (x) => {
        if (earned.has(x.name)) earned.delete(x.name);
        else earned.add(x.name);
        saveEarned();
        renderList();
      },
      onOpenGuide: (x) => openDetail(x),
    });
  });
  detailBodyEl.append(relatedBtn);

  detailEl.hidden = false;
  scrimEl.hidden = false;
}

function closeDetail() {
  detailTrophy = null;
  detailEl.hidden = true;
  scrimEl.hidden = true;
}

function renderRoadmap() {
  const root = document.getElementById("roadmap");
  root.replaceChildren();
  const intro = document.createElement("div");
  intro.className = "stage";
  const h = document.createElement("h2");
  h.textContent = "Roadmap to the platinum — Vice Got a Price!";
  const p = document.createElement("p");
  p.textContent =
    "Earn the other 54 trophies and the platinum follows. The route below is built from the official descriptions: which story chapters and missions, which collectibles and counts, in what order.";
  intro.append(h, p);
  const grid = document.createElement("div");
  grid.className = "fact-grid";
  for (const f of PLATINUM_FACTS) {
    const d = document.createElement("div");
    d.className = "fact";
    const num = document.createElement("div");
    num.className = "fact-num";
    num.textContent = f.num;
    const label = document.createElement("div");
    label.className = "fact-label";
    label.textContent = f.label;
    d.append(num, label);
    grid.append(d);
  }
  intro.append(grid);
  root.append(intro);
  ROADMAP_STAGES.forEach((stage, i) => {
    const s = document.createElement("div");
    s.className = "stage";
    const sh = document.createElement("h2");
    sh.textContent = stage.title;
    const st = document.createElement("p");
    st.className = "stage-time";
    st.textContent = stage.time;
    const si = document.createElement("p");
    si.textContent = stage.intro;
    s.append(sh, st, si);
    if (stage.covers) {
      const covers = document.createElement("p");
      covers.className = "stage-covers";
      covers.textContent = "Trophies in this stage: " + stage.covers;
      s.append(covers);
    }
    if (stage.table) {
      const table = document.createElement("table");
      const thead = document.createElement("thead");
      const tr = document.createElement("tr");
      for (const head of stage.table.headers) {
        const th = document.createElement("th");
        th.textContent = head;
        tr.append(th);
      }
      thead.append(tr);
      const tbody = document.createElement("tbody");
      for (const row of stage.table.rows) {
        const r = document.createElement("tr");
        for (const cell of row) {
          const td = document.createElement("td");
          td.textContent = cell;
          r.append(td);
        }
        tbody.append(r);
      }
      table.append(thead, tbody);
      s.append(table);
    }
    const ol = document.createElement("ol");
    for (const step of stage.steps) {
      const li = document.createElement("li");
      li.textContent = step;
      ol.append(li);
    }
    s.append(ol);
    root.append(s);
  });
  const src = document.createElement("p");
  src.className = "toolbar-note";
  src.textContent = "Roadmap sources: KeenGamer's GTA 6 trophy guide & platinum roadmap and Output Lag's GTA 6 trophy list (links in the footer). Counts are the game's 100% completion checklist as those guides report it.";
  root.append(src);
}

function renderMissables() {
  const root = document.getElementById("missables");
  root.replaceChildren();
  const s = document.createElement("div");
  s.className = "stage";
  const h = document.createElement("h2");
  h.textContent = MISSABLE_NOTES.title;
  const sub = document.createElement("p");
  sub.className = "stage-time";
  sub.textContent = MISSABLE_NOTES.trophy;
  s.append(h, sub);
  const warn = document.createElement("div");
  warn.className = "callout";
  const wp = document.createElement("p");
  wp.textContent =
    "Only one trophy is potentially missable. Everything else stays available after the story — but there is no mission replay, so a manual save is the only way back.";
  warn.append(wp);
  s.append(warn);
  for (const para of MISSABLE_NOTES.body) {
    const p = document.createElement("p");
    p.textContent = para;
    s.append(p);
  }
  if (MISSABLE_NOTES.ifYouMissed) {
    const missedH = document.createElement("h3");
    missedH.textContent = "What if you already missed it?";
    const missed = document.createElement("div");
    missed.className = "callout";
    const mp = document.createElement("p");
    mp.textContent = MISSABLE_NOTES.ifYouMissed;
    missed.append(mp);
    s.append(missedH, missed);
  }
  const saveH = document.createElement("h3");
  saveH.textContent = "Save plan — five saves to keep";
  const ol = document.createElement("ol");
  for (const item of MISSABLE_NOTES.savePlan) {
    const li = document.createElement("li");
    li.textContent = item;
    ol.append(li);
  }
  s.append(saveH, ol);
  const safe = document.createElement("div");
  safe.className = "callout safe";
  const sp = document.createElement("p");
  sp.textContent =
    "Cheats disable trophies and saving while active, so keep them off your trophy save entirely — use a throwaway save if you want to try them.";
  safe.append(sp);
  s.append(safe);
  root.append(s);
}

// Statistics panel: one progress ring per grade and one bar per kind.
// Rings are plain SVG circles; the filled arc is the earned share.
const RING_RADIUS = 34;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function buildRing(grade, got, total) {
  const wrap = document.createElement("div");
  wrap.className = `stat-ring ring-${grade}`;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "ring-svg");
  svg.setAttribute("width", "84");
  svg.setAttribute("height", "84");
  svg.setAttribute("viewBox", "0 0 84 84");
  const track = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  track.setAttribute("class", "ring-track");
  track.setAttribute("cx", "42");
  track.setAttribute("cy", "42");
  track.setAttribute("r", String(RING_RADIUS));
  const fill = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  fill.setAttribute("class", "ring-fill");
  fill.setAttribute("cx", "42");
  fill.setAttribute("cy", "42");
  fill.setAttribute("r", String(RING_RADIUS));
  const share = total === 0 ? 0 : got / total;
  fill.setAttribute("stroke-dasharray", `${(share * RING_CIRCUMFERENCE).toFixed(1)} ${RING_CIRCUMFERENCE.toFixed(1)}`);
  const num = document.createElementNS("http://www.w3.org/2000/svg", "text");
  num.setAttribute("class", "ring-num");
  num.setAttribute("x", "42");
  num.setAttribute("y", "47");
  num.setAttribute("text-anchor", "middle");
  num.textContent = `${got}/${total}`;
  svg.append(track, fill, num);
  const label = document.createElement("div");
  label.className = "ring-label";
  label.textContent = GRADE_LABELS[grade];
  const pct = document.createElement("div");
  pct.className = "ring-pct";
  pct.textContent = `${Math.round(share * 100)}% earned`;
  wrap.append(svg, label, pct);
  return wrap;
}

function renderStats() {
  const grid = document.getElementById("ringGrid");
  grid.replaceChildren();
  for (const g of ["platinum", "gold", "silver", "bronze"]) {
    grid.append(buildRing(g, earnedCountOf(g), gradeCount(g)));
  }
  const bars = document.getElementById("kindBars");
  bars.replaceChildren();
  for (const k of Object.keys(KIND_LABELS)) {
    const total = trophies.filter((t) => t.kind === k).length;
    if (total === 0) continue;
    const got = trophies.filter((t) => t.kind === k && earned.has(t.name)).length;
    const row = document.createElement("div");
    row.className = "kind-bar-row";
    const name = document.createElement("span");
    name.className = "kind-bar-name";
    name.textContent = KIND_LABELS[k];
    const track = document.createElement("div");
    track.className = "kind-bar-track";
    const fill = document.createElement("div");
    fill.className = "kind-bar-fill";
    fill.style.width = `${(got / total) * 100}%`;
    track.append(fill);
    const count = document.createElement("span");
    count.className = "kind-bar-count";
    count.textContent = `${got}/${total}`;
    row.append(name, track, count);
    bars.append(row);
  }
  const next = nextSuggested(trophies, earned);
  const nextEl = document.getElementById("nextUp");
  if (next) {
    nextEl.replaceChildren();
    nextEl.append(document.createTextNode("Next up: "));
    const strong = document.createElement("strong");
    strong.textContent = next.name;
    nextEl.append(strong, document.createTextNode(` — ${next.description}`));
  } else {
    nextEl.textContent = "Every trophy is earned — the platinum is yours.";
  }
}

// Daily planner: read the target date, build the plan, render the day cards.
// Rebuilds on every renderList so ticking a trophy earned anywhere updates it.
const planDateEl = document.getElementById("planDate");
const planDaysEl = document.getElementById("planDays");

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function renderPlanner() {
  if (!planDateEl.value) planDateEl.value = defaultTargetISO(todayISO());
  const plan = buildPlan(trophies, earned, planDateEl.value, todayISO());
  const prog = planProgress(trophies, earned);
  document.getElementById("plannerProgress").textContent =
    `${prog.got} of ${prog.total} earned (${prog.pct}%) · plan from ${plan.startISO} to ${plan.targetISO}`;
  document.getElementById("plannerSummary").textContent = planSummary(plan);
  planDaysEl.replaceChildren();
  for (const day of plan.days) {
    const card = document.createElement("div");
    card.className = "plan-day" + (day.load === 0 ? " is-rest" : "");
    const head = document.createElement("div");
    head.className = "plan-day-head";
    const h = document.createElement("h3");
    h.textContent = day.label;
    const focus = document.createElement("span");
    focus.className = "plan-day-focus";
    focus.textContent = day.focus;
    const load = document.createElement("span");
    load.className = "plan-day-load";
    load.textContent = day.load === 0 ? "rest day" : `${day.load} troph${day.load === 1 ? "y" : "ies"}`;
    head.append(h, focus, load);
    card.append(head);
    if (day.trophies.length === 0) {
      const note = document.createElement("p");
      note.className = "plan-rest-note";
      note.textContent = "Nothing planned — a breather before the next push.";
      card.append(note);
    } else {
      const ul = document.createElement("ul");
      for (const t of day.trophies) {
        const li = document.createElement("li");
        li.className = "plan-trophy";
        const badge = document.createElement("span");
        badge.className = `plan-grade grade-${t.grade}`;
        badge.textContent = t.grade;
        const name = document.createElement("span");
        name.className = "plan-name";
        name.textContent = t.name;
        const kindTag = document.createElement("span");
        kindTag.className = "plan-kind";
        kindTag.textContent = KIND_LABELS[t.kind] ?? t.kind;
        const earnBtn = document.createElement("button");
        earnBtn.type = "button";
        earnBtn.className = "plan-earn" + (earned.has(t.name) ? " is-on" : "");
        earnBtn.textContent = earned.has(t.name) ? "✓ Earned" : "Mark earned";
        earnBtn.addEventListener("click", () => {
          if (earned.has(t.name)) earned.delete(t.name);
          else earned.add(t.name);
          saveEarned();
          renderList();
        });
        li.append(badge, name, kindTag, earnBtn);
        ul.append(li);
      }
      card.append(ul);
    }
    planDaysEl.append(card);
  }
  renderWeekOverview(document.getElementById("weekOverview"), plan, earned);
}

document.getElementById("planBuildBtn").addEventListener("click", renderPlanner);
planDateEl.addEventListener("change", renderPlanner);
document.querySelector('.view-tab[data-view="planner"]').addEventListener("click", renderPlanner);

// View tabs
for (const tab of document.querySelectorAll(".view-tab")) {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".view-tab").forEach((b) => b.classList.toggle("is-active", b === tab));
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("is-active", v.id === `view-${tab.dataset.view}`));
  });
}
document.getElementById("missableBannerBtn").addEventListener("click", () => {
  document.querySelector('.view-tab[data-view="missables"]').click();
  document.getElementById("view-missables").scrollIntoView();
});

// Controls
searchEl.addEventListener("input", renderList);
document.getElementById("sortSelect").addEventListener("change", (e) => {
  sort = e.target.value;
  renderList();
});
gradeEl.addEventListener("change", renderList);
hideEarnedEl.addEventListener("change", renderList);
spoilerEl.addEventListener("change", () => {
  spoiler = spoilerEl.checked;
  saveSpoiler();
  renderList();
});
document.getElementById("detailClose").addEventListener("click", closeDetail);
scrimEl.addEventListener("click", closeDetail);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDetail();
});

// Export / import / reset
document.getElementById("exportBtn").addEventListener("click", () => {
  const payload = { game: "Grand Theft Auto VI", exportedAt: new Date().toISOString(), earned: [...earned] };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  a.download = "gta6-trophy-progress.json";
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById("importFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = Array.isArray(data) ? data : data.earned;
    if (!Array.isArray(names)) throw new Error("not a progress file");
    const valid = names.filter((n) => trophies.some((t) => t.name === n));
    if (valid.length === 0) throw new Error("no known trophy names in file");
    earned = new Set(valid);
    saveEarned();
    renderList();
  } catch {
    alert("That file is not a GTA VI trophy progress export.");
  }
  e.target.value = "";
});
document.getElementById("resetBtn").addEventListener("click", () => {
  if (confirm("Clear all earned trophies? This cannot be undone (export first if you want a backup).")) {
    earned = new Set();
    saveEarned();
    renderList();
  }
});

// Deep links (?view=roadmap|missables, ?filter=<kind>, ?spoiler=on, ?open=<trophy id>)
// and a demo mode (?demo=1) that seeds a sample earned set for screenshots.
if (params.get("demo") === "1" && earned.size === 0) {
  earned = new Set([
    "Just Like Paradise", "Paradise Lost", "T**s Ass Drug Money", "Vice City, Baby!",
    "Trust", "Break the Bank", "Baited My Tackle", "Stick Fiddler",
    "Whip It Good", "On the Spot", "Treat Yo Self", "Cunning Stunts",
  ]);
  saveEarned();
}
spoilerEl.checked = spoiler;
planDateEl.value = defaultTargetISO(todayISO());
renderKindFilters();
renderRoadmap();
renderMissables();
initSessions({
  root: document.getElementById("sessionLog"),
  getEarned: () => earned,
  onChange: renderList,
});
initShortcuts({
  focusSearch: () => searchEl.focus(),
  switchView: (view) => document.querySelector(`.view-tab[data-view="${view}"]`)?.click(),
  getOpenTrophy: () => detailTrophy,
  onToggleEarned: (t) => {
    if (earned.has(t.name)) earned.delete(t.name);
    else earned.add(t.name);
    saveEarned();
    renderList();
    openDetail(t);
  },
  helpButton: document.getElementById("shortcutsBtn"),
});
renderList();
if (params.get("view")) {
  const tab = document.querySelector(`.view-tab[data-view="${params.get("view")}"]`);
  if (tab) tab.click();
}
if (params.get("open")) {
  const t = trophies.find((x) => String(x.id) === params.get("open"));
  if (t && !isSpoiled(t)) openDetail(t);
}
