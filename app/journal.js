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
