// Roadmap to the platinum and the missable-trophy warnings, built from the
// official trophy descriptions and the published launch-week guides.
// Sources: KeenGamer's platinum roadmap and Output Lag's trophy list
// (full URLs are in the app footer and beside each trophy's guide).
//
// Round 2: a Stage 0 was added (do this before you start), every stage now
// says exactly which trophies it covers and how many, and the missables
// section gained a "what if you already missed it" answer.
// Round 3: the roadmap itself is unchanged — the new tabs (journal,
// next hunt, timeline, quiz, print, settings) are tools around it, not
// new stages — so this file only gains a version marker and a count
// helper for callers that summarise the stages.

// Which round of the guide this roadmap belongs to.
export const ROADMAP_VERSION = 3;

// How many trophies the stages claim to cover between them, parsed from
// each stage's "covers" line ("Covers N trophies: ..."). A stage without
// a covers line contributes 0, so the total never invents a number.
export function totalRoadmapTrophies() {
  let total = 0;
  for (const stage of ROADMAP_STAGES) {
    const m = /Covers (\d+) troph/.exec(stage.covers ?? "");
    if (m) total += Number(m[1]);
  }
  return total;
}

export const PLATINUM_FACTS = [
  { num: "55", label: "trophies — 1 platinum, 2 gold, 6 silver, 46 bronze" },
  { num: "~200 h", label: "estimated time to the platinum" },
  { num: "4 / 10", label: "estimated difficulty — long, not hard" },
  { num: "1", label: "playthrough needed; no online trophies" },
  { num: "28", label: "hidden trophies, revealed only when earned" },
  { num: "0", label: "difficulty trophies, mission medals, or online trophies" },
  { num: "15", label: "manual save slots — use them, there is no mission replay" },
  { num: "1", label: "potentially missable trophy: Positive Mental Attitude" },
  { num: "3 + 1", label: "stages: prep, story, 100%, then cleanup" },
  { num: "5", label: "hidden trophies with no confirmed method yet at launch" },
];

