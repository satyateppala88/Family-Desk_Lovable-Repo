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
  // ── HDFC (more) ─────────────────────────────────
  {
    id: "hdfc-diners-black",
    name: "Diners Club Black",
    bank: "HDFC",
    network: "Diners",
    annualFee: 10000,
    color: "#0f0f1a",
    benefits: [
      { category: "all", type: "reward_points", value: 5, description: "5 reward points per ₹150 spent" },
      { category: "dining_out", type: "reward_points", value: 10, description: "10× points on weekend dining" },
      { category: "transport", type: "reward_points", value: 10, description: "10× on SmartBuy travel" },
    ],
    milestones: [
      { threshold: 80000, reward: "₹500 BookMyShow voucher" },
      { threshold: 1500000, reward: "Annual fee reversal" },
    ],
    perks: ["Unlimited domestic & intl lounge access", "Golf privileges", "6 free golf games/qtr", "Concierge"],
  },
  {
    id: "hdfc-tata-neu-infinity",
    name: "Tata Neu Infinity",
    bank: "HDFC",
    network: "Visa",
    annualFee: 1499,
    color: "#486581",
    benefits: [
      { category: "all", type: "cashback", value: 1.5, description: "1.5% NeuCoins on all spends" },
      { category: "entertainment", type: "cashback", value: 5, description: "5% NeuCoins on Tata Neu app" },
      { category: "groceries", type: "cashback", value: 5, description: "5% on BigBasket via Tata Neu" },
    ],
    milestones: [],
    perks: ["8 lounge visits/yr (4 dom + 4 intl)", "1% fuel surcharge waiver"],
  },
  {
    id: "hdfc-marriott-bonvoy",
    name: "Marriott Bonvoy",
    bank: "HDFC",
    network: "Diners",
    annualFee: 3000,
    color: "#8b5a3c",
    benefits: [
      { category: "all", type: "reward_points", value: 2, description: "2 Marriott points per ₹150" },
      { category: "dining_out", type: "reward_points", value: 4, description: "4× on dining" },
      { category: "transport", type: "reward_points", value: 8, description: "8× on Marriott bookings" },
    ],
    milestones: [
      { threshold: 600000, reward: "1 free hotel night (cat 1-4)" },
    ],
    perks: ["Free night on joining", "Marriott Silver Elite status", "12 lounge visits/yr"],
  },
  // ── SBI (more) ──────────────────────────────────
  {
    id: "sbi-cashback",
    name: "Cashback",
    bank: "SBI",
    network: "Visa",
    annualFee: 999,
    color: "#0a4f9c",
    benefits: [
      { category: "all", type: "cashback", value: 1, description: "1% cashback on offline spends" },
      { category: "entertainment", type: "cashback", value: 5, description: "5% cashback on online spends" },
    ],
    milestones: [
      { threshold: 200000, reward: "Annual fee reversal" },
    ],
    perks: ["No category restrictions on online cashback", "₹5,000 monthly cap"],
  },
  {
    id: "sbi-elite",
    name: "Elite",
    bank: "SBI",
    network: "Mastercard",
    annualFee: 4999,
    color: "#1a1a2e",
    benefits: [
      { category: "all", type: "reward_points", value: 2, description: "2 points per ₹100 spent" },
      { category: "dining_out", type: "reward_points", value: 5, description: "5× on dining, groceries, departmental" },
    ],
    milestones: [
      { threshold: 500000, reward: "₹5,000 e-voucher" },
      { threshold: 1000000, reward: "₹10,000 e-voucher" },
    ],
    perks: ["6 international + 8 domestic lounge visits/yr", "Club Vistara Silver", "Trident Privilege Red"],
  },
  {
    id: "sbi-prime",
    name: "PRIME",
    bank: "SBI",
    network: "Visa",
    annualFee: 2999,
    color: "#003f7d",
    benefits: [
      { category: "all", type: "reward_points", value: 2, description: "2 points per ₹100 spent" },
      { category: "dining_out", type: "reward_points", value: 10, description: "10× on dining, groceries, movies" },
      { category: "utilities", type: "reward_points", value: 10, description: "10× on standing instructions for utility bills" },
    ],
    milestones: [
      { threshold: 50000, reward: "₹3,000 Pizza Hut voucher (quarterly)" },
    ],
    perks: ["Club Vistara Silver", "Trident Privilege Red Tier", "8 domestic + 4 intl lounge visits/yr"],
  },
  // ── ICICI (more) ────────────────────────────────
  {
    id: "icici-coral",
    name: "Coral",
    bank: "ICICI",
    network: "Visa",
    annualFee: 500,
    color: "#ff6b6b",
    benefits: [
      { category: "all", type: "reward_points", value: 2, description: "2 points per ₹100 spent" },
      { category: "groceries", type: "reward_points", value: 2, description: "2× on grocery & departmental" },
    ],
    milestones: [
      { threshold: 150000, reward: "Annual fee reversal" },
    ],
    perks: ["1 complimentary movie ticket/month (BookMyShow)", "4 lounge visits/yr (domestic)"],
  },
  {
    id: "icici-emeralde",
    name: "Emeralde Private Metal",
    bank: "ICICI",
    network: "Amex",
    annualFee: 12499,
    color: "#0f4c3a",
    benefits: [
      { category: "all", type: "reward_points", value: 6, description: "6 points per ₹200 spent" },
      { category: "transport", type: "reward_points", value: 12, description: "12× on flights & hotels via portal" },
    ],
    milestones: [
      { threshold: 4000000, reward: "Annual fee waiver" },
    ],
    perks: ["Unlimited domestic & intl lounge access", "Golf privileges", "Taj Epicure membership", "EazyDiner Prime"],
  },
  {
    id: "icici-makemytrip",
    name: "MakeMyTrip ICICI Signature",
    bank: "ICICI",
    network: "Mastercard",
    annualFee: 2500,
    color: "#eb2026",
    benefits: [
      { category: "all", type: "reward_points", value: 6, description: "6% myCash on all spends" },
      { category: "transport", type: "reward_points", value: 6, description: "6% myCash on MakeMyTrip travel" },
    ],
    milestones: [],
    perks: ["Welcome MMT vouchers worth ₹3,000+", "8 domestic + 4 intl lounge visits/yr", "MMT Black status"],
  },
  // ── Axis (more) ─────────────────────────────────
  {
    id: "axis-magnus",
    name: "Magnus",
    bank: "Axis",
    network: "Mastercard",
    annualFee: 12500,
    color: "#16213e",
    benefits: [
      { category: "all", type: "reward_points", value: 12, description: "12 EDGE points per ₹200" },
      { category: "transport", type: "reward_points", value: 35, description: "35× on Travel Edge portal" },
    ],
    milestones: [
      { threshold: 150000, reward: "25,000 EDGE bonus points (monthly)" },
    ],
    perks: ["Unlimited domestic + 8 intl lounge visits/yr", "Tata CLiQ vouchers", "Concierge", "BookMyShow buy-one-get-one"],
  },
  {
    id: "axis-atlas",
    name: "Atlas",
    bank: "Axis",
    network: "Visa",
    annualFee: 5000,
    color: "#1f4e79",
    benefits: [
      { category: "all", type: "reward_points", value: 2, description: "2 EDGE Miles per ₹100" },
      { category: "transport", type: "reward_points", value: 5, description: "5× on direct travel bookings" },
    ],
    milestones: [
      { threshold: 300000, reward: "2,500 bonus EDGE Miles" },
      { threshold: 750000, reward: "5,000 bonus EDGE Miles" },
    ],
    perks: ["8 domestic + 4 intl lounge visits/yr", "Convert miles 1:2 with airline partners"],
  },
  {
    id: "axis-vistara-signature",
    name: "Vistara Signature",
    bank: "Axis",
    network: "Visa",
    annualFee: 3000,
    color: "#5d2e8c",
    benefits: [
      { category: "all", type: "reward_points", value: 4, description: "4 CV Points per ₹200" },
      { category: "transport", type: "reward_points", value: 4, description: "Vistara flight bookings" },
    ],
    milestones: [
      { threshold: 750000, reward: "1 Premium Economy ticket" },
    ],
    perks: ["Welcome Vistara Premium Economy ticket", "Club Vistara Silver", "8 lounge visits/yr"],
  },
  // ── IDFC FIRST ─────────────────────────────────
  {
    id: "idfc-first-millennia",
    name: "FIRST Millennia",
    bank: "IDFC FIRST",
    network: "Visa",
    annualFee: 0,
    color: "#9b1d20",
    benefits: [
      { category: "all", type: "reward_points", value: 3, description: "3× points on spends ≤ ₹20K/mo" },
      { category: "all", type: "reward_points", value: 6, description: "6× points on spends > ₹20K/mo" },
      { category: "entertainment", type: "reward_points", value: 10, description: "10× on online spends" },
    ],
    milestones: [],
    perks: ["Lifetime free", "Low forex 1.99%", "Roadside assistance"],
  },
  {
    id: "idfc-first-wealth",
    name: "FIRST Wealth",
    bank: "IDFC FIRST",
    network: "Visa",
    annualFee: 0,
    color: "#2c3e50",
    benefits: [
      { category: "all", type: "reward_points", value: 3, description: "3× points on spends ≤ ₹20K/mo" },
      { category: "all", type: "reward_points", value: 10, description: "10× points on spends > ₹20K/mo" },
      { category: "entertainment", type: "reward_points", value: 10, description: "10× on online spends" },
    ],
    milestones: [],
    perks: ["Lifetime free", "4 complimentary domestic lounge visits/qtr", "2 intl lounge visits/qtr", "Golf privileges"],
  },
  // ── Kotak ──────────────────────────────────────
  {
    id: "kotak-811",
    name: "811 #DreamDifferent",
    bank: "Kotak",
    network: "Visa",
    annualFee: 0,
    color: "#d2232a",
    benefits: [
      { category: "all", type: "reward_points", value: 2, description: "2 points per ₹100 spent" },
      { category: "entertainment", type: "reward_points", value: 4, description: "4× on online spends" },
    ],
    milestones: [],
    perks: ["Lifetime free", "1% fuel surcharge waiver"],
  },
  {
    id: "kotak-white",
    name: "White Reserve",
    bank: "Kotak",
    network: "Visa",
    annualFee: 3000,
    color: "#1a1a1a",
    benefits: [
      { category: "all", type: "reward_points", value: 4, description: "4 White Pass points per ₹200" },
      { category: "transport", type: "reward_points", value: 10, description: "10× on travel" },
    ],
    milestones: [
      { threshold: 1500000, reward: "₹15,000 worth Tata CLiQ vouchers" },
    ],
    perks: ["12 intl lounge visits/yr", "Unlimited domestic lounge visits", "Golf privileges", "Concierge"],
  },
  // ── Yes Bank ───────────────────────────────────
  {
    id: "yes-marquee",
    name: "Marquee",
    bank: "Yes Bank",
    network: "Mastercard",
    annualFee: 9999,
    color: "#003366",
    benefits: [
      { category: "all", type: "reward_points", value: 12, description: "12 reward points per ₹200" },
      { category: "transport", type: "reward_points", value: 24, description: "24× on travel & dining" },
    ],
    milestones: [
      { threshold: 1500000, reward: "Annual fee reversal" },
    ],
    perks: ["Unlimited intl + domestic lounge visits", "Golf privileges", "Buy-one-get-one BookMyShow"],
  },
  // ── Standard Chartered ─────────────────────────
  {
    id: "sc-ultimate",
    name: "Ultimate",
    bank: "Standard Chartered",
    network: "Mastercard",
    annualFee: 5000,
    color: "#0072ce",
    benefits: [
      { category: "all", type: "reward_points", value: 5, description: "5 points per ₹150 (3.33% rewards)" },
      { category: "transport", type: "cashback", value: 5, description: "5% cashback on duty-free spends" },
    ],
    milestones: [],
    perks: ["4 intl + unlimited domestic lounge visits", "Golf privileges", "1% fuel surcharge waiver"],
  },
  // ── RBL ────────────────────────────────────────
  {
    id: "rbl-shoprite",
    name: "Shoprite",
    bank: "RBL",
    network: "Mastercard",
    annualFee: 500,
    color: "#6a1b9a",
    benefits: [
      { category: "groceries", type: "reward_points", value: 20, description: "20 points per ₹100 on grocery" },
      { category: "all", type: "reward_points", value: 2, description: "2 points per ₹100 on other spends" },
    ],
    milestones: [],
    perks: ["1% fuel surcharge waiver", "Welcome ₹500 grocery voucher"],
  },
  // ── IndusInd ───────────────────────────────────
  {
    id: "indusind-legend",
    name: "Legend",
    bank: "IndusInd",
    network: "Visa",
    annualFee: 0,
    color: "#7b1f3b",
    benefits: [
      { category: "all", type: "reward_points", value: 1, description: "1 point per ₹100 (1.5× on weekends)" },
      { category: "dining_out", type: "reward_points", value: 1.5, description: "1.5× on weekend dining" },
    ],
    milestones: [],
    perks: ["Lifetime free (on referral)", "2 lounge visits/qtr", "Golf privileges (Pioneer)"],
  },
  // ── Amex (more) ────────────────────────────────
  {
    id: "amex-platinum-travel",
    name: "Platinum Travel",
    bank: "American Express",
    network: "Amex",
    annualFee: 5000,
    color: "#1f3a5f",
    benefits: [
      { category: "all", type: "reward_points", value: 1, description: "1 MR point per ₹50 spent" },
      { category: "transport", type: "reward_points", value: 3, description: "3× on travel via portal" },
    ],
    milestones: [
      { threshold: 190000, reward: "₹7,700 Travel Vouchers" },
      { threshold: 400000, reward: "₹11,800 Taj/SeleQtions voucher" },
    ],
    perks: ["8 lounge visits/yr (Priority Pass)", "Taj benefits", "Milestone vouchers"],
  },
  {
    id: "amex-platinum-charge",
    name: "Platinum Charge",
    bank: "American Express",
    network: "Amex",
    annualFee: 66000,
    color: "#c0c0c0",
    benefits: [
      { category: "all", type: "reward_points", value: 1, description: "1 MR point per ₹40 spent" },
      { category: "transport", type: "reward_points", value: 5, description: "5× on travel via Amex Travel" },
    ],
    milestones: [],
    perks: ["Unlimited lounge access (Priority Pass + Centurion)", "Taj Epicure", "Marriott Gold", "Hilton Gold", "Dedicated concierge"],
  },
  // ── OneCard / Fintech ──────────────────────────
  {
    id: "onecard-metal",
    name: "OneCard Metal",
    bank: "OneCard",
    network: "Visa",
    annualFee: 0,
    color: "#404040",
    benefits: [
      { category: "all", type: "reward_points", value: 1, description: "1 point per ₹50 (5× on top category)" },
      { category: "entertainment", type: "reward_points", value: 5, description: "5× on top spend category" },
    ],
    milestones: [],
    perks: ["Lifetime free", "App-first experience", "Real-time controls"],
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
