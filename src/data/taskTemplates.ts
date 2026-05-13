import type { RecurrencePattern } from "@/lib/recurrence";
import type { TaskCategory } from "@/types/taskmaster";

export interface TaskTemplateItem {
  title: string;
  category?: TaskCategory;
  priority?: number;
  dueOffsetDays?: number;
  recurring?: RecurrencePattern;
}

export interface TaskTemplate {
  id: string;
  name: string;
  emoji: string;
  description: string;
  items: TaskTemplateItem[];
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: "month-end",
    name: "Month-end Checklist",
    emoji: "🗓️",
    description: "Bills, EMIs and monthly admin in one go.",
    items: [
      { title: "Pay electricity bill", category: "home", priority: 2, recurring: { type: "monthly", config: { day: "last" } } },
      { title: "Pay water bill", category: "home", priority: 2, recurring: { type: "monthly", config: { day: "last" } } },
      { title: "Pay society maintenance", category: "home", priority: 2, recurring: { type: "monthly", config: { day: 5 } } },
      { title: "Pay school fees", category: "kid", priority: 2, recurring: { type: "monthly", config: { day: 5 } } },
      { title: "Pay car/home loan EMI", category: "home", priority: 1, recurring: { type: "monthly", config: { day: 5 } } },
      { title: "Refill LPG cylinder", category: "home", priority: 2, recurring: { type: "monthly", config: { day: 25 } } },
      { title: "Pay credit card bill", category: "home", priority: 1, recurring: { type: "monthly", config: { day: 15 } } },
      { title: "File expense report", category: "work", priority: 3 },
      { title: "Check insurance due dates", category: "home", priority: 3 },
      { title: "Review monthly budget", category: "home", priority: 3 },
      { title: "Plan next month's events", category: "home", priority: 3 },
      { title: "Family check-in", category: "home", priority: 3 },
    ],
  },
  {
    id: "diwali",
    name: "Festival Prep — Diwali",
    emoji: "🪔",
    description: "Get the home ready for the festival of lights.",
    items: [
      { title: "Deep clean the house", category: "home", priority: 2 },
      { title: "Whitewash/paint touch-ups", category: "home", priority: 3 },
      { title: "Buy diyas and candles", category: "home", priority: 3 },
      { title: "Order sweets and mithai", category: "home", priority: 2 },
      { title: "Buy new clothes", category: "home", priority: 3 },
      { title: "Decorate with lights", category: "home", priority: 3 },
      { title: "Prepare rangoli", category: "home", priority: 3 },
      { title: "Send Diwali gifts", category: "home", priority: 2 },
      { title: "Plan family dinner menu", category: "home", priority: 3 },
      { title: "Book fireworks", category: "home", priority: 4 },
    ],
  },
  {
    id: "holi",
    name: "Festival Prep — Holi",
    emoji: "🌈",
    description: "A colourful, well-prepped Holi.",
    items: [
      { title: "Buy colours and gulal", category: "home", priority: 3 },
      { title: "Arrange water balloons and pichkaris", category: "home", priority: 3 },
      { title: "Plan thandai recipe", category: "home", priority: 3 },
      { title: "Prepare gujiya or snacks", category: "home", priority: 3 },
      { title: "Invite friends and family", category: "home", priority: 3 },
      { title: "Protect plants and furniture", category: "home", priority: 3 },
    ],
  },
  {
    id: "new-home",
    name: "New Home Setup",
    emoji: "🏡",
    description: "Move-in essentials in the right order.",
    items: [
      { title: "Electricity connection", category: "home", priority: 1 },
      { title: "Water connection", category: "home", priority: 1 },
      { title: "Gas pipeline/cylinder", category: "home", priority: 1 },
      { title: "Internet connection", category: "home", priority: 2 },
      { title: "Register with society", category: "home", priority: 2 },
      { title: "Set up kitchen", category: "home", priority: 2 },
      { title: "Unpack bedrooms", category: "home", priority: 2 },
      { title: "Buy cleaning supplies", category: "home", priority: 3 },
      { title: "Meet neighbours", category: "home", priority: 3 },
      { title: "Register children's school", category: "kid", priority: 1 },
      { title: "Find local doctor", category: "home", priority: 2 },
      { title: "Find nearest medical store", category: "home", priority: 3 },
      { title: "Set up emergency contacts", category: "home", priority: 2 },
      { title: "List nearby sabzi mandis", category: "home", priority: 3 },
      { title: "Register for society WhatsApp group", category: "home", priority: 3 },
    ],
  },
  {
    id: "school-term",
    name: "School Term Start",
    emoji: "🎒",
    description: "Smooth start to the new school term.",
    items: [
      { title: "Buy new stationery", category: "kid", priority: 2 },
      { title: "Cover textbooks and notebooks", category: "kid", priority: 3 },
      { title: "Update school uniform", category: "kid", priority: 2 },
      { title: "Check school calendar", category: "kid", priority: 2 },
      { title: "Set up school WhatsApp groups", category: "kid", priority: 3 },
      { title: "Arrange tuition if needed", category: "kid", priority: 3 },
      { title: "Buy school shoes and bags", category: "kid", priority: 2 },
      { title: "Update emergency contact with school", category: "kid", priority: 2 },
    ],
  },
];