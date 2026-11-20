// Plain-text checklist export for the GTA VI trophy hunt: all 55
// trophies as a printable list — [x] earned, [ ] not yet — with grade,
// kind and the missable flag on each line, so it can be printed, pasted
// into a notes app, or ticked off on paper. The text is built only from
// the official list (name, grade, kind, missable flag, description)
// plus the player's own earned set; no guide text is copied into it.
//
// The panel lives in its own "Print" tab: a live preview, a Copy button
// (clipboard with a textarea fallback), a Download .txt button, and a
// Print button that prints the page with the print stylesheet in
// style.css (navigation and buttons hidden, checklist in plain ink).

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

// One line per trophy: "[x] Positive Mental Attitude — Bronze · Missable — Meditate at every spot across Leonida."
// The description is the official one, so the printed list still says
// what each trophy asks for without needing the app open.
export function checklistLine(trophy, isEarned) {
  const box = isEarned ? "[x]" : "[ ]";
  const flags = [];
  if (trophy.missable) flags.push("MISSABLE");
  if (trophy.hidden) flags.push("hidden");
  if (trophy.confirmed === false) flags.push("method unconfirmed");
  const flagText = flags.length > 0 ? ` — ${flags.join(", ")}` : "";
  return `${box} ${trophy.name} — ${GRADE_LABELS[trophy.grade] ?? trophy.grade} · ${KIND_LABELS[trophy.kind] ?? trophy.kind}${flagText} — ${trophy.description}`;
}

// The whole printable text: a header with the date and the earned
// count, then the 55 lines in list order, then a footer that says where
// the list came from. Earned count is derived from the set passed in.
export function buildChecklistText(trophies, earned) {
  const earnedSet = earned instanceof Set ? earned : new Set(earned);
  const got = trophies.filter((t) => earnedSet.has(t.name)).length;
  const today = new Date().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  const lines = [];
  lines.push("GTA VI — Trophy checklist (PlayStation 5)");
  lines.push(`Printed ${today} · ${got} of ${trophies.length} earned · 1 Platinum, 2 Gold, 6 Silver, 46 Bronze`);
  lines.push("Tick [ ] boxes as you earn each trophy. MISSABLE: Positive Mental Attitude — meditate in Chapter 1.");
  lines.push("");
  for (const t of trophies) {
    lines.push(checklistLine(t, earnedSet.has(t.name)));
  }
  lines.push("");
  lines.push("Official names, descriptions and grades as PlayStation publishes them. Unofficial fan-made guide.");
  return lines.join("\n") + "\n";
}

// Download a text blob as a file.
export function downloadTextFile(filename, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Copy text to the clipboard, falling back to a temporary textarea and
// document.execCommand when the Clipboard API is unavailable (for
// example on an http:// localhost page in an older browser). Returns a
// promise that resolves true on success, false when both paths fail.
export async function copyTextToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

// Render the panel into root. getEarned returns the live Set of earned
// trophy names; the preview rebuilds from it on every render, so the
// printed list always matches the checklist.
export function renderPrintPanel(root, { trophies, getEarned }) {
  function render() {
    root.replaceChildren();
    const text = buildChecklistText(trophies, getEarned());

    const intro = document.createElement("p");
    intro.className = "print-intro";
    intro.textContent =
      "All 55 trophies as a plain-text checklist — [x] for earned, [ ] for the rest. Copy it, download it, or print this page.";
    root.append(intro);

    const preview = document.createElement("pre");
    preview.className = "print-preview";
    preview.textContent = text;
    root.append(preview);

    const actions = document.createElement("div");
    actions.className = "print-actions";
    const status = document.createElement("p");
    status.className = "print-status";
    status.setAttribute("aria-live", "polite");

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "print-copy-btn";
    copyBtn.textContent = "Copy to clipboard";
    copyBtn.addEventListener("click", async () => {
      const ok = await copyTextToClipboard(buildChecklistText(trophies, getEarned()));
      status.textContent = ok ? "Copied — 55 trophies on the clipboard." : "Copy failed — select the preview text and copy it by hand.";
    });

    const downloadBtn = document.createElement("button");
    downloadBtn.type = "button";
    downloadBtn.className = "print-download-btn";
    downloadBtn.textContent = "Download .txt";
    downloadBtn.addEventListener("click", () => {
      downloadTextFile("gta6-trophy-checklist.txt", buildChecklistText(trophies, getEarned()));
      status.textContent = "Downloaded gta6-trophy-checklist.txt.";
    });

    const printBtn = document.createElement("button");
    printBtn.type = "button";
    printBtn.className = "print-print-btn";
    printBtn.textContent = "Print";
    printBtn.addEventListener("click", () => window.print());

    actions.append(copyBtn, downloadBtn, printBtn);
    root.append(actions);
    root.append(status);
  }

  render();
  return { render };
}
