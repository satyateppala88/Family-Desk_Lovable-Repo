export const FESTIVAL_CHECKLISTS: Record<string, string[]> = {
  Diwali: [
    "Deep clean the house",
    "Buy diyas and candles",
    "Order sweets and dry fruits",
    "Book fireworks",
    "Send Diwali wishes",
    "Prepare rangoli materials",
  ],
  Holi: [
    "Buy colours",
    "Arrange water balloons",
    "Plan menu for Holi party",
  ],
  "Eid ul-Fitr": [
    "Plan sevai recipe",
    "Buy new clothes",
    "Arrange family gathering",
  ],
  "Eid ul-Adha": [
    "Plan biryani menu",
    "Arrange family gathering",
    "Buy new clothes",
  ],
  Janmashtami: [
    "Prepare prasad",
    "Decorate the puja area",
    "Plan fasting menu",
  ],
  Dussehra: [
    "Plan family outing for Ravan dahan",
    "Buy festive sweets",
    "Clean and decorate puja area",
  ],
  Navratri: [
    "Plan fasting menu",
    "Buy puja samagri",
    "Decorate puja area",
  ],
};

export function matchFestivalChecklist(name: string): string[] | null {
  const lower = name.toLowerCase();
  for (const key of Object.keys(FESTIVAL_CHECKLISTS)) {
    if (lower.includes(key.toLowerCase())) {
      return FESTIVAL_CHECKLISTS[key];
    }
  }
  return null;
}