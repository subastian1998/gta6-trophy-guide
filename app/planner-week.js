// Weekly overview for the daily planner: the day cards show the trees,
// this shows the forest. Plan days are grouped into 7-day weeks starting
// from the plan's first day, and each week reports how many trophies it
// plans, how many of those are already earned, and which kinds dominate
// it — so a player can see at a glance whether a week is story-heavy,
// a collectibles grind, or mostly rest days. Pure rendering on top of
// the plan object from planner.js; no new planning rules live here.
//
// A week is: { index, startISO, endISO, label, planned, earned, focus }.
// Weeks are cut strictly every 7 days from the plan start, so a week
// never straddles the plan boundary in a surprising way.

import { formatDayLabel } from "./planner.js";

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

// Split plan.days into consecutive 7-day chunks. The last week may be
// short when the plan does not end on a week boundary.
export function groupIntoWeeks(planDays) {
  const weeks = [];
  for (let i = 0; i < planDays.length; i += 7) {
    weeks.push(planDays.slice(i, i + 7));
  }
  return weeks;
}

// The dominant kind of a week: the kind with the most planned trophies.
// A week with a missable trophy is always "do not miss this" — the one
// trophy that can be lost outranks any count.
export function weekFocus(dayTrophies) {
  if (dayTrophies.some((t) => t.missable)) return "Do not miss this";
  const counts = new Map();
  for (const t of dayTrophies) {
    counts.set(t.kind, (counts.get(t.kind) ?? 0) + 1);
  }
  let bestKind = null;
  let bestCount = 0;
  for (const [kind, count] of counts) {
    if (count > bestCount) {
      bestKind = kind;
      bestCount = count;
    }
  }
  return bestKind ? KIND_LABELS[bestKind] ?? bestKind : "Rest week";
}

function weekRangeLabel(days) {
  const first = days[0];
  const last = days[days.length - 1];
  if (days.length === 1) return formatDayLabel(first.date);
  return `${formatDayLabel(first.date)} – ${formatDayLabel(last.date)}`;
}

// Render the overview into root. Called from renderPlanner on every
// re-render so ticking a trophy earned updates the earned counts here.
export function renderWeekOverview(root, plan, earned) {
  root.replaceChildren();
  const head = document.createElement("h3");
  head.className = "week-head";
  head.textContent = "Week by week";
  root.append(head);
  const intro = document.createElement("p");
  intro.className = "week-intro";
  intro.textContent =
    "Your plan grouped into weeks. The bar is the week's planned trophies; the filled part is how many of them you already earned.";
  root.append(intro);
  const weeks = groupIntoWeeks(plan.days);
  const list = document.createElement("ul");
  list.className = "week-list";
  weeks.forEach((days, i) => {
    const trophies = days.flatMap((d) => d.trophies);
    const got = trophies.filter((t) => earned.has(t.name)).length;
    const li = document.createElement("li");
    li.className = "week-row" + (trophies.length === 0 ? " is-rest" : "");
    const label = document.createElement("span");
    label.className = "week-label";
    label.textContent = `Week ${i + 1}`;
    const range = document.createElement("span");
    range.className = "week-range";
    range.textContent = weekRangeLabel(days);
    const focus = document.createElement("span");
    focus.className = "week-focus";
    focus.textContent = weekFocus(trophies);
    const track = document.createElement("div");
    track.className = "week-bar-track";
    const fill = document.createElement("div");
    fill.className = "week-bar-fill";
    fill.style.width = trophies.length === 0 ? "0%" : `${(got / trophies.length) * 100}%`;
    track.append(fill);
    const count = document.createElement("span");
    count.className = "week-count";
    count.textContent =
      trophies.length === 0 ? "rest week" : `${got}/${trophies.length} earned`;
    li.append(label, range, focus, track, count);
    list.append(li);
  });
  root.append(list);
  const total = plan.days.flatMap((d) => d.trophies).length;
  const done = plan.days
    .flatMap((d) => d.trophies)
    .filter((t) => earned.has(t.name)).length;
  const foot = document.createElement("p");
  foot.className = "week-foot";
  foot.textContent =
    total === 0
      ? "Nothing left to plan — every trophy is earned."
      : `${done} of ${total} planned trophies already earned across ${weeks.length} week${weeks.length === 1 ? "" : "s"}.`;
  root.append(foot);
}

// Round 3: the same week split as plain data, for callers that want the
// numbers without rendering — one entry per week with its planned and
// earned counts and its dominant kind. Weeks are the same strict 7-day
// chunks groupIntoWeeks cuts, so the numbers always match the overview.
export function summariseWeeks(plan, earned) {
  return groupIntoWeeks(plan.days).map((days, i) => {
    const trophies = days.flatMap((d) => d.trophies);
    return {
      week: i + 1,
      planned: trophies.length,
      earned: trophies.filter((t) => earned.has(t.name)).length,
      focus: weekFocus(trophies),
    };
  });
}
