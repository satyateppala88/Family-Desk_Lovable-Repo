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

export const APP_VERSION = "2.0";
export const PRIVACY_VERSION = "1.1";
export const TERMS_VERSION = "1.0";

export const PRIVACY_EFFECTIVE_DATE = "2026-04-28";
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
    version: "2.0",
    date: "2026-05-14",
    type: "major",
    title: "Family Desk 2.0 — a calmer, smarter home",
    changes: [
      "New 3-screen onboarding replaces the previous 7-screen tour — get started faster with a clearer story.",
      "Permissions now ask at the right moment instead of all at once: microphone when you first use voice, camera and photos when you change your avatar, and notifications when you land on the dashboard.",
      "Fresh visual identity with Poppins typography, FamilyDesk green, warm surfaces, and a new logo lockup.",
      "Home dashboard adds a Family Pulse weekly snapshot and a Grocery quick-action tile.",
      "Taskmaster gets 5-page sub-navigation, 5 ready-made household templates, recurring tasks with a ↺ marker, and a manual calendar scan.",
      "Calendar now supports multiple Google accounts, shows an agenda-first view on mobile, shared festivals with prep-task banners, and manual events with repeat rules.",
      "Meal planner uses pantry-aware AI suggestions, offers a 3-day mobile / 7-day desktop layout, and exports straight to a grocery PDF.",
      "Grocery module introduces AI Pantry import, quick-add checklists, auto-deduction from pantry stock, category-first navigation, and an Insights dashboard.",
      "Habits adds 7-day and 21-day challenges, a monthly Streak Freeze, and habit-stacking suggestions after you create a habit.",
      "Finance Hub launches with an AI assistant, Monthly Review, subscriptions tracker with monthly averages, and a Credit Card Optimizer.",
      "WhatsApp reminders via approved Meta templates and custom-branded email verification from familydesk.in.",
      "Household admin-invite model, per-module settings, and platform admin tools.",
      "PWA install button now recovers properly after uninstall and reinstall on Android.",
    ],
  },
  {
    version: "1.3",
    date: "2026-04-28",
    type: "minor",
    title: "Fixed security linter warnings",
    changes: [
      "Fixed security linter warnings",
    ],
  },
  {
    version: "1.2",
    date: "2026-04-28",
    type: "minor",
    title: "Install on your phone, smoother screens",
    changes: [
      "You can now add Family Desk to your home screen and open it like a regular app — it even works for a bit when you're offline.",
      "Cleaner Privacy and Terms pages that show just the latest version, so it's easier to read what matters today.",
      "Fixed the bottom-right of the home screen so the assistant button and the notifications card no longer sit on top of each other.",
      "Welcome screens now fit nicely on every phone, with no more cut-off illustrations on smaller devices.",
      "Tidied up the sign-in screen so labels and input boxes don't overlap on Android.",
      "The assistant only appears once you're signed in and your email is confirmed, to keep things calm before then.",
      "Friendlier animations across the app and a few small visual touch-ups.",
    ],
  },
  {
    version: "1.1",
    date: "2026-04-27",
    type: "minor",
    title: "Quick tours and an easier guide",
    changes: [
      "Short, friendly tours for Dashboard, Tasks, Meals, Grocery, Calendar and Habits — you can replay any of them whenever you like.",
      "Consistent page headers across every section, so the back button and titles behave the way you expect.",
      "The How to use guide is easier to navigate with a handy table of contents that follows you as you scroll.",
      "Faster loading on heavier pages and snappier responses across the app.",
      "A round of small visual polish on cards, empty states and loading screens.",
    ],
  },
  {
    version: "1.0",
    date: "2026-04-27",
    type: "major",
    title: "Family Desk launches",
    changes: [
      "Set up your household, invite family members and choose who can manage what.",
      "A quick onboarding to capture your family's food, cooking, budget and routine preferences.",
      "Tasks: a Today view, projects and personal lists, with smart help to add tasks just by typing naturally.",
      "Meal planner with an Indian-cuisine focus, a recipe browser and easy weekly plans.",
      "Grocery and pantry tracking with low-stock and expiry reminders.",
      "Family calendar with Google Calendar sync and helpful task suggestions from your events.",
      "Habits with household leaderboards and a friendly coach for nudges.",
      "Finance: track spending, budgets, savings goals, subscriptions and get credit-card suggestions.",
      "An assistant you can chat with across the app for quick help.",
      "Sign in with WhatsApp, verify your phone, and choose how you want to be notified.",
      "Install Family Desk to your home screen for an app-like experience.",
      "Our first Privacy Policy and Terms of Service.",
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
    version: "1.1",
    date: "2026-04-28",
    type: "minor",
    title: "Device permissions, voice and photo handling",
    changes: [
      "New 'Device Permissions & Sensitive Data' section covering microphone, camera, photo library and notifications.",
      "Clarifies that voice input is transcribed on-device by the operating system and audio is never recorded or uploaded.",
      "Adds 'Photos and avatars' to user content categories with storage, retention and deletion details.",
      "Documents the in-app permission priming flow and the right to revoke any permission via OS settings at any time.",
      "Aligns disclosures with Apple App Store Privacy Nutrition Labels and Google Play Data Safety requirements.",
    ],
  },
  {
    version: "1.0",
    date: "2026-04-27",
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
