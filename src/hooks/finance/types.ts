// ─── Types ───────────────────────────────────────────────────

export interface FinanceAccount {
  id: string;
  household_id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FinanceTransaction {
  id: string;
  household_id: string;
  account_id: string | null;
  amount: number;
  type: "income" | "expense" | "savings";
  category: string;
  description: string | null;
  transaction_date: string;
  is_recurring: boolean;
  recurring_pattern: any;
  tagged_member: string | null;
  notes: string | null;
  created_by: string;
  paid_by: string | null;
  savings_goal_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceBudget {
  id: string;
  household_id: string;
  month: string;
  category: string;
  planned_amount: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_recurring?: boolean;
  budget_type?: "monthly" | "annual";
  annual_amount?: number | null;
  // Resolution metadata added by useFinanceBudgets — never written to DB.
  _source?: "exact" | "recurring" | "annual";
  _originalId?: string;
  _originalMonth?: string;
}

export interface FinanceSavingsGoal {
  id: string;
  household_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FinanceMonthlySnapshot {
  id: string;
  household_id: string;
  month: string;
  total_income: number;
  total_spend: number;
  savings_actual: number;
  budget_health_score: number | null;
  created_at: string;
}

export interface AnnualBudgetRow {
  category: string;
  monthlyPlanned: number[]; // length 12, index 0 = Jan
  monthlyActual: number[];
  annualPlanned: number;
  annualActual: number;
}

export interface AnnualBudgetData {
  year: number;
  totalPlanned: number;
  totalActual: number;
  monthlyPlanned: number[]; // length 12
  monthlyActual: number[];
  rows: AnnualBudgetRow[];
}

// ─── Category constants ──────────────────────────────────────

export const FINANCE_CATEGORIES = [
  // Household
  "groceries",
  "vegetables_fruits",
  "dairy_eggs",
  "lpg_cylinder",
  "electricity",
  "water",
  "piped_gas",
  "society_maintenance",
  "house_rent",
  "home_loan_emi",
  "domestic_help",
  "security_guard_tip",
  // Family
  "school_tuition_fees",
  "stationery_books",
  "childrens_activities",
  "medical_pharmacy",
  "doctor_consultation",
  "temple_pooja_donation",
  // Lifestyle
  "dining_out",
  "food_delivery",
  "entertainment",
  "clothing_accessories",
  "personal_care",
  // Transport & Finance
  "petrol_cng",
  "vehicle_emi",
  "vehicle_insurance",
  "auto_cab_metro",
  "travel",
  "personal_loan_emi",
  "credit_card_bill",
  "life_health_insurance",
  "sip_investment",
  // Income
  "salary",
  "freelance",
  "investment_returns",
  // Other
  "other",
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  groceries: "Groceries",
  vegetables_fruits: "Vegetables & Fruits",
  dairy_eggs: "Dairy & Eggs",
  lpg_cylinder: "LPG Cylinder",
  electricity: "Electricity",
  water: "Water",
  piped_gas: "Piped Gas",
  society_maintenance: "Society Maintenance",
  house_rent: "House Rent",
  home_loan_emi: "Home Loan EMI",
  domestic_help: "Domestic Help (Maid/Cook/Driver)",
  security_guard_tip: "Security Guard Tip",
  school_tuition_fees: "School / Tuition Fees",
  stationery_books: "Stationery & Books",
  childrens_activities: "Children's Activities",
  medical_pharmacy: "Medical / Pharmacy",
  doctor_consultation: "Doctor Consultation",
  temple_pooja_donation: "Temple / Pooja / Donation",
  dining_out: "Dining Out",
  food_delivery: "Food Delivery (Swiggy/Zomato)",
  entertainment: "Entertainment (OTT, Movies, Events)",
  clothing_accessories: "Clothing & Accessories",
  personal_care: "Personal Care",
  petrol_cng: "Petrol / CNG",
  vehicle_emi: "Vehicle EMI",
  vehicle_insurance: "Vehicle Insurance",
  auto_cab_metro: "Auto / Cab / Metro",
  travel: "Travel (train/flight)",
  personal_loan_emi: "Personal Loan EMI",
  credit_card_bill: "Credit Card Bill",
  life_health_insurance: "Life / Health Insurance Premium",
  sip_investment: "SIP / Investment",
  salary: "Salary",
  freelance: "Freelance",
  investment_returns: "Investment Returns",
  other: "Other",
};

/** Visual grouping for the category dropdown. */
export const CATEGORY_GROUPS: { label: string; keys: string[] }[] = [
  {
    label: "Household",
    keys: [
      "groceries", "vegetables_fruits", "dairy_eggs",
      "lpg_cylinder", "electricity", "water", "piped_gas",
      "society_maintenance", "house_rent", "home_loan_emi",
      "domestic_help", "security_guard_tip",
    ],
  },
  {
    label: "Family",
    keys: [
      "school_tuition_fees", "stationery_books", "childrens_activities",
      "medical_pharmacy", "doctor_consultation", "temple_pooja_donation",
    ],
  },
  {
    label: "Lifestyle",
    keys: [
      "dining_out", "food_delivery", "entertainment",
      "clothing_accessories", "personal_care",
    ],
  },
  {
    label: "Transport & Finance",
    keys: [
      "petrol_cng", "vehicle_emi", "vehicle_insurance",
      "auto_cab_metro", "travel", "personal_loan_emi",
      "credit_card_bill", "life_health_insurance", "sip_investment",
    ],
  },
  {
    label: "Income",
    keys: ["salary", "freelance", "investment_returns"],
  },
  {
    label: "Other",
    keys: ["other"],
  },
];

/**
 * Maps legacy category keys (still present in historical
 * finance_transactions / finance_budgets rows) to the closest current key.
 * Used for label resolution and benefit lookups so old data keeps rendering
 * with friendly Indian-specific names without a DB migration.
 */
export const CATEGORY_ALIASES: Record<string, string> = {
  rent: "house_rent",
  utilities: "electricity",
  transport: "auto_cab_metro",
  education: "school_tuition_fees",
  healthcare: "medical_pharmacy",
  clothing: "clothing_accessories",
  household: "society_maintenance",
  gifts: "temple_pooja_donation",
  savings: "sip_investment",
  investment: "investment_returns",
  subscriptions: "other",
};

/** Sub-categories shown when transaction type = "savings". */
export const SAVINGS_CATEGORIES = [
  "sip",
  "mutual_fund",
  "sip_stock",
  "stocks",
  "fixed_deposit",
  "bank_deposit",
  "nps",
  "ppf",
  "life_insurance",
  "other",
] as const;

export const SAVINGS_CATEGORY_LABELS: Record<string, string> = {
  sip: "SIP in Mutual Fund",
  mutual_fund: "One Time Mutual Fund",
  sip_stock: "SIP in Stock",
  stocks: "One Time Stock",
  fixed_deposit: "Fixed Deposit",
  bank_deposit: "Bank Deposit",
  nps: "National Pension Scheme",
  ppf: "Public Provident Fund",
  life_insurance: "Life Insurance Premium",
  other: "Other",
};