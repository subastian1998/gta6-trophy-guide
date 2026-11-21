// Per-trophy private notes for the GTA VI trophy hunt: a notebook that
// lives next to each trophy's guide, saved only in this browser.
// A note is keyed by trophy id and holds plain text plus the time it was
// last edited, so a player can jot down where they left off — which
// meditation spots are done, which race still needs gold — without
// leaving the guide. Nothing here invents trophy facts: the panel shows
// only the trophy's official name and description from trophies.json,
// and the note itself is the player's own words.
//
// Storage shape (localStorage, key JOURNAL_KEY):
//   { "<trophyId>": { "text": "...", "updatedAt": "<ISO date>" } }
// Text is stored exactly as typed; the word count and the "last edited"
// line are derived from it on render, never stored separately, so they
// can never drift from the note. Export writes one plain-text file with
// every note under its trophy's official name.

export const JOURNAL_KEY = "gta6-trophy-guide-notes-v1";
export const MAX_NOTE_LENGTH = 4000;

// Read the whole notebook. A corrupt or foreign value is treated as an
// empty notebook rather than throwing — notes must never break the page.
export function loadNotes() {
  try {
    const raw = JSON.parse(localStorage.getItem(JOURNAL_KEY) ?? "{}");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const notes = {};
    for (const [key, value] of Object.entries(raw)) {
      const id = Number(key);
      if (!Number.isInteger(id)) continue;
      if (!value || typeof value.text !== "string") continue;
      notes[id] = {
        text: value.text.slice(0, MAX_NOTE_LENGTH),
        updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
      };
    }
    return notes;
  } catch {
    return {};
  }
}

export function saveNotes(notes) {
  try {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(notes));
  } catch {
    // Storage full or unavailable: the note stays on screen for this
    // visit but does not persist. The panel says so when saving fails.
  }
}

// The saved note for one trophy id, or null when there is none. An
// empty string counts as no note, so clearing the box deletes the entry.
export function getNote(trophyId) {
  const notes = loadNotes();
  const entry = notes[trophyId];
  if (!entry || !entry.text.trim()) return null;
  return entry;
}

export function hasNote(trophyId) {
  return getNote(trophyId) !== null;
}

// Save (or delete, when the text is blank) the note for one trophy.
// Returns the entry that was stored, or null when it was deleted.
export function setNote(trophyId, text) {
  const notes = loadNotes();
  const trimmed = String(text ?? "").slice(0, MAX_NOTE_LENGTH);
  if (!trimmed.trim()) {
    delete notes[trophyId];
    saveNotes(notes);
    return null;
  }
  const entry = { text: trimmed, updatedAt: new Date().toISOString() };
  notes[trophyId] = entry;
  saveNotes(notes);
  return entry;
}

export function deleteNote(trophyId) {
  const notes = loadNotes();
  delete notes[trophyId];
  saveNotes(notes);
}

// Words are runs of non-space characters; an empty note has 0 words.
export function noteWordCount(text) {
  const words = String(text ?? "").trim().split(/\s+/).filter(Boolean);
  return String(text ?? "").trim() === "" ? 0 : words.length;
}

// "12 words" / "1 word" / "0 words" — singular handled, as elsewhere.
export function wordCountLabel(text) {
  const n = noteWordCount(text);
  return `${n} word${n === 1 ? "" : "s"}`;
}

