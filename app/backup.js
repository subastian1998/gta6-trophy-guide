// Backup — one file that holds everything this guide knows about
// you, so a cleared browser or a new computer does not lose it.
// The backup is a plain JSON file with one section per storage key
// the guide uses:
//   earned    — trophy names ticked earned ("gta6-trophy-guide-v1")
//   notes     — private per-trophy notes ("gta6-trophy-guide-notes-v1")
//   settings  — theme, text size, compact cards ("...-settings-v1")
//   sessions  — the play-session log ("...-sessions-v1")
//   spoiler   — spoiler-free mode on/off ("...-spoiler")
//   dismissed — Next-hunt dismissals ("...-hunt-dismissed-v1")
// Import validates before it writes anything: the file must be an
// object with a matching app marker, unknown trophy names are
// dropped and reported, and a section that fails validation is
// skipped while the good sections still import. Nothing is sent
// anywhere — the file is built and read entirely in this browser.
//
// The storage keys live here in one place so export and import can
// never drift apart; they match the keys the feature modules use.

import { JOURNAL_KEY } from "./journal.js";
import { SETTINGS_KEY } from "./settings.js";
import { HUNT_DISMISSED_KEY } from "./next-hunt.js";

export const EARNED_KEY = "gta6-trophy-guide-v1";
export const SESSIONS_KEY = "gta6-trophy-guide-sessions-v1";
export const SPOILER_KEY = "gta6-trophy-guide-spoiler";
export const BACKUP_META_KEY = "gta6-trophy-guide-backup-v1";
export const BACKUP_APP = "gta6-trophy-guide";
export const BACKUP_VERSION = 1;

const SECTION_KEYS = {
  earned: EARNED_KEY,
  notes: JOURNAL_KEY,
  settings: SETTINGS_KEY,
  sessions: SESSIONS_KEY,
  spoiler: SPOILER_KEY,
  dismissed: HUNT_DISMISSED_KEY,
};

