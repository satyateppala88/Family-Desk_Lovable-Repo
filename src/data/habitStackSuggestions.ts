const RULES: { match: RegExp; suggestions: string[] }[] = [
  { match: /walk|run|jog/i, suggestions: ["5 min stretching", "8 glasses water"] },
  { match: /read/i, suggestions: ["No screens 30 min before bed", "5 min stretching"] },
  { match: /meditat|mindful/i, suggestions: ["Gratitude journal", "Deep breathing"] },
  { match: /water|hydrate/i, suggestions: ["Morning walk", "5 min stretching"] },
  { match: /journal|gratitude/i, suggestions: ["Meditate 5 min", "Read 10 pages"] },
  { match: /sleep|bed/i, suggestions: ["No screens 30 min before bed", "Gratitude journal"] },
  { match: /exercise|workout|gym/i, suggestions: ["8 glasses water", "5 min stretching"] },
];

const FALLBACK = ["8 glasses water", "5 min stretching"];

export function getHabitStackSuggestions(name: string): string[] {
  if (!name) return FALLBACK;
  for (const rule of RULES) {
    if (rule.match.test(name)) {
      return rule.suggestions.filter((s) => s.toLowerCase() !== name.toLowerCase());
    }
  }
  return FALLBACK.filter((s) => s.toLowerCase() !== name.toLowerCase());
}