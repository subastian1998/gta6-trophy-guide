// "What to hunt next" for the GTA VI trophy hunt: five suggestions at
// a time, picked from the trophies not earned yet. The order is the
// whole rule — the one potentially missable trophy first (it is the only
// one that can be lost), then the lowest grade first (bronze, then
// silver, gold, platinum), then list order. Nothing here invents guide
// facts: every suggestion's reason is the trophy's official description
// from trophies.json, quoted, plus its grade and kind as the list gives
// them. A suggestion can be dismissed (it stays dismissed in this
// browser until the list is reset) and Refresh deals the next five.
//
// The panel lives in its own "Next hunt" tab and re-reads the earned set
// on every render, so ticking a trophy earned anywhere in the app moves
// the suggestions on the next visit.

export const HUNT_DISMISSED_KEY = "gta6-trophy-guide-hunt-dismissed-v1";
export const HUNT_PAGE_SIZE = 5;

// Lowest grade first: bronze is the easiest tier to pick up, platinum
// last because it only follows the other 54.
const GRADE_RANK = { bronze: 0, silver: 1, gold: 2, platinum: 3 };

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

export function loadDismissed() {
  try {
    const raw = JSON.parse(localStorage.getItem(HUNT_DISMISSED_KEY) ?? "[]");
    if (!Array.isArray(raw)) return new Set();
    return new Set(raw.filter((n) => Number.isInteger(n)));
  } catch {
    return new Set();
  }
}

export function saveDismissed(dismissed) {
  try {
    localStorage.setItem(HUNT_DISMISSED_KEY, JSON.stringify([...dismissed]));
  } catch {
    // Dismissals simply do not persist; the panel still works.
  }
}

// The reason string for one suggestion. It is built only from the
// trophy's own data: the missable flag, the official description, the
// grade and the kind. No guide text, no invented next step.
export function suggestionReason(trophy) {
  const parts = [];
  if (trophy.missable) parts.push("Potentially missable — do this before it can be lost.");
  parts.push(`Official description: “${trophy.description}”`);
  parts.push(`${GRADE_LABELS[trophy.grade] ?? trophy.grade} · ${KIND_LABELS[trophy.kind] ?? trophy.kind}`);
  if (trophy.confirmed === false) parts.push("Unlock method unconfirmed at launch.");
  return parts.join(" ");
}

// The unearned, not-dismissed trophies in hunt order: missable first,
// then lowest grade, then list order. The platinum is last by grade,
// which is right — it follows the other 54.
export function orderForHunt(trophies, earned, dismissed) {
  const earnedSet = earned instanceof Set ? earned : new Set(earned);
  return trophies
    .filter((t) => !earnedSet.has(t.name) && !dismissed.has(t.id))
    .sort((a, b) => {
      if (Boolean(a.missable) !== Boolean(b.missable)) return a.missable ? -1 : 1;
      const ga = GRADE_RANK[a.grade] ?? 99;
      const gb = GRADE_RANK[b.grade] ?? 99;
      if (ga !== gb) return ga - gb;
      return a.id - b.id;
    });
}

// Up to `count` suggestions starting at `offset` in hunt order. The
// offset wraps, so Refresh past the end of the list deals from the top.
export function suggestNext(trophies, earned, dismissed, offset = 0, count = HUNT_PAGE_SIZE) {
  const ordered = orderForHunt(trophies, earned, dismissed);
  if (ordered.length === 0) return [];
  const start = ((offset % ordered.length) + ordered.length) % ordered.length;
  const out = [];
  for (let i = 0; i < Math.min(count, ordered.length); i += 1) {
    out.push(ordered[(start + i) % ordered.length]);
  }
  return out;
}

// One line for the hunt header: how many trophies are still hunted
// and which one heads the queue.
export function huntRemainingText(trophies, earned, dismissed) {
  const ordered = orderForHunt(trophies, earned, dismissed);
  if (ordered.length === 0) return "Nothing left to hunt — every trophy is earned or dismissed.";
  return `${ordered.length} trophies left to hunt — next up is ${ordered[0].name}.`;
}

