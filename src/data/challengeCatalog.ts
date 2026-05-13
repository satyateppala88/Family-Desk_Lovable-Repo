export interface ChallengeTemplate {
  id: string;
  emoji: string;
  name: string;
  description: string;
  durations: number[];
}

export const CHALLENGE_CATALOG: ChallengeTemplate[] = [
  { id: "walk-together", emoji: "🚶", name: "Walk Together", description: "Every adult walks 30 minutes daily", durations: [7] },
  { id: "cook-at-home", emoji: "🍳", name: "Cook at Home", description: "No food delivery for the whole family", durations: [7] },
  { id: "no-screens-9pm", emoji: "📵", name: "No Screens After 9PM", description: "Screens off after 9pm for the whole household", durations: [7] },
  { id: "8-glasses-water", emoji: "💧", name: "8 Glasses of Water", description: "Every member drinks 8 glasses, daily", durations: [7] },
  { id: "5-min-tidy", emoji: "🧹", name: "5-Minute Tidy", description: "Everyone tidies one space daily", durations: [7] },
  { id: "gratitude-journal", emoji: "🙏", name: "Gratitude Journal", description: "One thing each member is grateful for", durations: [21] },
  { id: "morning-routine", emoji: "🏃", name: "Morning Routine", description: "Wake up + habit stack before 8am", durations: [21] },
];