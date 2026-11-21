// Play-session log for the GTA VI trophy hunt: record a play session,
// see which trophies were earned during it, and keep a history.
// A session is started before playing and ended after: the trophies earned
// between the two clicks are found by comparing the earned set at the
// start with the earned set at the end, so nothing is typed twice.
// Sessions live only in this browser (localStorage) and are part of the
// progress export only in the sense that the earned set itself is exported.
//
// A session looks like:
//   { id, startedAt, endedAt, startEarned, endEarned, note, done }
// startEarned / endEarned are arrays of trophy names. endEarned is null
// while the session is still open. The earned-during list is derived,
// never stored separately, so it can never drift from the checklist.

const SESSIONS_KEY = "gta6-trophy-guide-sessions-v1";
const MAX_SESSIONS = 200;

export function loadSessions() {
  try {
    const raw = JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((s) => s && typeof s.startedAt === "string" && Array.isArray(s.startEarned))
      .slice(0, MAX_SESSIONS);
  } catch {
    return [];
  }
}

export function saveSessions(sessions) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  } catch {
    // Storage full or unavailable: the log simply does not persist.
  }
}

// Names earned between the start of the session and now. When the session
// is closed, endEarned is used; while it is open, the live earned set is.
export function earnedDuring(session, earnedNow) {
  const before = new Set(session.startEarned);
  const after = session.endEarned ?? [...earnedNow];
  return after.filter((name) => !before.has(name));
}

// Total played minutes across finished sessions, from their start
// and end timestamps. Open sessions are excluded — their length is
// not final yet — and a session missing either timestamp counts 0.
export function totalSessionMinutes(sessions) {
  let total = 0;
  for (const s of sessions ?? []) {
    if (!s || !s.done || !s.startedAt || !s.endedAt) continue;
    const mins = (new Date(s.endedAt) - new Date(s.startedAt)) / 60000;
    if (Number.isFinite(mins) && mins > 0) total += mins;
  }
  return Math.round(total);
}

// Round 3 (timeline): the first finished session in which each trophy
// was earned, as a Map of name -> session. A trophy earned in several
// sessions maps to the earliest one, so the timeline dates it to the
// day it first appeared. Open sessions are skipped — only a finished
// session proves a date — and names in no finished session are absent,
// never guessed. earnedNow is accepted for symmetry with earnedDuring
// but is not used: only closed sessions carry a date.
export function earnedDatesFromSessions(sessions, earnedNow) {
  const first = new Map();
  const done = (sessions ?? [])
    .filter((s) => s && s.done && Array.isArray(s.endEarned))
    .sort((a, b) => String(a.endedAt ?? a.startedAt).localeCompare(String(b.endedAt ?? b.startedAt)));
  for (const session of done) {
    for (const name of earnedDuring(session, earnedNow)) {
      if (!first.has(name)) first.set(name, session);
    }
  }
  return first;
}

