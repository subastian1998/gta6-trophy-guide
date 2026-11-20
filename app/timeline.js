// Earned timeline for the GTA VI trophy hunt: when each trophy was
// earned, grouped by day, newest first. The dates come from the play
// session log (sessions.js): a trophy counts as earned on the day of the
// first session in which it appears as newly earned, because the log
// compares the checklist before and after each session. Trophies earned
// outside a logged session — including the demo set — have no date on
// record and are grouped under "Date unknown" at the end, honestly
// labelled rather than given a guessed date. Nothing here invents a
// date: an entry has a date only when a session proves it.
//
// The view lives in its own "Timeline" tab, with a summary header:
// first trophy earned, latest trophy earned, how many came from logged
// sessions, and how many have no date. Grade-coloured dots mark each
// entry — platinum, gold, silver, bronze — matching the checklist.

import { loadSessions, earnedDatesFromSessions } from "./sessions.js";

const GRADE_LABELS = { platinum: "Platinum", gold: "Gold", silver: "Silver", bronze: "Bronze" };
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

// "2026-11-20T..." -> "2026-11-20", the day the session ran on.
export function dayOf(iso) {
  return String(iso ?? "").slice(0, 10);
}

// "2026-11-20" -> "Fri 20 Nov 2026". Short month, full year, so two
// years of hunting never collide in the label.
export function formatTimelineDay(iso) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${days[d.getUTCDay()]} ${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// Build the timeline entries from the trophy list, the earned set and
// the session log. Each entry is { trophy, dateISO|null, sessionNote }.
// dateISO is the first session day the trophy was earned in, or null.
// Entries sort newest first; undated entries sort last, in list order.
export function buildTimeline(trophies, earned, sessions) {
  const earnedSet = earned instanceof Set ? earned : new Set(earned);
  const dates = earnedDatesFromSessions(sessions ?? loadSessions(), earnedSet);
  const entries = trophies
    .filter((t) => earnedSet.has(t.name))
    .map((t) => {
      const hit = dates.get(t.name);
      return {
        trophy: t,
        dateISO: hit ? dayOf(hit.endedAt ?? hit.startedAt) : null,
        sessionNote: hit ? hit.note ?? "" : "",
      };
    });
  entries.sort((a, b) => {
    if (a.dateISO === null && b.dateISO === null) return a.trophy.id - b.trophy.id;
    if (a.dateISO === null) return 1;
    if (b.dateISO === null) return -1;
    if (a.dateISO !== b.dateISO) return b.dateISO.localeCompare(a.dateISO);
    return a.trophy.id - b.trophy.id;
  });
  return entries;
}

// Group entries into days: [{ label, dateISO|null, items }]. Dated
// groups come newest first; the undated group, when it exists, is last
// and labelled "Date unknown".
export function groupTimelineByDay(entries) {
  const groups = [];
  const byDay = new Map();
  for (const entry of entries) {
    const key = entry.dateISO ?? "unknown";
    if (!byDay.has(key)) {
      const group = {
        dateISO: entry.dateISO,
        label: entry.dateISO ? formatTimelineDay(entry.dateISO) : "Date unknown",
        items: [],
      };
      byDay.set(key, group);
      groups.push(group);
    }
    byDay.get(key).items.push(entry);
  }
  return groups;
}

// The summary header numbers: first and latest earned dates (dated
// entries only), how many trophies came from logged sessions, and how
// many have no date. Null dates mean "no dated trophy yet".
export function timelineSummary(entries, sessions) {
  const dated = entries.filter((e) => e.dateISO !== null).map((e) => e.dateISO).sort();
  const sessionCount = (sessions ?? []).filter((s) => s && s.done).length;
  return {
    total: entries.length,
    dated: dated.length,
    undated: entries.length - dated.length,
    firstISO: dated.length > 0 ? dated[0] : null,
    latestISO: dated.length > 0 ? dated[dated.length - 1] : null,
    sessionCount,
  };
}

// Render the timeline into root. getEarned returns the live Set of
// earned trophy names; onOpenGuide opens a trophy's guide panel.
export function renderTimeline(root, { trophies, getEarned, onOpenGuide }) {
  function render() {
    root.replaceChildren();
    const sessions = loadSessions();
    const entries = buildTimeline(trophies, getEarned(), sessions);
    const summary = timelineSummary(entries, sessions);

    const head = document.createElement("div");
    head.className = "timeline-head";
    const h = document.createElement("h2");
    h.textContent = "Your earned timeline";
    head.append(h);
    const sub = document.createElement("p");
    sub.className = "timeline-summary";
    if (summary.total === 0) {
      sub.textContent =
        "No trophies earned yet. Mark one earned in the Checklist — or log a play session first, so its date is recorded here.";
    } else {
      const first = summary.firstISO ? formatTimelineDay(summary.firstISO) : "no dated trophy yet";
      const latest = summary.latestISO ? formatTimelineDay(summary.latestISO) : "no dated trophy yet";
      sub.textContent =
        `${summary.total} earned · first ${first} · latest ${latest} · ` +
        `${summary.dated} from ${summary.sessionCount} logged session${summary.sessionCount === 1 ? "" : "s"}` +
        (summary.undated > 0 ? ` · ${summary.undated} with no date on record` : "");
    }
    head.append(sub);
    const note = document.createElement("p");
    note.className = "timeline-note";
    note.textContent =
      "Dates come from your play-session log: a trophy is dated to the first session in which it was earned. Trophies ticked outside a session have no date and sit under “Date unknown”.";
    head.append(note);
    root.append(head);

    const groups = groupTimelineByDay(entries);
    if (groups.length === 0) {
      const empty = document.createElement("p");
      empty.className = "timeline-empty";
      empty.textContent = "Nothing on the timeline yet — your first earned trophy will appear here.";
      root.append(empty);
      return;
    }

    const list = document.createElement("div");
    list.className = "timeline";
    for (const group of groups) {
      const day = document.createElement("div");
      day.className = "timeline-day";
      const dayHead = document.createElement("h3");
      dayHead.className = "timeline-day-head";
      dayHead.textContent = `${group.label} — ${group.items.length} troph${group.items.length === 1 ? "y" : "ies"}`;
      day.append(dayHead);
      const items = document.createElement("ul");
      items.className = "timeline-items";
      for (const entry of group.items) {
        const li = document.createElement("li");
        li.className = "timeline-item";
        const dot = document.createElement("span");
        dot.className = `timeline-dot grade-${entry.trophy.grade}`;
        dot.setAttribute("aria-hidden", "true");
        const body = document.createElement("div");
        body.className = "timeline-body";
        const name = document.createElement("strong");
        name.className = "timeline-name";
        name.textContent = entry.trophy.name;
        const meta = document.createElement("span");
        meta.className = "timeline-meta";
        meta.textContent =
          `${GRADE_LABELS[entry.trophy.grade] ?? entry.trophy.grade} · ${KIND_LABELS[entry.trophy.kind] ?? entry.trophy.kind}` +
          (entry.sessionNote ? ` · “${entry.sessionNote}”` : "");
        body.append(name, meta);
        const desc = document.createElement("p");
        desc.className = "timeline-desc";
        desc.textContent = entry.trophy.description;
        body.append(desc);
        const openBtn = document.createElement("button");
        openBtn.type = "button";
        openBtn.className = "timeline-open-btn";
        openBtn.textContent = "Read the guide";
        openBtn.addEventListener("click", () => onOpenGuide(entry.trophy));
        body.append(openBtn);
        li.append(dot, body);
        items.append(li);
      }
      day.append(items);
      list.append(day);
    }
    root.append(list);
  }

  render();
  return { render };
}
