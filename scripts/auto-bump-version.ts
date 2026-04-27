/**
 * Vite plugin: automatically bump APP_VERSION in src/lib/versioning.ts on
 * every production build (`vite build`).
 *
 * Rules:
 *  - Default bump is MINOR (+0.1) — i.e. a normal patch release.
 *  - If the latest git commit subject starts with "feat!:" / "BREAKING:" /
 *    contains "BREAKING CHANGE", bump MAJOR (+1.0) instead.
 *  - Skipped entirely if the latest commit subject contains "[skip-version]"
 *    or if APP_CHANGELOG already has an entry dated today (idempotent: re-runs
 *    of the same build don't keep bumping).
 *
 * The plugin also prepends a new APP_CHANGELOG entry seeded from the git
 * commit subject so the change shows up automatically in Settings → What's New.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

const VERSIONING_FILE = resolve(process.cwd(), "src/lib/versioning.ts");

function bump(version: string, type: "major" | "minor"): string {
  const [maj = "1", min = "0"] = version.split(".");
  const M = parseInt(maj, 10) || 1;
  const m = parseInt(min, 10) || 0;
  return type === "major" ? `${M + 1}.0` : `${M}.${m + 1}`;
}

function lastCommit(): { subject: string; body: string } {
  try {
    const subject = execSync("git log -1 --pretty=%s", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    const body = execSync("git log -1 --pretty=%b", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    return { subject, body };
  } catch {
    return { subject: "", body: "" };
  }
}

function detectType(subject: string, body: string): "major" | "minor" {
  const text = `${subject}\n${body}`;
  if (/^(feat!|BREAKING)/i.test(subject) || /BREAKING CHANGE/.test(text)) return "major";
  return "minor";
}

export function autoBumpVersion(): Plugin {
  let ran = false;
  return {
    name: "auto-bump-version",
    apply: "build",
    configResolved(config) {
      if (ran) return;
      if (config.command !== "build" || config.mode !== "production") return;
      ran = true;

      if (!existsSync(VERSIONING_FILE)) {
        console.warn("[auto-bump-version] versioning.ts not found, skipping");
        return;
      }

      const { subject, body } = lastCommit();
      if (!subject) {
        console.warn("[auto-bump-version] no git commit info, skipping");
        return;
      }
      if (/\[skip-version\]/i.test(subject + body)) {
        console.log("[auto-bump-version] skipped via [skip-version] marker");
        return;
      }

      const src = readFileSync(VERSIONING_FILE, "utf8");
      const versionMatch = src.match(/export const APP_VERSION = "([^"]+)";/);
      if (!versionMatch) {
        console.warn("[auto-bump-version] could not find APP_VERSION");
        return;
      }
      const current = versionMatch[1];
      const today = new Date().toISOString().slice(0, 10);

      // Idempotency: don't bump twice on the same day.
      if (new RegExp(`date:\\s*"${today}"`).test(src) && src.includes(`version: "${current}"`)) {
        const head = src.match(/APP_CHANGELOG[^\[]*\[\s*\{\s*version:\s*"([^"]+)"[^}]*date:\s*"([^"]+)"/);
        if (head && head[2] === today) {
          console.log(`[auto-bump-version] already bumped today (v${head[1]}), skipping`);
          return;
        }
      }

      const type = detectType(subject, body);
      const next = bump(current, type);
      const title = subject.replace(/^(feat!?|fix|chore|docs|refactor|perf|test|build|ci)(\([^)]*\))?:\s*/i, "").trim() || "Release";

      // 1) Update APP_VERSION
      let updated = src.replace(/export const APP_VERSION = "[^"]+";/, `export const APP_VERSION = "${next}";`);

      // 2) Prepend a changelog entry
      const entry =
        `  {\n` +
        `    version: "${next}",\n` +
        `    date: "${today}",\n` +
        `    type: "${type}",\n` +
        `    title: ${JSON.stringify(title)},\n` +
        `    changes: [\n` +
        `      ${JSON.stringify(subject)},\n` +
        `    ],\n` +
        `  },\n`;

      updated = updated.replace(
        /(export const APP_CHANGELOG: ChangelogEntry\[\] = \[\n)/,
        `$1${entry}`,
      );

      if (updated === src) {
        console.warn("[auto-bump-version] no changes written");
        return;
      }

      writeFileSync(VERSIONING_FILE, updated);
      console.log(`[auto-bump-version] APP_VERSION ${current} → ${next} (${type}) — "${title}"`);
    },
  };
}
