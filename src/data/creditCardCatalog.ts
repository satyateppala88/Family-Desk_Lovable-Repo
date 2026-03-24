// ─── Credit Card Catalog ─────────────────────────────────────
// Pre-built benefits data for popular Indian credit cards.
// card_catalog_id is stable across versions.

export interface CardBenefit {
  /** Transaction category this benefit applies to (matches FINANCE_CATEGORIES keys, or "all" for universal) */
  category: string;
  /** Type of benefit */
  type: "cashback" | "reward_points";
  /** Cashback percentage, or reward-points multiplier (e.g. 5 = 5× points) */
  value: number;
  /** Human-readable description */
  description: string;
  /** Monthly/quarterly cap on the benefit in ₹, if any */
  cap?: number;
}

export interface MilestoneBenefit {
  /** Minimum monthly spend to unlock */
  threshold: number;
  /** What the user gets */
  reward: string;
}

export interface CreditCard {
  id: string;
  name: string;
  bank: string;
  network: "Visa" | "Mastercard" | "RuPay" | "Amex" | "Diners";
  annualFee: number;
  /** Key color for the card's visual badge */
  color: string;
  benefits: CardBenefit[];
  milestones: MilestoneBenefit[];
  perks: string[];
}

export const CREDIT_CARD_CATALOG: CreditCard[] = [
  // ── HDFC ────────────────────────────────────────
  {
    id: "hdfc-regalia-gold",
    name: "Regalia Gold",
    bank: "HDFC",
    network: "Visa",
    annualFee: 2500,
    color: "#1a3a5c",
    benefits: [
      { category: "all", type: "reward_points", value: 4, description: "4 reward points per ₹150 spent" },
      { category: "dining_out", type: "reward_points", value: 8, description: "8× points on dining" },
      { category: "transport", type: "reward_points", value: 8, description: "8× points on travel" },
    ],
    milestones: [
      { threshold: 100000, reward: "4 complimentary lounge visits" },
      { threshold: 500000, reward: "Annual fee reversal + bonus 10,000 points" },
    ],
    perks: ["Complimentary airport lounge access (8/yr)", "Concierge service", "Golf privileges"],
  },
  {
    id: "hdfc-millennia",
    name: "Millennia",
    bank: "HDFC",
    network: "Mastercard",
    annualFee: 1000,
    color: "#2d6a4f",
    benefits: [
      { category: "all", type: "cashback", value: 1, description: "1% cashback on all spends" },
      { category: "entertainment", type: "cashback", value: 2.5, description: "2.5% on Amazon, Flipkart, Swiggy" },
      { category: "dining_out", type: "cashback", value: 2.5, description: "2.5% on dining & food delivery" },
    ],
    milestones: [
      { threshold: 100000, reward: "1,000 bonus cashback points" },
    ],
    perks: ["4 complimentary lounge visits/yr", "1% fuel surcharge waiver"],
  },
  {
    id: "hdfc-infinia",
    name: "Infinia",
    bank: "HDFC",
    network: "Visa",
    annualFee: 12500,
    color: "#1b1b2f",
    benefits: [
      { category: "all", type: "reward_points", value: 5, description: "5 reward points per ₹150 spent" },
      { category: "dining_out", type: "reward_points", value: 10, description: "10× points on dining" },
      { category: "transport", type: "reward_points", value: 10, description: "10× points on travel" },
    ],
    milestones: [
      { threshold: 1000000, reward: "Annual fee waiver + 25,000 bonus points" },
    ],
    perks: ["Unlimited domestic & intl lounge access", "Golf privileges worldwide", "Concierge 24/7", "2× points on intl spends"],
  },
  // ── SBI ─────────────────────────────────────────
  {
    id: "sbi-simplyclick",
    name: "SimplyCLICK",
    bank: "SBI",
    network: "Visa",
    annualFee: 499,
    color: "#003d82",
    benefits: [
      { category: "all", type: "reward_points", value: 1, description: "1 point per ₹100 spent" },
      { category: "entertainment", type: "reward_points", value: 10, description: "10× on Amazon, Cleartrip, Apollo, Netmeds" },
      { category: "dining_out", type: "reward_points", value: 5, description: "5× on dining & food delivery" },
    ],
    milestones: [
      { threshold: 100000, reward: "₹2,000 Amazon gift voucher" },
      { threshold: 200000, reward: "₹7,000 Amazon gift voucher" },
    ],
    perks: ["1% fuel surcharge waiver", "Welcome gift ₹500 Amazon voucher"],
  },
  {
    id: "sbi-simplysave",
    name: "SimplySAVE",
    bank: "SBI",
    network: "Visa",
    annualFee: 499,
    color: "#005baa",
    benefits: [
      { category: "all", type: "reward_points", value: 1, description: "1 point per ₹150 spent" },
      { category: "groceries", type: "reward_points", value: 10, description: "10× on grocery" },
      { category: "dining_out", type: "reward_points", value: 10, description: "10× on dining" },
      { category: "entertainment", type: "reward_points", value: 10, description: "10× on movies & departmental stores" },
    ],
    milestones: [
      { threshold: 100000, reward: "₹2,000 cashback" },
    ],
    perks: ["1% fuel surcharge waiver"],
  },
  // ── ICICI ───────────────────────────────────────
  {
    id: "icici-amazon-pay",
    name: "Amazon Pay",
    bank: "ICICI",
    network: "Visa",
    annualFee: 0,
    color: "#ff9900",
    benefits: [
      { category: "all", type: "cashback", value: 1, description: "1% cashback on all spends" },
      { category: "entertainment", type: "cashback", value: 5, description: "5% on Amazon purchases (Prime)" },
      { category: "utilities", type: "cashback", value: 2, description: "2% on bill payments" },
    ],
    milestones: [],
    perks: ["No annual fee (lifetime free)", "Welcome gift ₹500 Amazon Pay balance"],
  },
  {
    id: "icici-sapphiro",
    name: "Sapphiro",
    bank: "ICICI",
    network: "Visa",
    annualFee: 3500,
    color: "#0a1f44",
    benefits: [
      { category: "all", type: "reward_points", value: 2, description: "2 points per ₹100 spent" },
      { category: "dining_out", type: "reward_points", value: 4, description: "4× on dining" },
      { category: "transport", type: "reward_points", value: 4, description: "4× on travel" },
    ],
    milestones: [
      { threshold: 300000, reward: "Annual fee reversal" },
    ],
    perks: ["Complimentary lounge access (4 domestic + 2 intl)", "Golf privileges", "Concierge"],
  },
  // ── Axis ────────────────────────────────────────
  {
    id: "axis-flipkart",
    name: "Flipkart Axis Bank",
    bank: "Axis",
    network: "Visa",
    annualFee: 500,
    color: "#2874f0",
    benefits: [
      { category: "all", type: "cashback", value: 1.5, description: "1.5% cashback on all spends" },
      { category: "entertainment", type: "cashback", value: 5, description: "5% on Flipkart, Myntra, 2GUD" },
      { category: "dining_out", type: "cashback", value: 4, description: "4% on Swiggy, Uber, PVR" },
    ],
    milestones: [],
    perks: ["Welcome gift ₹500 Flipkart voucher", "4 complimentary lounge visits/yr"],
  },
  {
    id: "axis-ace",
    name: "ACE",
    bank: "Axis",
    network: "Visa",
    annualFee: 499,
    color: "#5c2d91",
    benefits: [
      { category: "all", type: "cashback", value: 1, description: "1% cashback on all spends" },
      { category: "utilities", type: "cashback", value: 5, description: "5% on bill payments via Google Pay" },
      { category: "dining_out", type: "cashback", value: 4, description: "4% on Swiggy, Zomato" },
      { category: "transport", type: "cashback", value: 4, description: "4% on Ola, Uber" },
    ],
    milestones: [
      { threshold: 200000, reward: "Annual fee reversal" },
    ],
    perks: ["Google Pay integration", "1% fuel surcharge waiver"],
  },
  // ── AU Small Finance Bank ──────────────────────
  {
    id: "au-lit",
    name: "LIT",
    bank: "AU Small Finance",
    network: "Visa",
    annualFee: 0,
    color: "#e63946",
    benefits: [
      { category: "all", type: "cashback", value: 1, description: "1% on all spends (customizable)" },
      { category: "dining_out", type: "cashback", value: 3, description: "Up to 3% on chosen categories" },
      { category: "entertainment", type: "cashback", value: 3, description: "Up to 3% on chosen categories" },
    ],
    milestones: [],
    perks: ["Customizable reward categories via app", "Lifetime free", "Vistara miles conversion"],
  },
  // ── Amex ────────────────────────────────────────
  {
    id: "amex-mrcc",
    name: "Membership Rewards Credit Card",
    bank: "American Express",
    network: "Amex",
    annualFee: 1000,
    color: "#006fcf",
    benefits: [
      { category: "all", type: "reward_points", value: 1, description: "1 point per ₹50 spent" },
      { category: "dining_out", type: "reward_points", value: 5, description: "5× on Swiggy & select dining" },
      { category: "transport", type: "reward_points", value: 5, description: "5× on Uber" },
    ],
    milestones: [
      { threshold: 150000, reward: "18K bonus Membership Reward points" },
    ],
    perks: ["Milestone bonus MR points", "Taj Epicure membership", "Select lounge access"],
  },
  // ── RuPay ───────────────────────────────────────
  {
    id: "bob-easy",
    name: "Easy",
    bank: "Bank of Baroda",
    network: "RuPay",
    annualFee: 0,
    color: "#f37021",
    benefits: [
      { category: "all", type: "reward_points", value: 1, description: "1 point per ₹100 spent" },
      { category: "groceries", type: "reward_points", value: 3, description: "3× on grocery & supermarket" },
    ],
    milestones: [],
    perks: ["RuPay benefits at IRCTC & National parks", "1% fuel surcharge waiver", "No annual fee"],
  },
];

