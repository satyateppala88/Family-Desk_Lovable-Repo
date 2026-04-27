import {
  Home,
  ListChecks,
  UtensilsCrossed,
  ShoppingCart,
  Calendar as CalendarIcon,
  Sparkles,
  Wallet,
  Bot,
  UserCog,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

export interface HowToStep {
  text: string;
  /** Optional in-app deeplink. If omitted the step is purely informational. */
  to?: string;
  cta?: string;
}

export interface HowToSection {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  steps: HowToStep[];
}

export const HOW_TO_USE_SECTIONS: HowToSection[] = [
  {
    id: "getting-started",
    title: "Getting started",
    description: "Set up your household and personalise the app.",
    icon: Home,
    steps: [
      { text: "Create or join a household with an invite code.", to: "/household-setup", cta: "Household setup" },
      { text: "Complete the onboarding so AI suggestions match your family.", to: "/onboarding/preferences", cta: "Run onboarding" },
      { text: "Invite family members and manage roles.", to: "/members", cta: "Members" },
    ],
  },
  {
    id: "tasks",
    title: "Tasks & Taskmaster",
    description: "Plan today, run projects and stay on top of work.",
    icon: ListChecks,
    steps: [
      { text: "Open Today to see your AI-prioritised plan.", to: "/taskmaster/today", cta: "Today" },
      { text: "Group work into projects with milestones.", to: "/taskmaster/projects", cta: "Projects" },
      { text: "See everything assigned to you across projects.", to: "/taskmaster/my-tasks", cta: "My tasks" },
    ],
  },
  {
    id: "meals",
    title: "Meals & recipes",
    description: "AI meal plans tuned to your dietary preferences.",
    icon: UtensilsCrossed,
    steps: [
      { text: "Generate a weekly meal plan and browse recipes.", to: "/meals", cta: "Open Meals" },
      { text: "Mark meals as cooked to refine future suggestions." },
      { text: "Push the plan into a shopping list in one tap." },
    ],
  },
  {
    id: "grocery",
    title: "Grocery & pantry",
    description: "Track what you have and what to buy next.",
    icon: ShoppingCart,
    steps: [
      { text: "Add pantry items manually or via AI photo import.", to: "/grocery", cta: "Open Grocery" },
      { text: "Watch low-stock and expiry alerts in the dashboard." },
      { text: "Build shared shopping lists for the household." },
    ],
  },
  {
    id: "calendar",
    title: "Calendar",
    description: "Unified family calendar with Google sync.",
    icon: CalendarIcon,
    steps: [
      { text: "Connect Google Calendar from the calendar page.", to: "/calendar", cta: "Open Calendar" },
      { text: "Let AI extract actionable tasks from events." },
      { text: "Use colour-coded legends to spot conflicts quickly." },
    ],
  },
  {
    id: "habits",
    title: "Habits",
    description: "Build routines and compete on the household leaderboard.",
    icon: Sparkles,
    steps: [
      { text: "Create personal or household habits.", to: "/habits", cta: "Open Habits" },
      { text: "Check in daily to build streaks." },
      { text: "Read AI coach insights for what to improve." },
    ],
  },
  {
    id: "finance",
    title: "Finance",
    description: "Track money without connecting your bank.",
    icon: Wallet,
    steps: [
      { text: "Start with the Finance home for the monthly snapshot.", to: "/finance", cta: "Finance home" },
      { text: "Log transactions and review spend categories.", to: "/finance/transactions", cta: "Transactions" },
      { text: "Set budgets and savings goals.", to: "/finance/budget", cta: "Budgets" },
      { text: "Get the best card to use for any spend.", to: "/finance/cards", cta: "Cards" },
      { text: "Ask the AI finance coach a question.", to: "/finance/chat", cta: "Finance chat" },
    ],
  },
  {
    id: "ai",
    title: "AI assistant",
    description: "Ask questions, draft tasks, summarise plans.",
    icon: Bot,
    steps: [
      { text: "Tap the floating chat button on any page to open the assistant." },
      { text: "Ask things like 'plan my day' or 'suggest a vegetarian dinner'." },
    ],
  },
  {
    id: "account",
    title: "Account & notifications",
    description: "Verify your number and choose what to be notified about.",
    icon: UserCog,
    steps: [
      { text: "Verify your phone number for WhatsApp alerts.", to: "/account-settings", cta: "Account settings" },
      { text: "Toggle which reminders and digests you receive." },
      { text: "Change password or update display name." },
    ],
  },
  {
    id: "install",
    title: "Install as an app",
    description: "Add Family Desk to your home screen.",
    icon: Smartphone,
    steps: [
      { text: "Open the install page for step-by-step instructions.", to: "/install", cta: "Install Family Desk" },
      { text: "Works on Android (Chrome) and iOS (Safari)." },
    ],
  },
];