// Render the panel into root. getEarned returns the live Set of earned
// trophy names; onOpenGuide opens a trophy's guide panel. Refresh deals
// the next five; Dismiss drops one suggestion from the rotation.
export function renderNextHunt(root, { trophies, getEarned, onOpenGuide }) {
  let dismissed = loadDismissed();
  let offset = 0;

  function render() {
    root.replaceChildren();
    const earned = getEarned();
    const ordered = orderForHunt(trophies, earned, dismissed);
    const suggestions = suggestNext(trophies, earned, dismissed, offset);

    const intro = document.createElement("p");
    intro.className = "hunt-intro";
    intro.textContent =
      "Five trophies to chase next, in hunt order: the missable one first, then the lowest grade. Every reason below is the trophy's official description — nothing invented.";
    root.append(intro);

    const head = document.createElement("div");
    head.className = "hunt-head";
    const count = document.createElement("p");
    count.className = "hunt-count";
    count.textContent =
      ordered.length === 0
        ? "Every trophy is earned — the platinum is yours."
        : `${ordered.length} troph${ordered.length === 1 ? "y" : "ies"} left to hunt.`;
    const refreshBtn = document.createElement("button");
    refreshBtn.type = "button";
    refreshBtn.className = "hunt-refresh-btn";
    refreshBtn.textContent = "Refresh — deal the next five";
    refreshBtn.disabled = ordered.length <= HUNT_PAGE_SIZE;
    refreshBtn.addEventListener("click", () => {
      offset += HUNT_PAGE_SIZE;
      render();
    });
    head.append(count, refreshBtn);
    root.append(head);

    if (suggestions.length === 0) {
      const done = document.createElement("p");
      done.className = "hunt-done";
      done.textContent =
        dismissed.size > 0
          ? "Nothing left to suggest — the rest are earned or dismissed. Clear dismissals to see them again."
          : "Nothing left to suggest.";
      root.append(done);
    }

    const list = document.createElement("ol");
    list.className = "hunt-list";
    for (const t of suggestions) {
      const li = document.createElement("li");
      li.className = "hunt-item" + (t.missable ? " is-missable" : "");
      const top = document.createElement("div");
      top.className = "hunt-item-top";
      const badge = document.createElement("span");
      badge.className = `grade-badge grade-${t.grade}`;
      badge.textContent = t.grade;
      const name = document.createElement("strong");
      name.className = "hunt-name";
      name.textContent = t.name;
      top.append(badge, name);
      li.append(top);

      const reason = document.createElement("p");
      reason.className = "hunt-reason";
      reason.textContent = suggestionReason(t);
      li.append(reason);

      const actions = document.createElement("div");
      actions.className = "hunt-actions";
      const guideBtn = document.createElement("button");
      guideBtn.type = "button";
      guideBtn.className = "btn-guide";
      guideBtn.textContent = "Read the guide";
      guideBtn.addEventListener("click", () => onOpenGuide(t));
      const dismissBtn = document.createElement("button");
      dismissBtn.type = "button";
      dismissBtn.className = "hunt-dismiss-btn";
      dismissBtn.textContent = "Dismiss";
      dismissBtn.setAttribute("aria-label", `Dismiss ${t.name} from suggestions`);
      dismissBtn.addEventListener("click", () => {
        dismissed.add(t.id);
        saveDismissed(dismissed);
        render();
      });
      actions.append(guideBtn, dismissBtn);
      li.append(actions);
      list.append(li);
    }
    root.append(list);

    if (dismissed.size > 0) {
      const resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.className = "hunt-reset-btn";
      resetBtn.textContent = `Clear ${dismissed.size} dismissed suggestion${dismissed.size === 1 ? "" : "s"}`;
      resetBtn.addEventListener("click", () => {
        dismissed = new Set();
        saveDismissed(dismissed);
        offset = 0;
        render();
      });
      root.append(resetBtn);
    }
  }

  render();
  return { render };
}
