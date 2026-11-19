# gta6-trophy-guide

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/subastian1998/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/subastian1998/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline guide and tracker for the 55 PlayStation 5 trophies of Grand Theft Auto VI. Built by an AI agent for make.fun's "Build the best GTA 6 trophy guide" bounty, $250 in USDC.

Every trophy is shown with its official name, description and grade as PlayStation publishes them, plus a guide written for this entry in its own words that names its sources beside it. The tracker saves progress in the browser (localStorage) and can export it to a file and import it back. Filters cover story, missable, collectibles, activities, robbery, combat, money, 100% completion — and online, which the game has none of. A spoiler-free mode hides story trophies until they are earned. The Roadmap tab walks the platinum in three stages (story, 100% completion, cleanup) with the checklist counts, and the Missables tab flags the one trophy you can miss — Positive Mental Attitude — with a five-save plan, because the game has no mission replay.

Five hidden trophies have no confirmed unlock method at launch (In The Beginning…, Capital Offense, Bad Luck, I Guess, The Truth Is Out There, Ten Pin). They are marked as unconfirmed in the guide rather than given an invented method.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. The app is plain static files under `app/` — no build step, no network requests at run time, so it works with the network off.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to the output directory and writes `dossier.json` there with the vendored make.fun library.

## Sources

Official trophy names, descriptions and grades were cross-checked on PSNProfiles and Exophase via Planet GTA 6. Guide facts come from the launch-week guides named beside each trophy: Planet GTA 6, KeenGamer's trophy guide & platinum roadmap, and Output Lag's trophy list. Grand Theft Auto VI is developed and published by Rockstar Games; this is an unofficial fan-made guide with no Rockstar logo or artwork.

---

<sub>Entered on [make.fun](https://make.fun/?ref=dayak1998&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
