/**
 * Vite plugin: opt-in version bump for src/lib/versioning.ts on production
 * builds (`vite build`). The plugin only runs when the latest git commit
 * explicitly opts in — day-to-day edits never pollute APP_VERSION or the
 * "What's new" changelog.
 *
 * Rules:
 *  - Skipped unless the commit subject contains a release marker:
 *      [release]            → minor bump (+0.1)
 *      [release:minor]      → minor bump (+0.1)
 *      [release:major]      → major bump (+1.0)
 *      [release: My title]  → minor bump, with custom title
 *      [release:major: My title] → major bump, with custom title
 *  - The changelog entry is built from:
 *      • title  → custom title from marker, else commit subject (cleaned)
 *      • bullets → each non-empty line of the commit body becomes a bullet
 *        (lines starting with "- ", "* " or "• " have the prefix stripped)
 *  - Idempotent: if APP_CHANGELOG already has an entry for today at the
 *    next-bumped version, the plugin does nothing.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

const VERSIONING_FILE = resolve(process.cwd(), "src/lib/versioning.ts");

const RELEASE_MARKER =
  /\[release(?::(major|minor))?(?::\s*([^\]]+?))?\]/i;

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

function cleanSubject(subject: string): string {
  return subject
    .replace(RELEASE_MARKER, "")
    .replace(/^(feat!?|fix|chore|docs|refactor|perf|test|build|ci)(\([^)]*\))?:\s*/i, "")
    .trim();
}

function bulletsFromBody(body: string): string[] {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^[-*•]\s+/, "").trim())
    .filter((line) => line.length > 0);
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

      const marker = subject.match(RELEASE_MARKER);
      if (!marker) {
        // Opt-in only — most commits are skipped on purpose.
        return;
      }
      const type: "major" | "minor" = marker[1]?.toLowerCase() === "major" ? "major" : "minor";
      const customTitle = marker[2]?.trim();

      const src = readFileSync(VERSIONING_FILE, "utf8");
      const versionMatch = src.match(/export const APP_VERSION = "([^"]+)";/);
      if (!versionMatch) {
        console.warn("[auto-bump-version] could not find APP_VERSION");
        return;
      }
      const current = versionMatch[1];
      const today = new Date().toISOString().slice(0, 10);
      const next = bump(current, type);

      // Idempotency: skip if a v{next} entry dated today already exists.
      if (
        new RegExp(`version:\\s*"${next.replace(".", "\\.")}"[^}]*date:\\s*"${today}"`, "s").test(src)
      ) {
        console.log(`[auto-bump-version] already released v${next} today, skipping`);
        return;
      }

      const title = customTitle || cleanSubject(subject) || "Release";
      const bullets = bulletsFromBody(body);
      // If there are no body lines, fall back to the cleaned subject as a
      // single bullet so the entry isn't empty.
      const changes = bullets.length > 0 ? bullets : [title];

      // 1) Update APP_VERSION
      let updated = src.replace(/export const APP_VERSION = "[^"]+";/, `export const APP_VERSION = "${next}";`);

      // 2) Prepend a changelog entry built from commit body lines
      const changesJson = changes.map((c) => `      ${JSON.stringify(c)},`).join("\n");
      const entry =
        `  {\n` +
        `    version: "${next}",\n` +
        `    date: "${today}",\n` +
        `    type: "${type}",\n` +
        `    title: ${JSON.stringify(title)},\n` +
        `    changes: [\n` +
        `${changesJson}\n` +
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
      console.log(
        `[auto-bump-version] APP_VERSION ${current} → ${next} (${type}) — "${title}" (${changes.length} bullets)`,
      );
    },
  };
}
