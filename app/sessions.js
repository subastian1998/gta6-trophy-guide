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