// ─── Helpers ─────────────────────────────────────────────────

/** Get all unique banks from catalog */
export const getUniqueBanks = (): string[] =>
  [...new Set(CREDIT_CARD_CATALOG.map((c) => c.bank))].sort();

/** Find the best card(s) for a given transaction category */
export function recommendBestCard(
  userCardIds: string[],
  transactionCategory: string,
  amount: number
): { card: CreditCard; benefit: CardBenefit; estimatedValue: number }[] {
  const userCards = CREDIT_CARD_CATALOG.filter((c) => userCardIds.includes(c.id));

  const scored = userCards
    .map((card) => {
      // Find the best matching benefit: prefer category-specific, fallback to "all"
      const categoryBenefit = card.benefits.find((b) => b.category === transactionCategory);
      const universalBenefit = card.benefits.find((b) => b.category === "all");
      const bestBenefit = categoryBenefit || universalBenefit;

      if (!bestBenefit) return null;

      let estimatedValue: number;
      if (bestBenefit.type === "cashback") {
        estimatedValue = (amount * bestBenefit.value) / 100;
        if (bestBenefit.cap) estimatedValue = Math.min(estimatedValue, bestBenefit.cap);
      } else {
        // Reward points: rough value ≈ ₹0.25-0.50 per point; use 0.35
        const pointsPerSpend = bestBenefit.value;
        estimatedValue = (amount / 100) * pointsPerSpend * 0.35;
      }

      return { card, benefit: bestBenefit, estimatedValue };
    })
    .filter(Boolean) as { card: CreditCard; benefit: CardBenefit; estimatedValue: number }[];

  return scored.sort((a, b) => b.estimatedValue - a.estimatedValue);
}