function readRaw(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readJson(key, fallback) {
  const raw = readRaw(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// Read every section the guide stores, for export or for the
// "what would this backup hold" summary.
export function collectBackupSections() {
  return {
    earned: readJson(EARNED_KEY, []),
    notes: readJson(JOURNAL_KEY, {}),
    settings: readJson(SETTINGS_KEY, null),
    sessions: readJson(SESSIONS_KEY, []),
    spoiler: readRaw(SPOILER_KEY),
    dismissed: readJson(HUNT_DISMISSED_KEY, []),
  };
}

// Build the backup document. Sections that are empty are still
// included, so an import can tell "nothing stored" from "section
// missing from the file".
export function buildBackup() {
  const sections = collectBackupSections();
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    counts: {
      earned: Array.isArray(sections.earned) ? sections.earned.length : 0,
      notes: sections.notes && typeof sections.notes === "object" ? Object.keys(sections.notes).length : 0,
      sessions: Array.isArray(sections.sessions) ? sections.sessions.length : 0,
      dismissed: Array.isArray(sections.dismissed) ? sections.dismissed.length : 0,
    },
    sections,
  };
}

export function backupSummary(backup) {
  const c = backup.counts ?? {};
  const parts = [
    `${c.earned ?? 0} earned trophies`,
    `${c.notes ?? 0} notes`,
    `${c.sessions ?? 0} sessions`,
    `${c.dismissed ?? 0} dismissed hunts`,
  ];
  return `${parts.join(" · ")} · exported ${backup.exportedAt ?? "at an unknown time"}`;
}

// Validate one imported document. Returns { ok, problems, cleaned }:
// problems lists what was wrong, cleaned is the safe-to-store
// version (unknown names dropped, bad sections removed).
export function validateBackup(data, trophies) {
  const problems = [];
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, problems: ["not a JSON object"], cleaned: null };
  }
  if (data.app !== BACKUP_APP) problems.push("not a GTA VI trophy guide backup (app marker missing)");
  if (data.version !== BACKUP_VERSION) problems.push(`backup version ${data.version ?? "?"} is not version ${BACKUP_VERSION}`);
  const sections = data.sections;
  if (!sections || typeof sections !== "object") {
    return { ok: false, problems: [...problems, "no sections object"], cleaned: null };
  }
  const knownNames = new Set(trophies.map((t) => t.name));
  const cleaned = {};
  if (Array.isArray(sections.earned)) {
    const dropped = sections.earned.filter((n) => !knownNames.has(n));
    cleaned.earned = sections.earned.filter((n) => knownNames.has(n));
    if (dropped.length) problems.push(`dropped ${dropped.length} unknown trophy name${dropped.length === 1 ? "" : "s"} from earned`);
  } else if (sections.earned !== undefined) {
    problems.push("earned section is not a list — skipped");
  }
  if (sections.notes && typeof sections.notes === "object" && !Array.isArray(sections.notes)) {
    const knownIds = new Set(trophies.map((t) => String(t.id)));
    cleaned.notes = {};
    let droppedNotes = 0;
    for (const [id, note] of Object.entries(sections.notes)) {
      if (!knownIds.has(id)) {
        droppedNotes += 1;
        continue;
      }
      if (note && typeof note === "object" && typeof note.text === "string") cleaned.notes[id] = note;
      else if (typeof note === "string") cleaned.notes[id] = { text: note, editedAt: null };
      else droppedNotes += 1;
    }
    if (droppedNotes) problems.push(`dropped ${droppedNotes} note${droppedNotes === 1 ? "" : "s"} for unknown trophies`);
  } else if (sections.notes !== undefined) {
    problems.push("notes section is not an object — skipped");
  }
  if (sections.settings && typeof sections.settings === "object" && !Array.isArray(sections.settings)) {
    cleaned.settings = sections.settings;
  } else if (sections.settings !== undefined && sections.settings !== null) {
    problems.push("settings section is not an object — skipped");
  }
  if (Array.isArray(sections.sessions)) {
    cleaned.sessions = sections.sessions.filter((s) => s && typeof s === "object" && typeof s.id === "string");
    const droppedSessions = sections.sessions.length - cleaned.sessions.length;
    if (droppedSessions) problems.push(`dropped ${droppedSessions} malformed session${droppedSessions === 1 ? "" : "s"}`);
  } else if (sections.sessions !== undefined) {
    problems.push("sessions section is not a list — skipped");
  }
  if (sections.spoiler === "1" || sections.spoiler === "0" || sections.spoiler === null) {
    cleaned.spoiler = sections.spoiler;
  } else if (sections.spoiler !== undefined) {
    problems.push("spoiler section is not 0/1 — skipped");
  }
  if (Array.isArray(sections.dismissed)) {
    cleaned.dismissed = sections.dismissed.filter((n) => knownNames.has(n));
  } else if (sections.dismissed !== undefined) {
    problems.push("dismissed section is not a list — skipped");
  }
  const fatal = problems.some((p) => p.startsWith("not a GTA") || p.startsWith("no sections"));
  return { ok: !fatal, problems, cleaned };
}

// Write the cleaned sections back to storage. Returns how many
// sections were restored.
export function applyBackup(cleaned, onEarnedChange) {
  let restored = 0;
  const write = (key, value) => {
    try {
      localStorage.setItem(key, value);
      restored += 1;
    } catch {
      // Storage full or unavailable: leave the old value in place.
    }
  };
  if (cleaned.earned !== undefined) {
    write(EARNED_KEY, JSON.stringify(cleaned.earned));
    if (onEarnedChange) onEarnedChange(new Set(cleaned.earned));
  }
  if (cleaned.notes !== undefined) write(JOURNAL_KEY, JSON.stringify(cleaned.notes));
  if (cleaned.settings !== undefined) write(SETTINGS_KEY, JSON.stringify(cleaned.settings));
  if (cleaned.sessions !== undefined) write(SESSIONS_KEY, JSON.stringify(cleaned.sessions));
  if (cleaned.spoiler !== undefined && cleaned.spoiler !== null) write(SPOILER_KEY, cleaned.spoiler);
  if (cleaned.dismissed !== undefined) write(HUNT_DISMISSED_KEY, JSON.stringify(cleaned.dismissed));
  try {
    localStorage.setItem(BACKUP_META_KEY, JSON.stringify({ restoredAt: new Date().toISOString(), sections: restored }));
  } catch {
    // The restore itself still counts even if the meta note fails.
  }
  return restored;
}

