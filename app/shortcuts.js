// Keyboard shortcuts for the checklist: keep the hands on the keyboard
// while ticking trophies off. Shortcuts never fire while typing in a
// field, and every shortcut is listed in the help modal (press ?).
// The number keys follow the tab order in the nav: 1 checklist,
// 2 roadmap, 3 missables, 4 planner, 5 next hunt, 6 timeline, 7 quiz,
// 8 print, 9 settings. The Sessions tab has no number because it is a
// log, not a step in the hunt — click it instead.
// "e" marks the trophy in the open guide panel earned (or unmarks it),
// which is the fastest way to tick trophies off while reading guides.

export const SHORTCUT_LIST = [
  { key: "/", label: "Focus the search box" },
  { key: "1", label: "Go to Checklist" },
  { key: "2", label: "Go to Roadmap to Platinum" },
  { key: "3", label: "Go to Missables & saves" },
  { key: "4", label: "Go to Daily planner" },
  { key: "5", label: "Go to Next hunt" },
  { key: "6", label: "Go to Timeline" },
  { key: "7", label: "Go to Quiz" },
  { key: "8", label: "Go to Print" },
  { key: "9", label: "Go to Settings" },
  { key: "e", label: "Mark the open trophy earned / unmark it" },
  { key: "?", label: "Show this list" },
  { key: "Esc", label: "Close a panel or modal" },
];

const VIEW_KEYS = { 1: "checklist", 2: "roadmap", 3: "missables", 4: "planner", 5: "nexthunt", 6: "timeline", 7: "quiz", 8: "print", 9: "settings" };

function isTyping(target) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

export function openShortcutsHelp() {
  closeShortcutsHelp();
  const overlay = document.createElement("div");
  overlay.className = "shortcuts-overlay";
  overlay.id = "shortcutsOverlay";
  const box = document.createElement("div");
  box.className = "shortcuts-help";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", "Keyboard shortcuts");
  const h = document.createElement("h2");
  h.textContent = "Keyboard shortcuts";
  box.append(h);
  const p = document.createElement("p");
  p.textContent = "Shortcuts work everywhere except while you are typing in a field.";
  box.append(p);
  const table = document.createElement("table");
  table.className = "shortcuts-table";
  const tbody = document.createElement("tbody");
  for (const s of SHORTCUT_LIST) {
    const tr = document.createElement("tr");
    const keyTd = document.createElement("td");
    const kbd = document.createElement("kbd");
    kbd.textContent = s.key;
    keyTd.append(kbd);
    const labelTd = document.createElement("td");
    labelTd.textContent = s.label;
    tr.append(keyTd, labelTd);
    tbody.append(tr);
  }
  table.append(tbody);
  box.append(table);
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "shortcuts-close-btn";
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", closeShortcutsHelp);
  box.append(closeBtn);
  overlay.append(box);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeShortcutsHelp();
  });
  document.body.append(overlay);
}

export function closeShortcutsHelp() {
  document.getElementById("shortcutsOverlay")?.remove();
}

// Callbacks: focusSearch focuses #search, switchView clicks a view tab,
// getOpenTrophy returns the trophy shown in the open guide panel (or
// null), onToggleEarned flips its earned state. helpButton, when given,
// opens the help modal on click.
export function initShortcuts({ focusSearch, switchView, getOpenTrophy, onToggleEarned, helpButton }) {
  if (helpButton) {
    helpButton.addEventListener("click", openShortcutsHelp);
  }
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Escape") {
      closeShortcutsHelp();
      return;
    }
    if (isTyping(e.target)) return;
    if (e.key === "/") {
      e.preventDefault();
      focusSearch();
    } else if (e.key === "?") {
      e.preventDefault();
      openShortcutsHelp();
    } else if (e.key >= "1" && e.key <= "9") {
      switchView(VIEW_KEYS[e.key]);
    } else if (e.key === "e" || e.key === "E") {
      const t = getOpenTrophy();
      if (t) {
        e.preventDefault();
        onToggleEarned(t);
      }
    }
  });
}