export function formatSessionTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function minutesBetween(startISO, endISO) {
  const ms = new Date(endISO).getTime() - new Date(startISO).getTime();
  return Math.max(0, Math.round(ms / 60000));
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// Wire the Sessions tab: root is the #sessionLog container, getEarned
// returns the live Set of earned trophy names, onChange is called after
// a session ends or is deleted so the rest of the app can re-render.
export function initSessions({ root, getEarned, onChange }) {
  let sessions = loadSessions();

  function activeSession() {
    return sessions.find((s) => !s.done) ?? null;
  }

  function render() {
    root.replaceChildren();
    const active = activeSession();

    const intro = document.createElement("p");
    intro.className = "session-intro";
    intro.textContent =
      "Start a session before you play and end it when you stop — the log works out which trophies you earned in between, from your checklist. Nothing leaves this browser.";
    root.append(intro);

    const controls = document.createElement("div");
    controls.className = "session-controls";
    if (active) {
      const status = document.createElement("p");
      status.className = "session-active";
      const soFar = earnedDuring(active, getEarned());
      status.textContent =
        `Session running since ${formatSessionTime(active.startedAt)} — ` +
        `${soFar.length} troph${soFar.length === 1 ? "y" : "ies"} earned so far` +
        (active.note ? ` · “${active.note}”` : "");
      const endBtn = document.createElement("button");
      endBtn.type = "button";
      endBtn.className = "session-end-btn";
      endBtn.textContent = "End session";
      endBtn.addEventListener("click", () => {
        active.endedAt = new Date().toISOString();
        active.endEarned = [...getEarned()];
        active.done = true;
        saveSessions(sessions);
        onChange();
        render();
      });
      controls.append(status, endBtn);
    } else {
      const noteInput = document.createElement("input");
      noteInput.type = "text";
      noteInput.className = "session-note-input";
      noteInput.placeholder = "Session note (optional) — e.g. “Chapter 3 cleanup”";
      noteInput.maxLength = 120;
      const startBtn = document.createElement("button");
      startBtn.type = "button";
      startBtn.className = "session-start-btn";
      startBtn.textContent = "Start session";
      startBtn.addEventListener("click", () => {
        sessions.unshift({
          id: `s${Date.now()}`,
          startedAt: new Date().toISOString(),
          endedAt: null,
          startEarned: [...getEarned()],
          endEarned: null,
          note: noteInput.value.trim(),
          done: false,
        });
        saveSessions(sessions);
        render();
      });
      controls.append(noteInput, startBtn);
    }
    root.append(controls);

    const done = sessions.filter((s) => s.done);
    const head = document.createElement("h3");
    head.className = "session-list-head";
    head.textContent = done.length === 0 ? "No finished sessions yet." : `Past sessions (${done.length})`;
    root.append(head);
    const totalEarned = done.reduce((sum, s) => sum + earnedDuring(s, getEarned()).length, 0);
    if (done.length > 0) {
      const total = document.createElement("p");
      total.className = "session-total";
      total.textContent = `${totalEarned} troph${totalEarned === 1 ? "y" : "ies"} earned across your logged sessions.`;
      root.append(total);
    }
    const list = document.createElement("ul");
    list.className = "session-list";
    for (const s of done) {
      const gained = earnedDuring(s, getEarned());
      const li = document.createElement("li");
      li.className = "session-item";
      const top = document.createElement("div");
      top.className = "session-item-top";
      const when = document.createElement("span");
      when.className = "session-when";
      when.textContent = formatSessionTime(s.startedAt);
      const dur = document.createElement("span");
      dur.className = "session-duration";
      dur.textContent = s.endedAt ? formatDuration(minutesBetween(s.startedAt, s.endedAt)) : "";
      const count = document.createElement("span");
      count.className = "session-count";
      count.textContent = gained.length === 0 ? "no trophies" : `+${gained.length}`;
      top.append(when, dur, count);
      li.append(top);
      if (s.note) {
        const note = document.createElement("p");
        note.className = "session-note";
        note.textContent = s.note;
        li.append(note);
      }
      if (gained.length > 0) {
        const names = document.createElement("p");
        names.className = "session-gained";
        names.textContent = "Earned: " + gained.join(" · ");
        li.append(names);
      }
      const del = document.createElement("button");
      del.type = "button";
      del.className = "session-delete";
      del.textContent = "Delete";
      del.addEventListener("click", () => {
        sessions = sessions.filter((x) => x.id !== s.id);
        saveSessions(sessions);
        render();
      });
      li.append(del);
      list.append(li);
    }
    root.append(list);
  }

  render();
  return { render };
}

// ---------------------------------------------------------------------------
// Round 5 — session extras: ready-made session templates, a platinum
// goal with a deadline, a "time to play again" reminder, and streak
// numbers. Templates only pre-fill a session's note and planned length;
// the earned set is still captured from the checklist, as before.
// ---------------------------------------------------------------------------

// Three starting points for a play session: a short story push, a
// focused collectible sweep and a long grind block. `minutes` is the
// plan, not a timer — the session ends when the player ends it.
export const SESSION_TEMPLATES = [
  { id: "story-push", label: "Story push", minutes: 60, focus: "story", note: "Story missions" },
  { id: "collectible-sweep", label: "Collectible sweep", minutes: 45, focus: "collectibles", note: "Collectibles" },
  { id: "grind-block", label: "Grind block", minutes: 120, focus: "grind", note: "Grind trophies" },
];

// A new open session from a template: same shape initSessions reads
// (id, startedAt, endedAt, startEarned, endEarned, note, done), with
// the template's note and planned length attached for the reminder.
export function sessionFromTemplate(template, earnedNow) {
  return {
    id: `s-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    startedAt: new Date().toISOString(),
    endedAt: null,
    startEarned: [...(earnedNow ?? [])],
    endEarned: null,
    note: template?.note ?? "",
    done: false,
    templateId: template?.id ?? null,
    plannedMinutes: template?.minutes ?? null,
  };
}

const SESSION_GOAL_KEY = "gta6-trophy-guide-session-goal-v1";

// The platinum goal: how many trophies to have earned, and by when.
// One goal at a time, stored beside the sessions. Null when no goal
// was ever set; a corrupt value is treated as no goal.
export function loadSessionGoal() {
  try {
    const raw = JSON.parse(localStorage.getItem(SESSION_GOAL_KEY) ?? "null");
    if (!raw || !Number.isInteger(raw.targetEarned) || typeof raw.deadline !== "string") return null;
    return raw;
  } catch {
    return null;
  }
}

export function saveSessionGoal(goal) {
  try {
    if (!goal) localStorage.removeItem(SESSION_GOAL_KEY);
    else localStorage.setItem(SESSION_GOAL_KEY, JSON.stringify(goal));
  } catch {
    // Storage unavailable: the goal simply does not persist.
  }
}

// Whole days from now until the goal's deadline, negative when the
// deadline has passed. A goal with no usable deadline has no countdown.
export function daysUntilDeadline(goal, now = new Date()) {
  if (!goal || !goal.deadline) return null;
  const end = new Date(goal.deadline);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((last - today) / 86400000);
}

// Progress against the goal: trophies earned, the target, the percent,
// days left and trophies still needed per remaining day. The pace is
// what the player must average from today — 0 when the goal is met.
export function goalProgress(goal, earnedCount, now = new Date()) {
  if (!goal) return null;
  const earned = Math.max(0, earnedCount ?? 0);
  const target = Math.max(1, goal.targetEarned);
  const daysLeft = daysUntilDeadline(goal, now);
  const remaining = Math.max(0, target - earned);
  return {
    earned,
    target,
    percent: Math.min(100, Math.round((earned / target) * 100)),
    daysLeft,
    remaining,
    perDay: daysLeft === null || daysLeft <= 0 ? remaining : Math.ceil(remaining / Math.max(1, daysLeft)),
    met: earned >= target,
  };
}

// The "time to play again" reminder: days since the last finished
// session, and whether the player is due. No finished session yet
// means the hunt has not started — the reminder says so, gently.
export function nextSessionReminder(sessions, now = new Date()) {
  const done = (sessions ?? []).filter((s) => s && s.done && s.endedAt);
  if (done.length === 0) {
    return { daysSinceLast: null, due: true, message: "No finished session yet — start your first one before you play." };
  }
  const last = done
    .map((s) => new Date(s.endedAt).getTime())
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => b - a)[0];
  const days = Math.floor((now.getTime() - last) / 86400000);
  return {
    daysSinceLast: days,
    due: days >= 3,
    message:
      days === 0
        ? "You played today — the hunt is warm."
        : days === 1
          ? "Last session was yesterday."
          : `Last session was ${days} days ago${days >= 3 ? " — time for another push." : "."}`,
  };
}

// Consecutive days with at least one finished session, counting back
// from today — the play streak. A day with no finished session breaks
// it; an open session does not count, it has not ended yet.
export function sessionStreakDays(sessions, now = new Date()) {
  const days = new Set();
  for (const s of sessions ?? []) {
    if (!s || !s.done || !s.endedAt) continue;
    const d = new Date(s.endedAt);
    if (Number.isNaN(d.getTime())) continue;
    days.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  let streak = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (;;) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    if (!days.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// Longest finished session in minutes, 0 when nothing finished yet.
export function longestSessionMinutes(sessions) {
  let best = 0;
  for (const s of sessions ?? []) {
    if (!s || !s.done || !s.startedAt || !s.endedAt) continue;
    best = Math.max(best, minutesBetween(s.startedAt, s.endedAt));
  }
  return best;
}

// Finished sessions in the last 7 days, for the weekly rhythm line.
export function sessionsThisWeek(sessions, now = new Date()) {
  const weekAgo = now.getTime() - 7 * 86400000;
  return (sessions ?? []).filter((s) => {
    if (!s || !s.done || !s.endedAt) return false;
    const t = new Date(s.endedAt).getTime();
    return Number.isFinite(t) && t >= weekAgo;
  }).length;
}

// Distinct trophy names earned across all finished sessions — the
// hunt's yield, as the log itself proves it, without re-reading the
// checklist.
export function trophiesEarnedInSessions(sessions) {
  const names = new Set();
  for (const s of sessions ?? []) {
    if (!s || !s.done || !Array.isArray(s.endEarned)) continue;
    for (const name of earnedDuring(s, [])) names.add(name);
  }
  return [...names];
}
