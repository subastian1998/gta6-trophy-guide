// Monthly planner — the daily planner's month-at-a-glance sibling.
// Pick a month and the unearned trophies are spread across its days:
// the missable trophy lands on day 1, story trophies follow in list
// order, the 100% completion trophy lands last, and the rest fill the
// days between. Each calendar cell shows how many trophies that day
// holds; clicking a day lists them with their grades and kinds.
// Weekends are marked, past days are greyed out, and days with no
// trophy are rest days. The distribution is computed fresh from
// app/data/trophies.json and the live earned set every render.
//
// The month grid starts on Monday (PS5 week starts are a matter of
// taste; Monday keeps the work week together and matches the daily
// planner's week view).

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
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_HEADS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function monthKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// Monday-based offset of the 1st: 0 when the month starts on Monday.
export function firstWeekdayOffset(year, month) {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

export function addMonths(year, month, delta) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

// Order the unearned trophies for a month: missable first, then
// story in list order, then everything else in list order, with the
// 100% completion trophy (the one the platinum waits on) last.
export function orderForMonth(trophies, earned) {
  const remaining = trophies.filter((t) => !earned.has(t.name));
  const missable = remaining.filter((t) => t.missable);
  const story = remaining.filter((t) => !t.missable && t.kind === "story");
  const finale = remaining.filter((t) => t.kind === "completion" && t.grade !== "platinum");
  const middle = remaining.filter(
    (t) => !t.missable && t.kind !== "story" && !(t.kind === "completion" && t.grade !== "platinum"),
  );
  return [...missable, ...story, ...middle, ...finale];
}

// Spread the ordered trophies across the month's days, at most
// maxPerDay per day, skipping no days on purpose: early days get
// the missable and story work, late days get the finale. Days past
// the end of the list stay empty (rest days).
export function distributeAcrossMonth(ordered, year, month, maxPerDay = 3) {
  const totalDays = daysInMonth(year, month);
  const days = [];
  for (let day = 1; day <= totalDays; day++) {
    days.push({ year, month, day, trophies: [] });
  }
  let i = 0;
  for (const d of days) {
    while (i < ordered.length && d.trophies.length < maxPerDay) {
      d.trophies.push(ordered[i]);
      i += 1;
    }
    if (i >= ordered.length) break;
  }
  return { days, placed: i, unplaced: ordered.length - i };
}

export function isWeekend(year, month, day) {
  const dow = new Date(year, month, day).getDay();
  return dow === 0 || dow === 6;
}

export function isPastDay(year, month, day, todayISO) {
  const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return iso < todayISO;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function dayCell(dayPlan, todayISO, onPick) {
  const cell = el("button", "cal-day");
  cell.type = "button";
  const dow = new Date(dayPlan.year, dayPlan.month, dayPlan.day).getDay();
  if (dow === 0 || dow === 6) cell.classList.add("is-weekend");
  if (isPastDay(dayPlan.year, dayPlan.month, dayPlan.day, todayISO)) cell.classList.add("is-past");
  if (dayPlan.trophies.length === 0) cell.classList.add("is-rest");
  const num = el("span", "cal-num", String(dayPlan.day));
  cell.append(num);
  if (dayPlan.trophies.length > 0) {
    const count = el("span", "cal-count", `${dayPlan.trophies.length} troph${dayPlan.trophies.length === 1 ? "y" : "ies"}`);
    cell.append(count);
    const first = el("span", "cal-first", dayPlan.trophies[0].name);
    cell.append(first);
    if (dayPlan.trophies.some((t) => t.missable)) cell.append(el("span", "cal-warn", "⚠ missable"));
  } else {
    cell.append(el("span", "cal-rest", "rest"));
  }
  cell.addEventListener("click", () => onPick(dayPlan));
  return cell;
}

export function renderMonthlyPlanner(root, { trophies, getEarned, onOpenGuide }) {
  const now = new Date();
  let viewYear = now.getFullYear();
  let viewMonth = now.getMonth();
  let selected = null;

  const shell = el("div", "cal-shell");
  const intro = el("p", "r4-intro",
    "One month, one plan. The trophies you have not earned yet are spread across the days — " +
    "missable first, story in order, the 100% trophy last. Click any day to see its trophies.");
  shell.append(intro);
  const nav = el("div", "cal-nav");
  const prevBtn = el("button", "cal-nav-btn", "← Previous month");
  prevBtn.type = "button";
  const title = el("h3", "cal-title");
  const nextBtn = el("button", "cal-nav-btn", "Next month →");
  nextBtn.type = "button";
  nav.append(prevBtn, title, nextBtn);
  shell.append(nav);
  const summary = el("p", "r4-summary");
  shell.append(summary);
  const breakdown = el("p", "cal-kind-breakdown");
  shell.append(breakdown);
  const grid = el("div", "cal-grid");
  shell.append(grid);
  const detail = el("div", "cal-detail");
  shell.append(detail);

  function render() {
    const earned = getEarned();
    const todayISO = new Date().toISOString().slice(0, 10);
    title.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;
    const ordered = orderForMonth(trophies, earned);
    const { days, placed, unplaced } = distributeAcrossMonth(ordered, viewYear, viewMonth);
    const restDays = days.filter((d) => d.trophies.length === 0).length;
    summary.textContent =
      `${ordered.length} trophies left to earn · ${placed} placed in ${MONTH_NAMES[viewMonth]} ` +
      `(${restDays} rest days)` +
      (unplaced > 0 ? ` · ${unplaced} will not fit this month — they roll to next month.` : " · everything fits this month.");
    const placedTrophies = days.flatMap((d) => d.trophies);
    const kindCounts = new Map();
    for (const t of placedTrophies) kindCounts.set(t.kind, (kindCounts.get(t.kind) ?? 0) + 1);
    breakdown.textContent =
      placedTrophies.length === 0
        ? "Nothing to place this month — every trophy is already earned."
        : "This month's mix: " +
          [...kindCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([k, n]) => `${n} ${KIND_LABELS[k] ?? k}`)
            .join(" · ") +
          ".";
    grid.replaceChildren();
    for (const head of WEEKDAY_HEADS) grid.append(el("div", "cal-head", head));
    const offset = firstWeekdayOffset(viewYear, viewMonth);
    for (let i = 0; i < offset; i++) grid.append(el("div", "cal-blank"));
    for (const d of days) grid.append(dayCell(d, todayISO, pickDay));
    renderDetail();
  }

  function pickDay(dayPlan) {
    selected = dayPlan;
    renderDetail();
    detail.scrollIntoView({ block: "nearest" });
  }

  function renderDetail() {
    detail.replaceChildren();
    if (!selected) {
      detail.append(el("p", "cal-detail-hint", "Click a day above to see the trophies planned for it."));
      return;
    }
    const d = selected;
    detail.append(el("h4", "cal-detail-title",
      `${MONTH_NAMES[d.month]} ${d.day}, ${d.year} — ${d.trophies.length === 0 ? "rest day" : `${d.trophies.length} troph${d.trophies.length === 1 ? "y" : "ies"}`}`));
    if (d.trophies.length === 0) {
      detail.append(el("p", "cal-detail-note", "Nothing planned. A breather — or a good day to replay a mission for practice."));
      return;
    }
    const list = el("ul", "cal-detail-list");
    for (const t of d.trophies) {
      const li = el("li", "cal-detail-item");
      li.append(el("span", `cal-grade grade-${t.grade}`, t.grade));
      const nameBtn = el("button", "cal-name", t.name);
      nameBtn.type = "button";
      nameBtn.addEventListener("click", () => onOpenGuide(t));
      li.append(nameBtn);
      li.append(el("span", "cal-kind", KIND_LABELS[t.kind] ?? t.kind));
      if (t.missable) li.append(el("span", "cal-warn", "⚠ missable — do it today"));
      list.append(li);
    }
    detail.append(list);
  }

  prevBtn.addEventListener("click", () => {
    const next = addMonths(viewYear, viewMonth, -1);
    viewYear = next.year;
    viewMonth = next.month;
    selected = null;
    render();
  });
  nextBtn.addEventListener("click", () => {
    const next = addMonths(viewYear, viewMonth, 1);
    viewYear = next.year;
    viewMonth = next.month;
    selected = null;
    render();
  });

  render();
  root.replaceChildren();
  root.append(shell);
  return { render };
}
