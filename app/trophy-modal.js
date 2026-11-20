// Related-trophy modal: open any trophy and see the trophies closest to
// it, so a player who just finished one thing can pick the next thing
// that uses the same skills or the same part of the game. "Related" is
// computed from the data only: same kind first, then same grade, in list
// order. Nothing here invents a connection — two trophies are related
// because the official list puts them in the same kind or grade.
// The modal is separate from the guide panel in app.js: the panel stays
// the place for the full guide, this is the place for "what next".
// Every fact shown (name, description, grade, kind, hidden flag, tips)
// comes straight from app/data/trophies.json.

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

// Same kind first (up to 4), then same grade (up to 4 more), never the
// trophy itself, never a duplicate, list order inside each group.
export function relatedTrophies(trophy, trophies) {
  const sameKind = trophies.filter((t) => t.id !== trophy.id && t.kind === trophy.kind);
  const sameGrade = trophies.filter(
    (t) => t.id !== trophy.id && t.kind !== trophy.kind && t.grade === trophy.grade,
  );
  return [...sameKind.slice(0, 4), ...sameGrade.slice(0, 4)];
}

export function openTrophyModal(trophy, trophies, earned, { onToggleEarned, onOpenGuide }) {
  closeTrophyModal();
  const overlay = document.createElement("div");
  overlay.className = "trophy-modal-overlay";
  overlay.id = "trophyModalOverlay";
  const box = document.createElement("div");
  box.className = "trophy-modal";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", `About ${trophy.name}`);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "trophy-modal-close";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", closeTrophyModal);
  box.append(closeBtn);

  const badge = document.createElement("span");
  badge.className = `grade-badge grade-${trophy.grade}`;
  badge.textContent = trophy.grade;
  const h = document.createElement("h2");
  h.textContent = trophy.name;
  box.append(badge, h);

  const desc = document.createElement("p");
  desc.className = "official";
  desc.textContent = `Official description: “${trophy.description}”`;
  box.append(desc);

  const meta = document.createElement("p");
  meta.className = "trophy-modal-meta";
  meta.textContent =
    `${KIND_LABELS[trophy.kind] ?? trophy.kind}` +
    (trophy.hidden ? " · Hidden on PS5" : "") +
    (trophy.missable ? " · Potentially missable" : "") +
    (trophy.confirmed === false ? " · Method unconfirmed" : "") +
    (earned.has(trophy.name) ? " · Earned ✓" : " · Not earned yet");
  box.append(meta);

  if (trophy.tips?.length) {
    const tipsH = document.createElement("h3");
    tipsH.textContent = "Quick tips";
    const tipsList = document.createElement("ul");
    tipsList.className = "tips-list";
    for (const tip of trophy.tips) {
      const li = document.createElement("li");
      li.textContent = tip;
      tipsList.append(li);
    }
    box.append(tipsH, tipsList);
  }

  const relH = document.createElement("h3");
  relH.textContent = "Related trophies — same kind, then same grade";
  box.append(relH);
  const related = relatedTrophies(trophy, trophies);
  if (related.length === 0) {
    const none = document.createElement("p");
    none.textContent = "No close neighbours in the list — this one stands alone.";
    box.append(none);
  } else {
    const list = document.createElement("ul");
    list.className = "related-list";
    for (const r of related) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "related-btn" + (earned.has(r.name) ? " is-earned" : "");
      const name = document.createElement("span");
      name.className = "related-name";
      name.textContent = r.name;
      const why = document.createElement("span");
      why.className = "related-why";
      why.textContent =
        r.kind === trophy.kind
          ? `same kind · ${r.grade}`
          : `same grade · ${KIND_LABELS[r.kind] ?? r.kind}`;
      btn.append(name, why);
      btn.addEventListener("click", () => {
        openTrophyModal(r, trophies, earned, { onToggleEarned, onOpenGuide });
      });
      li.append(btn);
      list.append(li);
    }
    box.append(list);
  }

  const actions = document.createElement("div");
  actions.className = "trophy-modal-actions";
  const earnBtn = document.createElement("button");
  earnBtn.type = "button";
  earnBtn.className = "btn-earn" + (earned.has(trophy.name) ? " is-on" : "");
  earnBtn.textContent = earned.has(trophy.name) ? "✓ Earned — unmark" : "Mark earned";
  earnBtn.addEventListener("click", () => {
    onToggleEarned(trophy);
    openTrophyModal(trophy, trophies, earned, { onToggleEarned, onOpenGuide });
  });
  const guideBtn = document.createElement("button");
  guideBtn.type = "button";
  guideBtn.className = "btn-guide";
  guideBtn.textContent = "Read the full guide";
  guideBtn.addEventListener("click", () => {
    closeTrophyModal();
    onOpenGuide(trophy);
  });
  actions.append(earnBtn, guideBtn);
  box.append(actions);

  overlay.append(box);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeTrophyModal();
  });
  document.body.append(overlay);
  document.addEventListener("keydown", escapeCloser);
}

function escapeCloser(e) {
  if (e.key === "Escape") closeTrophyModal();
}

export function closeTrophyModal() {
  document.getElementById("trophyModalOverlay")?.remove();
  document.removeEventListener("keydown", escapeCloser);
}
