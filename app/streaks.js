// Streaks — how often you actually play, from the session log.
// An "active day" is a calendar day on which a finished play session
// ended. From those days this module computes the current streak
// (consecutive active days ending today or yesterday), the best
// streak ever, and an 8-week activity grid. It also totals the
// trophies earned inside sessions, using the session log's own
// before/after earned sets — so a trophy ticked outside a session
// never counts as played time. Dates are honest: a day with no
// session is a gap, never a guessed active day.
//
// Streak rules, stated plainly so the numbers can be checked:
//   - Today counts if a session ended today; otherwise the streak
//     may still be alive if yesterday was active (you have not
//     missed a day yet — the day is not over).
//   - A gap of one full inactive day ends the streak.
//   - The best streak is the longest run of consecutive active days
//     anywhere in the log.

import { loadSessions, earnedDuring } from "./sessions.js";

export const STREAK_WEEKS_SHOWN = 8;

function dayOf(iso) {
  return (iso ?? "").slice(0, 10);
}

function addDaysISO(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// The set of active days: every day a finished session ended on.
// Sessions still running (no endedAt) do not count yet.
export function activeDays(sessions) {
  const days = new Set();
  for (const s of sessions ?? []) {
    if (s.done && s.endedAt) days.add(dayOf(s.endedAt));
  }
  return days;
}

// Count backwards from the anchor day while days stay active.
export function streakEndingOn(days, anchorISO) {
  let n = 0;
  let cursor = anchorISO;
  while (days.has(cursor)) {
    n += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return n;
}

// The current streak: count back from today, or from yesterday when
// today has no session yet (the day is still open).
export function currentStreak(days, today = todayISO()) {
  if (days.has(today)) return streakEndingOn(days, today);
  if (days.has(addDaysISO(today, -1))) return streakEndingOn(days, addDaysISO(today, -1));
  return 0;
}

// The longest run of consecutive active days in the whole log.
export function bestStreak(days) {
  let best = 0;
  for (const day of days) {
    // Only start counting at the first day of a run.
    if (days.has(addDaysISO(day, -1))) continue;
    // Walk forward from the run's first day to measure its length.
    let forward = 0;
    let cursor = day;
    while (days.has(cursor)) {
      forward += 1;
      cursor = addDaysISO(cursor, 1);
    }
    if (forward > best) best = forward;
  }
  return best;
}

// How many trophies were earned inside finished sessions in total,
// and in the most recent finished session.
export function sessionEarnedTotals(sessions, earnedNow) {
  let total = 0;
  let last = 0;
  let lastDate = null;
  for (const s of sessions ?? []) {
    if (!s.done) continue;
    const n = earnedDuring(s, earnedNow).length;
    total += n;
    if (!lastDate || dayOf(s.endedAt ?? "") >= lastDate) {
      last = n;
      lastDate = dayOf(s.endedAt ?? "");
    }
  }
  return { total, last, lastDate };
}

// Active days per calendar month, newest month first: [{ month:
// "2026-11", count: 4 }]. A month with no sessions is absent, so
// the list never claims a month you did not play in.
export function monthActiveCounts(days) {
  const counts = new Map();
  for (const day of days) {
    const month = day.slice(0, 7);
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, count]) => ({ month, count }));
}

// The last N weeks as a grid: weeks are arrays of 7 day cells,
// Monday first, each { iso, active, isToday, isFuture }.
export function activityGrid(days, weeks = STREAK_WEEKS_SHOWN, today = todayISO()) {
  const todayDate = new Date(`${today}T00:00:00Z`);
  // Monday of this week.
  const dow = (todayDate.getUTCDay() + 6) % 7;
  const monday = addDaysISO(today, -dow);
  const start = addDaysISO(monday, -(weeks - 1) * 7);
  const grid = [];
  for (let w = 0; w < weeks; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const iso = addDaysISO(start, w * 7 + d);
      week.push({ iso, active: days.has(iso), isToday: iso === today, isFuture: iso > today });
    }
    grid.push(week);
  }
  return grid;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function statCard(label, value, sub) {
  const card = el("div", "streak-stat");
  card.append(el("div", "streak-stat-num", String(value)));
  card.append(el("div", "streak-stat-label", label));
  if (sub) card.append(el("div", "streak-stat-sub", sub));
  return card;
}

export function renderStreaks(root, { getEarned }) {
  function render() {
    const sessions = loadSessions();
    const earned = getEarned();
    const days = activeDays(sessions);
    const today = todayISO();
    const cur = currentStreak(days, today);
    const best = bestStreak(days);
    const totals = sessionEarnedTotals(sessions, earned);
    const finished = sessions.filter((s) => s.done).length;

    root.replaceChildren();
    root.append(el("p", "r4-intro",
      "Your playing rhythm, from the session log. A day counts when a finished session ended on it — " +
      "ticking a trophy outside a session never fakes a played day."));

    const stats = el("div", "streak-stats");
    stats.append(statCard("Current streak", cur, cur === 0 ? "no session today or yesterday — play to start one" : cur === 1 ? "1 active day in a row" : `${cur} active days in a row`));
    stats.append(statCard("Best streak", best, best === 0 ? "no finished sessions yet" : `longest run of active days`));
    stats.append(statCard("Active days", days.size, `${finished} finished session${finished === 1 ? "" : "s"} logged`));
    stats.append(statCard("Trophies in sessions", totals.total, totals.lastDate ? `${totals.last} in the latest session (${totals.lastDate})` : "none earned inside a session yet"));
    root.append(stats);

    if (days.size === 0) {
      root.append(el("p", "r4-summary",
        "No finished sessions yet — start one from the Sessions tab before you play, end it when you stop, " +
        "and your streaks will build here."));
      return;
    }

    const gridWrap = el("div", "streak-grid-wrap");
    gridWrap.append(el("h3", "streak-grid-title", `Last ${STREAK_WEEKS_SHOWN} weeks — green is a played day`));
    const grid = el("div", "streak-grid");
    const heads = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (const h of heads) grid.append(el("div", "streak-head", h));
    for (const week of activityGrid(days, STREAK_WEEKS_SHOWN, today)) {
      for (const cell of week) {
        const c = el("div", "streak-cell" + (cell.active ? " is-active" : "") + (cell.isToday ? " is-today" : "") + (cell.isFuture ? " is-future" : ""));
        c.title = `${cell.iso}${cell.active ? " — played" : cell.isFuture ? "" : " — no session"}`;
        c.textContent = cell.iso.slice(8, 10);
        grid.append(c);
      }
    }
    gridWrap.append(grid);
    gridWrap.append(el("p", "streak-grid-legend", "Filled = a session ended that day · outlined = today · blank = no session · grey = future"));
    root.append(gridWrap);

    const months = monthActiveCounts(days);
    if (months.length > 0) {
      const monthsWrap = el("div", "streak-months");
      monthsWrap.append(el("h3", "streak-months-title", "Active days by month"));
      const list = el("ul", "streak-months-list");
      for (const m of months) {
        list.append(el("li", null, `${m.month}: ${m.count} active day${m.count === 1 ? "" : "s"}`));
      }
      monthsWrap.append(list);
      root.append(monthsWrap);
    }

    const tip = el("p", "r4-summary",
      cur > 0 && cur === best && best >= 3
        ? `You are on your best streak ever — ${best} days. One session today keeps it alive.`
        : cur === 0
          ? "Your streak is at zero. A single session today starts a new one."
          : `Current streak ${cur} day${cur === 1 ? "" : "s"}; best ever ${best}. Keep the chain going with a short session a day.`);
    root.append(tip);
  }
  render();
  return { render };
}
