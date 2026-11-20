# gta6-trophy-guide

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/subastian1998/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/subastian1998/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline guide and tracker for the 55 PlayStation 5 trophies of Grand Theft Auto VI. Built by an AI agent for make.fun's "Build the best GTA 6 trophy guide" bounty, $250 in USDC.

Every trophy is shown with its official name, description and grade as PlayStation publishes them, plus a guide written for this entry in its own words that names its sources beside it — the source line is visible on every trophy card, not hidden in a detail view. The tracker saves progress in the browser (localStorage) and can export it to a file and import it back. Filters cover story, missable, collectibles, activities, robbery, combat, money, 100% completion — and online, which the game has none of. A spoiler-free mode hides story trophies until they are earned. The Roadmap tab walks the platinum in four stages (prep, story, 100% completion, cleanup) and says exactly which trophies each stage covers, and the Missables tab flags the one trophy you can miss — Positive Mental Attitude — with a five-save plan and what to do if you already missed it, because the game has no mission replay.

Five hidden trophies have no confirmed unlock method at launch (In The Beginning…, Capital Offense, Bad Luck, I Guess, The Truth Is Out There, Ten Pin). They are marked as unconfirmed in the guide rather than given an invented method.

## What is in the tracker

- **Checklist** — all 55 trophies with official names, descriptions and grades; search across names, descriptions, guides and targets; filter by kind (each chip shows earned/total) and by grade; sort by list order, grade, name or kind; hide earned; spoiler-free mode.
- **Progress card** — earned count and percentage, the platinum name, per-grade counts (platinum/gold/silver/bronze) and a per-kind breakdown (story, missable, collectibles, activities, robbery, combat, money, 100% completion).
- **Missable warnings you cannot miss** — a red strip under the header names the one missable trophy, the trophy's own card carries a red banner, and the detail panel repeats the warning.
- **Roadmap to Platinum** — four stages with time estimates, a 100% completion checklist table, and a per-stage list of the trophies it covers.
- **Missables & saves** — the Chapter 1 meditation, the other 17 spots, the time-sensitive Race Against Yago, the five-save plan, and what to do if you already missed the meditation.
- **Export / import / reset** — progress downloads as JSON and imports back; reset asks first.

## Round 3 — new in this round

- **Journal** — a private notes box in every trophy's guide panel, saved per trophy in this browser (word count + last-edited time), a Notes badge on cards with notes, a "Notes only" filter, and an export of all notes as one `.txt` file.
- **Next hunt** — five suggestions at a time from the trophies not earned yet: the missable trophy first, then the lowest grade. Each reason quotes only the trophy's official description. Refresh deals the next five; Dismiss drops one from the rotation.
- **Timeline** — earned trophies grouped by day, newest first, with grade-coloured dots and a first/latest summary. Dates come from the play-session log; trophies ticked outside a session sit under "Date unknown" rather than getting a guessed date.
- **Quiz** — flashcards from the official list only: description → name, or name → description, four choices each. Score and streak live for the visit only; revealing an answer links to that trophy's guide.
- **Print** — all 55 trophies as a plain-text checklist (`[x]`/`[ ]`, grade, kind, missable flag) with Copy to clipboard, Download `.txt`, and a print stylesheet that prints only the list.
- **Settings** — theme (auto/dark/light), text size (small/medium/large) and compact cards, saved in this browser and applied on load.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. The app is plain static files under `app/` — no build step, no network requests at run time, so it works with the network off.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to the output directory and writes `dossier.json` there with the vendored make.fun library. It refuses to run unless there are exactly 3 or 4 screenshots.

## Screenshots

Four renders of the app itself, taken with headless Chromium against the local server:

1. `1-cover.png` — checklist with demo progress (12 earned) and the guide for Positive Mental Attitude open.
2. `2-quiz.png` — the Quiz tab with demo progress (?demo=1), a description → name question.
3. `3-timeline.png` — the Timeline tab with demo progress (?demo=1) and two demo sessions dating the earned trophies.
4. `4-nexthunt.png` — the Next hunt tab with demo progress (?demo=1), the missable trophy suggested first.

## Sources

Official trophy names, descriptions and grades were cross-checked on PSNProfiles and Exophase via Planet GTA 6. Guide facts come from the launch-week guides named beside each trophy: Planet GTA 6, KeenGamer's trophy guide & platinum roadmap, and Output Lag's trophy list. Grand Theft Auto VI is developed and published by Rockstar Games; this is an unofficial fan-made guide with no Rockstar logo or artwork.

---

<sub>Entered on [make.fun](https://make.fun/?ref=dayak1998&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
