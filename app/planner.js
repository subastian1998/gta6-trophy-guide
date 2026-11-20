// Daily planner for the GTA VI trophy hunt: turn the trophies you have not
// earned yet into a day-by-day plan that ends on a target date. Pure
// functions — no DOM here, no network, no dates read from the clock except
// through the parameters the app passes in. The app (app.js) wires these
// into the Planner tab: it reads the target date from the date input, calls
// buildPlan, and renders the day cards.
//
// Ordering rule, in plain words: the one missable trophy goes first (it is
// the only trophy that can be lost), then the story trophies in list order,
// then everything else grouped by kind, with the 100% completion trophy
// last, because it is only earned once the grind trophies are done.
//
// A plan is an object:
//   { startISO, targetISO, dayCount, total, perDay, days, overflow }
// where each day is:
//   { date, label, trophies, focus, load }
// and load is the number of trophies planned for that day. If the days
// between today and the target are too few for the trophies left, the
// extra trophies land on the last day and overflow counts them.

export const PLAN_VERSION = 1;
export const DEFAULT_TARGET_DAYS = 30;
export const MAX_TROPHIES_PER_DAY = 6;

const KIND_ORDER = [
  "story",
  "activities",
  "robbery",
  "combat",
  "collectibles",
  "money",
  "completion",
];

const KIND_FOCUS = {
  story: "Story missions",
  activities: "Activities & challenges",
  robbery: "Robberies",
  combat: "Combat",
  collectibles: "Collectibles",
  money: "Money",
  completion: "100% completion",
  missable: "Do not miss this",
};

// Whole days from startISO to endISO, at least 1. Both are "YYYY-MM-DD".
export function daysBetween(startISO, endISO) {
  const start = new Date(`${startISO}T00:00:00Z`);
  const end = new Date(`${endISO}T00:00:00Z`);
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
  return Math.max(1, diff + 1);
}

// "YYYY-MM-DD" that is n days after the given date.
export function addDaysISO(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// "2026-11-21" -> "Sat 21 Nov". Short on purpose: it sits on a day card.
export function formatDayLabel(iso) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const d = new Date(`${iso}T00:00:00Z`);
  return `${days[d.getUTCDay()]} ${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
}

// The default target date: thirty days from the given "today".
export function defaultTargetISO(todayISO) {
  return addDaysISO(todayISO, DEFAULT_TARGET_DAYS);
}

// The trophies still to earn, in the order the plan works through them.
// earnedNames is a Set of trophy names (or an array — both are accepted).
export function orderForPlanning(trophies, earnedNames) {
  const earned = earnedNames instanceof Set ? earnedNames : new Set(earnedNames);
  const left = trophies.filter((t) => !earned.has(t.name));
  const missable = left.filter((t) => t.missable);
  const story = left.filter((t) => !t.missable && t.kind === "story");
  const rest = left.filter((t) => !t.missable && t.kind !== "story");
  rest.sort((a, b) => {
    const ka = KIND_ORDER.indexOf(a.kind);
    const kb = KIND_ORDER.indexOf(b.kind);
    if (ka !== kb) return ka - kb;
    return a.id - b.id;
  });
  story.sort((a, b) => a.id - b.id);
  return [...missable, ...story, ...rest];
}

// The single most urgent trophy left, or null when the list is complete.
export function nextSuggested(trophies, earnedNames) {
  const ordered = orderForPlanning(trophies, earnedNames);
  return ordered.length > 0 ? ordered[0] : null;
}

// Split the ordered trophies across dayCount days, keeping the order and
// keeping each day at or under MAX_TROPHIES_PER_DAY where the days allow.
// When the days are too few, the overflow spills onto the last day.
export function distributeIntoDays(ordered, dayCount) {
  const days = [];
  const perDay = Math.max(1, Math.ceil(ordered.length / dayCount));
  let at = 0;
  for (let i = 0; i < dayCount; i += 1) {
    const isLast = i === dayCount - 1;
    const take = isLast ? ordered.length - at : Math.min(perDay, ordered.length - at);
    const chunk = ordered.slice(at, at + Math.max(0, take));
    at += chunk.length;
    days.push(chunk);
  }
  return { days, perDay };
}

// One short focus line for a day, from the kinds of trophies on it.
export function focusForDay(dayTrophies) {
  if (dayTrophies.length === 0) return "Rest day — nothing planned";
  const counts = new Map();
  for (const t of dayTrophies) {
    counts.set(t.kind, (counts.get(t.kind) ?? 0) + 1);
  }
  let bestKind = dayTrophies[0].kind;
  let bestCount = 0;
  for (const [kind, count] of counts) {
    if (count > bestCount) {
      bestKind = kind;
      bestCount = count;
    }
  }
  if (dayTrophies.some((t) => t.missable)) return KIND_FOCUS.missable;
  const focus = KIND_FOCUS[bestKind] ?? bestKind;
  return dayTrophies.length === 1 ? `${focus} — one trophy` : focus;
}

// Build the whole plan. targetISO is "YYYY-MM-DD"; todayISO defaults to
// the real today when the caller passes nothing (the app always passes
// today's date explicitly, so the plan never depends on a hidden clock).
export function buildPlan(trophies, earnedNames, targetISO, todayISO) {
  const today = todayISO ?? new Date().toISOString().slice(0, 10);
  const ordered = orderForPlanning(trophies, earnedNames);
  const dayCount = daysBetween(today, targetISO);
  const { days, perDay } = distributeIntoDays(ordered, dayCount);
  const planDays = days.map((chunk, i) => {
    const date = addDaysISO(today, i);
    return {
      date,
      label: formatDayLabel(date),
      trophies: chunk,
      focus: focusForDay(chunk),
      load: chunk.length,
    };
  });
  const overCap = planDays.reduce(
    (sum, d) => sum + Math.max(0, d.load - MAX_TROPHIES_PER_DAY),
    0,
  );
  return {
    startISO: today,
    targetISO,
    dayCount,
    total: ordered.length,
    perDay,
    days: planDays,
    overflow: overCap,
  };
}

// A one-paragraph summary of a plan, for the line above the day cards.
export function planSummary(plan) {
  if (plan.total === 0) {
    return "All 55 trophies are earned — the platinum is yours. Nothing left to plan.";
  }
  const busy = plan.days.filter((d) => d.load > 0).length;
  const base =
    `${plan.total} trophies left across ${busy} planned day${busy === 1 ? "" : "s"} ` +
    `until ${formatDayLabel(plan.targetISO)} — about ${plan.perDay} a day.`;
  if (plan.overflow > 0) {
    return (
      `${base} The target date is tight: ${plan.overflow} troph${plan.overflow === 1 ? "y" : "ies"} ` +
      `spill onto the last day. Pick a later date to spread them out.`
    );
  }
  return base;
}

// How far along the whole list is, as a share of the 55 — the planner tab
// shows this beside the target date so the plan always has its context.
export function planProgress(trophies, earnedNames) {
  const earned = earnedNames instanceof Set ? earnedNames : new Set(earnedNames);
  const got = trophies.filter((t) => earned.has(t.name)).length;
  return { got, total: trophies.length, pct: Math.round((got / trophies.length) * 100) };
}