export const ROADMAP_STAGES = [
  {
    title: "Stage 0 — Before you start: one save habit saves the platinum",
    time: "5 minutes · do this before the first mission",
    intro:
      "There is no mission replay and no New Game Plus in GTA VI, so a manual save is your only way back. Set the habit up now and the rest of the roadmap is safe.",
    covers: "Covers 1 trophy directly (Positive Mental Attitude) and protects all 13 story trophies",
    steps: [
      "Turn on spoiler-free mode in the Checklist tab if you do not want story trophy names spoiled — it hides story trophies until you earn them.",
      "Keep a manual save at the start of every chapter, plus one untouched save from just before the final mission. That is five saves to protect; rotate the other ten slots freely.",
      "Never use cheats on your trophy save: they switch off trophies and saving for that session. Use a throwaway save if you want to try them.",
      "Read the Missables & saves tab once, before Chapter 1 ends — the one missable trophy lives there, and the fix for missing it is a new playthrough.",
    ],
  },
  {
    title: "Stage 1 — Play the story, protect the one missable trophy",
    time: "60–80 hours · Chapters 1–4 and the final mission",
    intro:
      "Finish the campaign as Jason and Lucia. Twelve hidden story trophies pop as you play — the four chapter trophies, the six named-mission trophies (Breakfast Run, The Cartel Heist, Child's Play, Headliners, VCIA Takedown, Operation Savage Glory) and the final mission, which is the gold You Gotta Know When to Get Off. No mission medals are needed, so play at your own pace.",
    covers: "Covers 13 trophies: 4 chapter trophies, 6 named-mission trophies, the final mission, plus the missable meditation",
    steps: [
      "Chapter 1: after the mission Down to Earth, find Lucia at Jason's house in the morning. When she mentions meditating, follow her to the balcony and accept — that meditation counts toward Positive Mental Attitude and is gone once Chapter 1 ends.",
      "Keep a manual save at the start of every chapter, plus one untouched save from just before the final mission. There is no mission replay and no New Game Plus, so a save is your only way back.",
      "Chapter 2: visit Kingpin Bowling (the Kolt & Associates bowling alley) and take its three key valuables for Let's Go Bowling; the Vice City Real Estate app opens after Daily Driver, and the Scooter Bros app opens with the mission Moses.",
      "Chapter 3: do Race Against Yago the moment it appears — it is time-sensitive and its strand counts toward Strangers & Freaks. The mission Yasmani's Jewelry Jobs gives you the Snap Gun for jewelry store robberies.",
      "Chapter 4: the optional mission That's Where The Money Is… opens the eight bank vaults. Tail an armored security van to a large bank and bring your partner — you cannot carry all the bags alone.",
      "As you travel, scan new vehicles and landmarks with the WAiNK app and study new animals with binoculars. The 100% checklist later wants 200 base-model vehicles and 100 animal species, and collecting them as you go saves hours.",
      "Never use cheats on your trophy save: they switch off trophies and saving for that session.",
    ],
  },
  {
    title: "Stage 2 — Reach 100% completion (A Long Road)",
    time: "Around 100 hours · free roam after the story",
    intro:
      "After the credits, open Progress > Stats > 100% Completion to see the checklist. Work you did earlier already counts. You do not need everything in the game — only the numbers in the checklist — so stop each activity once its row is met.",
    covers: "Covers 10 trophies: A Long Road plus the grind trophies that share its checklist rows (stunts, challenges, shooting ranges, drone races, cards, WAiNK, vehicles, vaults, meditations)",
    table: {
      headers: ["Checklist row", "Needed for 100%"],
      rows: [
        ["Main story", "All chapters finished"],
        ["Optional tasks", "100 completed"],
        ["Gang Operations / Bank Jobs / Payday Loan Jobs", "39 of 39 / 22 of 22 / 7 of 7"],
        ["Smash 'N' Grabs / Stick Ups", "34 of 35 / 50 of 91"],
        ["Bank vaults", "8 of 8"],
        ["Money fenced", "$100,000 narcotics · $100,000 jewelry · $250,000 marked bills · $200,000 vehicles"],
        ["Collectible Card sets", "15 of 18 (the trophy only needs 3)"],
        ["WAiNK locations / Underwater discoveries", "100 scans / 33 of 33"],
        ["Meditations", "15 of 18 for 100% — all 18 for Positive Mental Attitude"],
        ["Cocaine Flamingos / Magazines, books & comics", "100 of 125 / 30 of 34"],
        ["Base-model vehicles / Standard weapons / Animals studied", "200 of 277 / 50 of 66 / 100 of 255"],
        ["Unique races won / Race Challenge gold medals", "30 of 40 / 10 of 13"],
        ["Shooting Range gold medals", "42 of 42 — the same 42 The Shootist needs"],
        ["Drone Time Trials", "42 of 42 across the 14 Top Fun locations"],
        ["Stunts", "300 of 397 (the trophy only needs 250)"],
        ["Challenges", "70 of 80 (the trophy only needs 50)"],
        ["Bret's Target Decks / Kenton's Treasure sets", "15 of 15 / 5 of 7"],
        ["Video games / Pool opponents / Mini golf / Basketball", "Play all 4 / beat 5 of 7 / play at 2 of 3 / score at 90 of 100 hoops"],
      ],
    },
    steps: [
      "Do the robberies first: they pay for the eight garages (about $160,000 together), the gym membership and the weapons the checklist wants.",
      "Leave the eight large bank vaults until That's Where The Money Is… unlocks them near the end of Chapter 4.",
      "Do not chase every collectible: 100% needs only part of most sets — 100 of 125 flamingos, 30 of 34 books and comics, 70 of 79 discovered styles.",
    ],
  },
  {
    title: "Stage 3 — Strangers & Freaks, side finales, and cleanup",
    time: "10–20 hours",
    intro:
      "With 100% done, finish the character questlines and the miscellaneous trophies that are not on the checklist. All of these stay available after the credits.",
    covers: "Covers 19 trophies: 6 side-character finales, 8 Strangers & Freaks strands, the partner and combat trophies, and the money trophies",
    steps: [
      "Complete the final mission for each side character: Andy (Lucia-only), Kenton, Billy, Randy and Tyrone (Jason-only) — each has its own trophy. Bret's hunting questline is Jason-only and ends in Fair Game.",
      "Finish 8 qualifying Strangers & Freaks mission strands across Leonida. Andy's, Billy's and Tyrone's strands do not count toward the 8 because they have their own trophies — check the trophy's progress counter after each strand.",
      "Mop up the remaining meditations for Positive Mental Attitude, the partner trophies (Hot Together, Retail Therapy), the combat trophies (Gunslinger, Challenging Tank) and the money trophies (Dime on the Dollar, Treat Yo Self, Little Boxes, On the Spot).",
      "When the last trophy pops, Vice Got a Price! — the platinum — follows.",
    ],
  },
];

export const MISSABLE_NOTES = {
  title: "The one trophy you can miss",
  trophy: "Positive Mental Attitude — meditate at every spot across Leonida.",
  body: [
    "Lucia's first meditation happens at the balcony of Jason's house in Chapter 1, after the mission Down to Earth: find her in the kitchen in the morning, follow her outside and accept. It disappears once Chapter 1 ends, and whether it is strictly required for the trophy is still unconfirmed — do it anyway and keep a Chapter 1 save until the trophy pops.",
    "The other 17 spots are marked meditation locations across Leonida (purple icons when you are close). You can meditate at a spot with both Jason and Lucia, and each character's meditation counts, so bring your partner every time. The 100% checklist needs 15 of the 18; the trophy needs all 18.",
    "Everything else in the list stays available after the story: the side-story finales, the robberies, the races and the whole 100% checklist. The only other time-sensitive item is Race Against Yago in Chapter 3 — a street race in Yago's strand that shows an hourglass icon. Do it the moment it appears, because its strand counts toward Strangers & Freaks.",
  ],
  ifYouMissed:
    "If you already finished Chapter 1 without the balcony meditation, the only way back is a save from Chapter 1 — or a new playthrough. There is no mission replay, no chapter select and no New Game Plus, so do not overwrite your Chapter 1 save until Positive Mental Attitude has popped. If you have no Chapter 1 save left, start a fresh save file for the trophy run and keep the five-save plan from the start.",
  savePlan: [
    "Save 1 — start of Chapter 1 (before Down to Earth).",
    "Save 2 — start of Chapter 2.",
    "Save 3 — start of Chapter 3, before Race Against Yago.",
    "Save 4 — start of Chapter 4.",
    "Save 5 — untouched, from just before the final mission.",
    "Rotate the other slots freely; never overwrite saves 1–5 until the platinum pops.",
  ],
};