// Short local time for the "last edited" line, e.g. "Fri 20 Nov, 17:04".
export function formatEditedAt(iso) {
  if (!iso) return "not edited yet";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "not edited yet";
  return d.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// How many trophies in the list have a note attached.
export function countNotes(trophies) {
  const notes = loadNotes();
  return trophies.filter((t) => notes[t.id] && notes[t.id].text.trim()).length;
}

// Total words across all stored notes — a one-number answer to "how
// much have I written about this hunt so far".
export function notesTotalWords(trophies) {
  const notes = loadNotes();
  return trophies.reduce((n, t) => n + noteWordCount(notes[t.id]?.text ?? ""), 0);
}

// The trophies that have notes, in list order, each with its note.
export function trophiesWithNotes(trophies) {
  const notes = loadNotes();
  return trophies
    .filter((t) => notes[t.id] && notes[t.id].text.trim())
    .map((t) => ({ trophy: t, note: notes[t.id] }));
}

// One plain-text file with every note, grouped under the trophy's
// official name and grade. Trophies without notes are skipped, and the
// header says how many notes follow so an empty export is never a
// surprise. The text is built from stored notes plus official names
// only — no guide text is copied into it.
export function exportNotesText(trophies) {
  const entries = trophiesWithNotes(trophies);
  const lines = [];
  lines.push("GTA VI trophy notes — my private notes");
  lines.push(`Exported ${new Date().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · ${entries.length} note${entries.length === 1 ? "" : "s"}`);
  lines.push("");
  if (entries.length === 0) {
    lines.push("No notes yet. Open a trophy's guide and write in the notes box.");
    return lines.join("\n");
  }
  for (const { trophy, note } of entries) {
    lines.push(`## ${trophy.name} (${trophy.grade})`);
    lines.push(`Official description: “${trophy.description}”`);
    lines.push(`Last edited: ${formatEditedAt(note.updatedAt)} · ${wordCountLabel(note.text)}`);
    lines.push("");
    lines.push(note.text.trim());
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}

// Download a text blob as a file, the same way the progress export does.
export function downloadTextFile(filename, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// The short badge text for a trophy card: "Notes · 12 words", or "".
export function notesBadgeText(trophyId) {
  const note = getNote(trophyId);
  if (!note) return "";
  return `Notes · ${wordCountLabel(note.text)}`;
}

// Render the notes box for one trophy inside its guide panel. The
// textarea saves on every keystroke (debounced by the input event
// itself — localStorage writes here are tiny), the status line shows
// the live word count and last-edited time, Clear deletes the note
// after a confirm, and Export downloads every note as one .txt file.
// onChange, when given, is called after each save or delete so the
// checklist can refresh its badges and the Notes filter.
export function renderJournalSection(trophy, trophies, { onChange } = {}) {
  const section = document.createElement("section");
  section.className = "journal-section";
  section.setAttribute("aria-label", `My notes for ${trophy.name}`);

  const head = document.createElement("h3");
  head.textContent = "My notes";
  section.append(head);

  const hint = document.createElement("p");
  hint.className = "journal-hint";
  hint.textContent =
    "Private notes for this trophy — where you left off, what still needs doing. Saved only in this browser, never uploaded.";
  section.append(hint);

  const existing = getNote(trophy.id);
  const area = document.createElement("textarea");
  area.className = "journal-textarea";
  area.rows = 4;
  area.maxLength = MAX_NOTE_LENGTH;
  area.placeholder = `Notes for ${trophy.name} — e.g. which spots are done, what to try next…`;
  area.value = existing ? existing.text : "";
  area.setAttribute("aria-label", `Notes for ${trophy.name}`);
  section.append(area);

  const status = document.createElement("p");
  status.className = "journal-status";
  const refreshStatus = (entry) => {
    status.textContent = entry
      ? `Saved · ${wordCountLabel(entry.text)} · last edited ${formatEditedAt(entry.updatedAt)}`
      : `No note yet · ${wordCountLabel(area.value)}`;
  };
  refreshStatus(existing);
  section.append(status);

  const actions = document.createElement("div");
  actions.className = "journal-actions";

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "journal-clear-btn";
  clearBtn.textContent = "Clear note";
  clearBtn.addEventListener("click", () => {
    if (!getNote(trophy.id)) return;
    if (!confirm(`Delete your note for ${trophy.name}?`)) return;
    deleteNote(trophy.id);
    area.value = "";
    refreshStatus(null);
    onChange?.();
  });

  const exportBtn = document.createElement("button");
  exportBtn.type = "button";
  exportBtn.className = "journal-export-btn";
  exportBtn.textContent = "Export all notes (.txt)";
  exportBtn.addEventListener("click", () => {
    downloadTextFile("gta6-trophy-notes.txt", exportNotesText(trophies));
  });

  actions.append(clearBtn, exportBtn);
  section.append(actions);

  area.addEventListener("input", () => {
    const entry = setNote(trophy.id, area.value);
    refreshStatus(entry);
    onChange?.();
  });

  return section;
}

// ---------------------------------------------------------------------------
// Round 5 — journal extras: a JSON export/import round-trip, notebook
// statistics, a streak calendar and full-text search. The plain-text
// export above stays as the human-readable one; the JSON form below is
// the one that can be imported back without losing edit dates.
// ---------------------------------------------------------------------------

export const JOURNAL_JSON_VERSION = 1;

// The whole notebook as JSON: version, export time and one entry per
// note, each under its trophy's official name so the file stays readable.
export function exportNotesJson(trophies) {
  const notes = loadNotes();
  const byId = new Map((trophies ?? []).map((t) => [t.id, t]));
  const entries = Object.entries(notes)
    .filter(([, entry]) => entry && entry.text.trim())
    .map(([id, entry]) => ({
      trophyId: Number(id),
      name: byId.get(Number(id))?.name ?? `Trophy ${id}`,
      text: entry.text,
      updatedAt: entry.updatedAt,
    }))
    .sort((a, b) => a.trophyId - b.trophyId);
  return JSON.stringify(
    { version: JOURNAL_JSON_VERSION, exportedAt: new Date().toISOString(), notes: entries },
    null,
    2,
  );
}

// Read a JSON export back. Returns { notes, imported, skipped } where
// notes is a notebook object ready for saveNotes, or { error } when the
// text is not a notebook at all. Unknown trophy ids and over-long or
// empty texts are skipped, never stored — an import can never corrupt
// the notebook or invent a note for a trophy that does not exist.
export function importNotesJson(text, trophies) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: "That file is not valid JSON." };
  }
  if (!parsed || !Array.isArray(parsed.notes)) {
    return { error: "That JSON file is not a journal export." };
  }
  const known = new Set((trophies ?? []).map((t) => t.id));
  const notes = {};
  let imported = 0;
  let skipped = 0;
  for (const item of parsed.notes) {
    const id = Number(item?.trophyId);
    const body = typeof item?.text === "string" ? item.text.slice(0, MAX_NOTE_LENGTH) : "";
    if (!Number.isInteger(id) || !known.has(id) || !body.trim()) {
      skipped += 1;
      continue;
    }
    notes[id] = {
      text: body,
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : null,
    };
    imported += 1;
  }
  return { notes, imported, skipped };
}