export function loadBackupMeta() {
  return readJson(BACKUP_META_KEY, null);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function downloadJson(filename, data) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function renderBackup(root, { trophies, onRestore }) {
  function render() {
    const sections = collectBackupSections();
    const meta = loadBackupMeta();
    root.replaceChildren();
    root.append(el("p", "r4-intro",
      "One file, everything. Download a backup before you clear the browser or switch computers, " +
      "then import it back here — notes, sessions, settings and earned trophies included."));
    const preview = buildBackup();
    const summary = el("div", "backup-summary");
    summary.append(el("h3", "backup-summary-title", "What a backup holds right now"));
    const counts = el("ul", "backup-counts");
    counts.append(el("li", null, `${preview.counts.earned} earned trophies`));
    counts.append(el("li", null, `${preview.counts.notes} private notes`));
    counts.append(el("li", null, `${preview.counts.sessions} play sessions`));
    counts.append(el("li", null, `${preview.counts.dismissed} dismissed hunt suggestions`));
    counts.append(el("li", null, `Spoiler-free mode: ${sections.spoiler === "1" ? "on" : "off"}`));
    counts.append(el("li", null, `Settings: ${sections.settings ? "saved" : "defaults"}`));
    summary.append(counts);
    if (meta?.restoredAt) {
      summary.append(el("p", "backup-meta", `Last restore: ${meta.restoredAt} (${meta.sections} sections).`));
    }
    root.append(summary);

    const actions = el("div", "backup-actions");
    const downloadBtn = el("button", "backup-btn", "Download full backup (.json)");
    downloadBtn.type = "button";
    downloadBtn.addEventListener("click", () => {
      downloadJson("gta6-trophy-backup.json", buildBackup());
      statusEl.textContent = "Backup downloaded — keep the file somewhere safe.";
    });
    actions.append(downloadBtn);
    const copyBtn = el("button", "backup-btn", "Copy backup to clipboard");
    copyBtn.type = "button";
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(JSON.stringify(buildBackup(), null, 2));
        statusEl.textContent = "Backup copied to the clipboard.";
      } catch {
        statusEl.textContent = "Clipboard was blocked — use Download instead.";
      }
    });
    actions.append(copyBtn);
    const importLabel = el("label", "backup-import-label", "Import backup ");
    const importInput = document.createElement("input");
    importInput.type = "file";
    importInput.accept = "application/json,.json";
    importInput.className = "backup-import";
    importInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        const { ok, problems, cleaned } = validateBackup(data, trophies);
        if (!ok || !cleaned) {
          statusEl.textContent = `Import refused: ${problems.join("; ")}. Nothing was changed.`;
          return;
        }
        const restored = applyBackup(cleaned, (earnedSet) => {
          if (onRestore) onRestore(earnedSet);
        });
        statusEl.textContent =
          `Imported ${restored} section${restored === 1 ? "" : "s"}.` +
          (problems.length ? ` Notes: ${problems.join("; ")}.` : " Nothing was dropped.") +
          " The checklist has been refreshed from the restored data.";
        render();
      } catch {
        statusEl.textContent = "That file is not a valid backup JSON file. Nothing was changed.";
      }
      e.target.value = "";
    });
    importLabel.append(importInput);
    actions.append(importLabel);
    root.append(actions);

    const statusEl = el("p", "backup-status");
    root.append(statusEl);
    root.append(el("p", "backup-note",
      "A backup never leaves this browser unless you download or copy it. " +
      "Import replaces the matching sections — export first if you want to keep what is here now."));
  }
  render();
  return { render };
}
