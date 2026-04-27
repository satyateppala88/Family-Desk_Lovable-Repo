/**
 * Central version registry for Family Desk.
 *
 * Versioning rules (apply to APP, PRIVACY POLICY and TERMS OF SERVICE):
 *  - Minor change (bug fixes, copy tweaks, small features): bump by +0.1
 *      e.g. 1.0 -> 1.1, 1.9 -> 2.0
 *  - Major change (new modules, breaking flows, significant policy rewrites): bump by +1.0
 *      e.g. 1.3 -> 2.0
 *
 * When publishing a new version:
 *  1. Update the relevant *_VERSION constant below.
 *  2. Prepend a new entry at the top of the matching *_CHANGELOG array.
 *  3. Keep entries sorted newest first.
 */

export type ChangeType = "major" | "minor";

export type FeatureTourName =
  | "dashboard"
  | "tasks"
  | "meals"
  | "grocery"
  | "habits"
  | "calendar"
  | "taskmaster";

export interface ChangelogLink {
  label: string;
  /** In-app route to navigate to. */
  to: string;
  /** If set, resets the named feature tour so it replays on arrival. */
  tour?: FeatureTourName;
}

export interface ChangelogEntry {
  version: string;
  date: string; // ISO yyyy-mm-dd
  type: ChangeType;
  title: string;
  changes: string[];
  /** Optional setup screens / feature tours related to this release. */
  links?: ChangelogLink[];
}

// ----- Current versions ---------------------------------------------------

export const APP_VERSION = "1.1";
export const PRIVACY_VERSION = "1.0";
export const TERMS_VERSION = "1.0";

export const PRIVACY_EFFECTIVE_DATE = "2026-04-27";
export const TERMS_EFFECTIVE_DATE = "2026-04-27";

// ----- Helpers ------------------------------------------------------------

/**
 * Compute the next version string given the current one and change type.
 *  - "minor" adds 0.1
 *  - "major" rounds the major up by 1 and resets the minor to 0
 */
export function bumpVersion(current: string, type: ChangeType): string {
  const [majorStr, minorStr = "0"] = current.split(".");
  const major = parseInt(majorStr, 10) || 0;
  const minor = parseInt(minorStr, 10) || 0;
  if (type === "major") return `${major + 1}.0`;
  return `${major}.${minor + 1}`;
}

export function formatVersionDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

// ----- Changelogs ---------------------------------------------------------

export const APP_CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.1",
    date: "2026-04-27",
    type: "minor",
    title: "Changes",
    changes: [
      "Changes",
    ],
  },
  {
    version: "1.0",
    date: "2026-04-27",
    type: "major",
    title: "Family Desk launches",
    changes: [
      "Household setup with invite codes, member roles and admin controls",
      "Personalised onboarding for diet, cooking, budget and routine preferences",
      "Taskmaster: today view, projects, my-tasks and AI-assisted task parsing",
      "AI meal planner with Indian cuisine focus, recipe browser and weekly plans",
      "Grocery and pantry management with low-stock and expiry alerts",
      "Calendar with Google Calendar OAuth and AI task extraction",
      "Habits with household leaderboards and AI coach insights",
      "Finance suite: transactions, budgets, savings goals, subscriptions and credit-card recommender",
      "AI assistant chat widget across the app powered by the Lovable AI Gateway",
      "WhatsApp OTP login, phone verification and notification preferences",
      "Installable Progressive Web App (PWA) with offline caching",
      "Privacy Policy and Terms of Service v1.0 published",
    ],
    links: [
      { label: "Set up household", to: "/household-setup" },
      { label: "Run onboarding", to: "/onboarding/preferences" },
      { label: "Tour the dashboard", to: "/dashboard", tour: "dashboard" },
      { label: "Tour Taskmaster", to: "/taskmaster/today", tour: "taskmaster" },
      { label: "Tour Meals", to: "/meals", tour: "meals" },
      { label: "Tour Grocery", to: "/grocery", tour: "grocery" },
      { label: "Tour Calendar", to: "/calendar", tour: "calendar" },
      { label: "Tour Habits", to: "/habits", tour: "habits" },
      { label: "Install as app", to: "/install" },
    ],
  },
];

export const PRIVACY_CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.0",
    date: PRIVACY_EFFECTIVE_DATE,
    type: "major",
    title: "Initial Privacy Policy",
    changes: [
      "Defines categories of data collected (account, household content, device, support).",
      "Documents use of Lovable Cloud, Lovable AI Gateway and Google Calendar APIs.",
      "Adds explicit coverage for WhatsApp OTP, phone verification and PWA storage.",
      "DPDP Act (India) and IT Act 2000 compliance disclosures.",
      "Lists user rights (access, correction, deletion, export) and contact path.",
      "Security safeguards: RLS, JWT validation, rate limiting, encrypted transit.",
    ],
  },
];

export const TERMS_CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.0",
    date: TERMS_EFFECTIVE_DATE,
    type: "major",
    title: "Initial Terms of Service",
    changes: [
      "Acceptance, eligibility and account responsibility clauses.",
      "User responsibilities including no privilege escalation and no API abuse.",
      "Coverage of AI features: meal plans, task parsing, calendar extraction, finance chat.",
      "Finance module disclosures: no bank connections, informational insights only.",
      "Credit-card recommender disclaimer and pre-built catalog notice.",
      "Google Calendar OAuth scope and disconnection rights.",
      "Household sharing, intellectual property, termination and Indian governing law.",
    ],
  },
];