// Headline numbers for the notebook: how many notes, how many words,
// the average note length, the longest note and the most recently
// edited one. Empty notebook, all zeroes and nulls — never NaN.
export function journalStats(trophies) {
  const notes = loadNotes();
  const byId = new Map((trophies ?? []).map((t) => [t.id, t]));
  const entries = Object.entries(notes).filter(([, e]) => e && e.text.trim());
  let totalWords = 0;
  let longest = null;
  let mostRecent = null;
  for (const [id, entry] of entries) {
    const words = noteWordCount(entry.text);
    totalWords += words;
    if (!longest || words > longest.words) {
      longest = { trophyId: Number(id), name: byId.get(Number(id))?.name ?? "", words };
    }
    if (!mostRecent || String(entry.updatedAt ?? "") > String(mostRecent.updatedAt ?? "")) {
      mostRecent = { trophyId: Number(id), name: byId.get(Number(id))?.name ?? "", updatedAt: entry.updatedAt };
    }
  }
  return {
    totalNotes: entries.length,
    totalWords,
    avgWords: entries.length === 0 ? 0 : Math.round(totalWords / entries.length),
    longest,
    mostRecent,
  };
}

// Days with at least one edited note, as { "YYYY-MM-DD": count }.
// The key is the local date of the edit, so the streak counts days the
// player actually wrote, in their own timezone.
export function notesByDay() {
  const notes = loadNotes();
  const days = {};
  for (const entry of Object.values(notes)) {
    if (!entry || !entry.updatedAt) continue;
    const d = new Date(entry.updatedAt);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
    days[key] = (days[key] ?? 0) + 1;
  }
  return days;
}

// Consecutive days with a note, counting back from today: the writing
// streak. A gap yesterday breaks it; a note today starts it at 1.
export function journalStreakDays(now = new Date()) {
  const days = notesByDay();
  let streak = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (;;) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(
      cursor.getDate(),
    ).padStart(2, "0")}`;
    if (!days[key]) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// Full-text search across notes and trophy names: the query matches a
// note's text or its trophy's official name, case-insensitive. Returns
// the matching notes newest-edited first, each with its trophy.
export function searchNotes(trophies, query) {
  const needle = String(query ?? "").trim().toLowerCase();
  if (!needle) return [];
  const notes = loadNotes();
  const byId = new Map((trophies ?? []).map((t) => [t.id, t]));
  return Object.entries(notes)
    .filter(([, entry]) => entry && entry.text.trim())
    .map(([id, entry]) => ({ trophy: byId.get(Number(id)), entry }))
    .filter(
      ({ trophy, entry }) =>
        entry.text.toLowerCase().includes(needle) ||
        (trophy?.name ?? "").toLowerCase().includes(needle),
    )
    .sort((a, b) => String(b.entry.updatedAt ?? "").localeCompare(String(a.entry.updatedAt ?? "")));
}

// One month of the streak calendar: every day of the month with its
// note count (0 when nothing was written), so the calendar can shade
// active days. Weeks start on Monday; days outside the month are null.
export function notesCalendarMonth(year, month) {
  const days = notesByDay();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const inMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let day = 1; day <= inMonth; day += 1) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ date: key, day, count: days[key] ?? 0 });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
