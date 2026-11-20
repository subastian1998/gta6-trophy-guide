// Regenerate the four screenshots in screenshots/ with headless
// Chromium against the local static server (serve.ts).
//   node shots.mjs [--port 8901] [--chrome /opt/meta-chromium/chrome]
// Reads shots.json for the file names, paths and viewport, serves
// app/ on 127.0.0.1, screenshots each path at 1280x800, and refuses
// to finish if any shot is missing or over the 256 KiB scorer cap.
// Node 22, standard library only; Chromium is invoked as a
// subprocess, never through a browser-automation package.

import { spawn } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));
const NODE = process.execPath;
const args = process.argv.slice(2);
const portIndex = args.indexOf("--port");
const port = portIndex === -1 ? 8901 : Number(args[portIndex + 1]);
const chromeIndex = args.indexOf("--chrome");
const chrome = chromeIndex === -1 ? `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell` : args[chromeIndex + 1];
const MAX_BYTES = 262144;

const shots = JSON.parse(readFileSync(join(repoRoot, "shots.json"), "utf8"));

function waitForServer(url, tries = 40) {
  return new Promise((resolve, reject) => {
    let left = tries;
    const tick = async () => {
      try {
        const res = await fetch(url);
        if (res.ok) return resolve(true);
      } catch {
        // Server is not up yet; keep waiting.
      }
      left -= 1;
      if (left <= 0) return reject(new Error(`server did not answer at ${url}`));
      setTimeout(tick, 250);
    };
    tick();
  });
}

function runChrome(url, outFile) {
  return new Promise((resolve, reject) => {
    const child = spawn(chrome, [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--hide-scrollbars",
      "--window-size=1280,800",
      "--virtual-time-budget=8000",
      `--screenshot=${outFile}`,
      url,
    ], { stdio: "pipe" });
    let err = "";
    child.stderr.on("data", (d) => { err += d; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0 && existsSync(outFile)) resolve(true);
      else reject(new Error(`chrome exited ${code} for ${url}: ${err.slice(0, 400)}`));
    });
  });
}

const server = spawn(NODE, [join(repoRoot, "serve.ts"), "--port", String(port)], {
  cwd: repoRoot,
  stdio: "pipe",
});
server.stdout.on("data", () => {});
server.stderr.on("data", (d) => process.stderr.write(d));

let failed = false;
try {
  await waitForServer(`http://127.0.0.1:${port}/`);
  for (const shot of shots) {
    const outFile = join(repoRoot, "screenshots", shot.file);
    const url = `http://127.0.0.1:${port}${shot.path}`;
    await runChrome(url, outFile);
    const size = statSync(outFile).size;
    const ok = size <= MAX_BYTES;
    console.log(`${shot.file}: ${size} bytes (${(size / 1024).toFixed(1)} KiB) ${ok ? "OK" : "OVER 256 KiB CAP"}`);
    if (!ok) failed = true;
  }
  if (shots.length < 3 || shots.length > 4) {
    console.log(`expected 3 or 4 shots in shots.json, found ${shots.length}`);
    failed = true;
  }
} catch (e) {
  console.error(e.message);
  failed = true;
} finally {
  server.kill();
}
if (failed) process.exit(1);
console.log("all screenshots regenerated within the size cap");
