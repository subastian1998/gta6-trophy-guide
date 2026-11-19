// Hand in the GTA VI trophy guide: copy the static app (app/) and the
// screenshots (screenshots/) into the output directory, then write
// dossier.json there with the vendored make.fun library's buildDossier.
// Runs on Node 22 with the standard library only — nothing is installed
// before it runs, and it takes no arguments.
//
// In the grader the output directory is /output. Anywhere else, set
// MAKEFUN_OUTPUT_DIR to point at the directory to fill:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The program runs twice and both runs must write the same bytes, so it
// only copies files and writes the dossier — it never reads the clock,
// the environment beyond the output path, or anything else that varies.

import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

// Create the output directory when it is missing, and clear only its
// contents one by one — never delete the directory itself.
mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, "app"), join(outputDir, "app"), { recursive: true });
mkdirSync(join(outputDir, "screenshots"), { recursive: true });
if (existsSync(join(repoRoot, "screenshots"))) {
  cpSync(join(repoRoot, "screenshots"), join(outputDir, "screenshots"), { recursive: true });
}

// The caps below mirror the scorer's gate: at most 4 screenshots, each at
// most 256 KiB; app/ at most 993 files and directories and 48 MiB; the
// dossier text at most 160 KiB. buildDossier refuses an entry past them,
// so a refusal here is the same refusal the scorer would give.
writeFileSync(
  join(outputDir, "dossier.json"),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
