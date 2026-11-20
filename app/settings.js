// Settings for the GTA VI trophy guide: theme, text size and card
// density, saved in this browser and applied on every visit. The panel
// lives in its own "Settings" tab. Settings are deliberately small and
// boring — three choices, each with an obvious effect — so they never
// need a manual and never touch the trophy data.
//
//   theme: "auto" follows the operating system (prefers-color-scheme),
//     "dark" is the guide's own dark look, "light" is a paper look for
//     bright rooms. Applied as data-theme on <html>; the light palette
//     lives in style.css under [data-theme="light"].
//   fontSize: "small" / "medium" / "large", applied as a class on <html>
//     that sets the base font size; everything else scales from it.
//   compact: when on, trophy cards get tighter padding and the guide
//     preview is cut shorter, so more trophies fit on one screen.
//
// Storage shape (localStorage, key SETTINGS_KEY): one small JSON
// object, e.g. { "theme": "dark", "fontSize": "medium", "compact": false }.
// Unknown values fall back to the defaults, so a corrupt or foreign
// value never breaks the page.

export const SETTINGS_KEY = "gta6-trophy-guide-settings-v1";

export const DEFAULT_SETTINGS = { theme: "auto", fontSize: "medium", compact: false };
export const THEME_OPTIONS = ["auto", "dark", "light"];
export const FONT_SIZE_OPTIONS = ["small", "medium", "large"];

export const THEME_LABELS = {
  auto: "Auto (follow system)",
  dark: "Dark",
  light: "Light",
};
export const FONT_SIZE_LABELS = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

// Read settings, filling any missing or unknown value with its default.
// A corrupt value is treated as "no settings yet", not an error.
export function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULT_SETTINGS };
    return {
      theme: THEME_OPTIONS.includes(raw.theme) ? raw.theme : DEFAULT_SETTINGS.theme,
      fontSize: FONT_SIZE_OPTIONS.includes(raw.fontSize) ? raw.fontSize : DEFAULT_SETTINGS.fontSize,
      compact: raw.compact === true,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage full or unavailable: the choice applies for this visit
    // but does not persist.
  }
}

// The theme the browser actually shows: "auto" resolves through the
// system's colour-scheme preference at the moment of the call.
export function resolveTheme(settings) {
  if (settings.theme === "light" || settings.theme === "dark") return settings.theme;
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "dark";
}

// Apply settings to the page: data-theme and data-font-size on <html>,
// plus the compact-cards class on <body>. Called on load and on every
// change, so the page never shows the wrong theme for a frame.
export function applySettings(settings) {
  const root = document.documentElement;
  root.dataset.theme = resolveTheme(settings);
  root.dataset.fontSize = settings.fontSize;
  document.body.classList.toggle("compact-cards", settings.compact === true);
  return settings;
}

// One-line human summary, used in the panel header and by callers that
// want to show the current setup without opening the panel.
export function settingsSummary(settings) {
  return (
    `Theme: ${THEME_LABELS[settings.theme] ?? settings.theme} · ` +
    `Text: ${FONT_SIZE_LABELS[settings.fontSize] ?? settings.fontSize} · ` +
    `Compact cards: ${settings.compact ? "on" : "off"}`
  );
}

// Render the panel into root. onChange, when given, is called with the
// new settings after every change, so the app can re-render anything
// that depends on them (nothing currently does — settings apply
// themselves through the <html> attributes).
export function renderSettingsPanel(root, { onChange } = {}) {
  let settings = loadSettings();

  function render() {
    root.replaceChildren();
    applySettings(settings);

    const intro = document.createElement("p");
    intro.className = "settings-intro";
    intro.textContent =
      "Make the guide yours. Everything here is saved in this browser and applies immediately — no account, no reload.";
    root.append(intro);

    const current = document.createElement("p");
    current.className = "settings-current";
    current.textContent = settingsSummary(settings);
    root.append(current);

    const form = document.createElement("div");
    form.className = "settings-form";

    const themeLabel = document.createElement("label");
    themeLabel.className = "settings-field";
    themeLabel.textContent = "Theme";
    const themeSelect = document.createElement("select");
    themeSelect.className = "settings-select";
    themeSelect.setAttribute("aria-label", "Theme");
    for (const value of THEME_OPTIONS) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = THEME_LABELS[value];
      if (settings.theme === value) option.selected = true;
      themeSelect.append(option);
    }
    themeSelect.addEventListener("change", () => {
      settings = { ...settings, theme: themeSelect.value };
      saveSettings(settings);
      applySettings(settings);
      onChange?.(settings);
      render();
    });
    themeLabel.append(themeSelect);
    form.append(themeLabel);

    const fontLabel = document.createElement("label");
    fontLabel.className = "settings-field";
    fontLabel.textContent = "Text size";
    const fontSelect = document.createElement("select");
    fontSelect.className = "settings-select";
    fontSelect.setAttribute("aria-label", "Text size");
    for (const value of FONT_SIZE_OPTIONS) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = FONT_SIZE_LABELS[value];
      if (settings.fontSize === value) option.selected = true;
      fontSelect.append(option);
    }
    fontSelect.addEventListener("change", () => {
      settings = { ...settings, fontSize: fontSelect.value };
      saveSettings(settings);
      applySettings(settings);
      onChange?.(settings);
      render();
    });
    fontLabel.append(fontSelect);
    form.append(fontLabel);

    const compactLabel = document.createElement("label");
    compactLabel.className = "settings-field settings-check";
    const compactInput = document.createElement("input");
    compactInput.type = "checkbox";
    compactInput.checked = settings.compact;
    compactInput.addEventListener("change", () => {
      settings = { ...settings, compact: compactInput.checked };
      saveSettings(settings);
      applySettings(settings);
      onChange?.(settings);
      render();
    });
    compactLabel.append(compactInput, document.createTextNode(" Compact cards — tighter padding, more trophies per screen"));
    form.append(compactLabel);
    root.append(form);

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "settings-reset-btn";
    resetBtn.textContent = "Reset to defaults";
    resetBtn.addEventListener("click", () => {
      settings = { ...DEFAULT_SETTINGS };
      saveSettings(settings);
      applySettings(settings);
      onChange?.(settings);
      render();
    });
    root.append(resetBtn);

    const note = document.createElement("p");
    note.className = "settings-note";
    note.textContent =
      "Settings live beside your progress in this browser (localStorage). Exporting progress does not export settings — set them again on a new device.";
    root.append(note);
  }

  render();
  return { render };
}
