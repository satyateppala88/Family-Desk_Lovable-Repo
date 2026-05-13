## E-05 — Indian Bill Categories + Member Contribution View

### Change 1 — Indian-specific Finance categories

**Source of truth:** `src/hooks/useFinance.ts` exports `FINANCE_CATEGORIES` and `CATEGORY_LABELS`. Every dropdown / filter / label resolver consumes these (transactions, budget, budget categories page, card recommender, transactions filter). Replacing them propagates everywhere automatically.

**New category set** (keys are snake_case, kept stable for analytics + card catalog):

```text
HOUSEHOLD
  groceries                      "Groceries"
  vegetables_fruits              "Vegetables & Fruits"
  dairy_eggs                     "Dairy & Eggs"
  lpg_cylinder                   "LPG Cylinder"
  electricity                    "Electricity"
  water                          "Water"
  piped_gas                      "Piped Gas"
  society_maintenance            "Society Maintenance"
  house_rent                     "House Rent"
  home_loan_emi                  "Home Loan EMI"
  domestic_help                  "Domestic Help (Maid/Cook/Driver)"
  security_guard_tip             "Security Guard Tip"

FAMILY
  school_tuition_fees            "School / Tuition Fees"
  stationery_books               "Stationery & Books"
  childrens_activities           "Children's Activities"
  medical_pharmacy               "Medical / Pharmacy"
  doctor_consultation            "Doctor Consultation"
  temple_pooja_donation          "Temple / Pooja / Donation"

LIFESTYLE
  dining_out                     "Dining Out"
  food_delivery                  "Food Delivery (Swiggy/Zomato)"
  entertainment                  "Entertainment (OTT, Movies, Events)"
  clothing_accessories           "Clothing & Accessories"
  personal_care                  "Personal Care"

TRANSPORT & FINANCE
  petrol_cng                     "Petrol / CNG"
  vehicle_emi                    "Vehicle EMI"
  vehicle_insurance              "Vehicle Insurance"
  auto_cab_metro                 "Auto / Cab / Metro"
  travel                         "Travel (train/flight)"
  personal_loan_emi              "Personal Loan EMI"
  credit_card_bill               "Credit Card Bill"
  life_health_insurance          "Life / Health Insurance Premium"
  sip_investment                 "SIP / Investment"

INCOME (kept — needed for type='income' transactions)
  salary                         "Salary"
  freelance                      "Freelance"
  investment_returns             "Investment Returns"   (renamed from "investment")

OTHER
  other                          "Other"
```

**Grouping in the dropdown.** `CategorySelect` currently renders one flat `Built-in` group. Extend `useFinance.ts` with a parallel constant `CATEGORY_GROUPS: { label: string; keys: string[] }[]` and update `CategorySelect` to render one `<SelectGroup>` per group (Household → Family → Lifestyle → Transport & Finance → Income → Other) so the long list is scannable. Custom categories and "Create new" continue to work as today.

**Backwards compatibility for historical rows.** Old keys (`rent`, `utilities`, `transport`, `education`, `healthcare`, `clothing`, `household`, `subscriptions`, `gifts`, `savings`, `investment`) will still appear in existing `finance_transactions` and `finance_budgets` rows. We handle this without a DB migration via a small alias map in `useFinance.ts`:

```ts
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
  subscriptions: "other", // tracked elsewhere
};
```

`resolveCategoryLabel` is updated to consult `CATEGORY_ALIASES` first so historical rows render with the new label. `INCOME_KEYS` (in `FinanceBudgetCategories.tsx`) becomes `["salary", "freelance", "investment_returns"]`.

**Card catalog:** `src/data/creditCardCatalog.ts` references category keys. Audit it and remap any keys that changed (`utilities` → `electricity`, `dining_out` stays, `transport` → `petrol_cng` for fuel cards, etc.). One pass, isolated to that file.

**Files touched:**
- `src/hooks/useFinance.ts` — replace FINANCE_CATEGORIES, CATEGORY_LABELS; add CATEGORY_GROUPS, CATEGORY_ALIASES; update resolveCategoryLabel (or wherever it lives — actually it's in CategorySelect.tsx).
- `src/components/finance/CategorySelect.tsx` — render grouped sections; teach `resolveCategoryLabel` about aliases.
- `src/pages/FinanceBudgetCategories.tsx` — update `INCOME_KEYS`.
- `src/data/creditCardCatalog.ts` — remap legacy keys used in benefit definitions.

No DB migration. No edge function changes. No changes to `finance_transactions`/`finance_budgets` schema.

---

### Change 2 — "Member contributions this month" on Finance hub

Add a new section to `src/pages/Finance.tsx`, rendered **between the Income/Spent grid (line 144) and the module grid (line 147)**, only when the household has 2+ members.

**Data hook (new): `src/hooks/useMemberContributions.ts`**
- Inputs: `householdId`, `month` (yyyy-MM).
- Query `finance_transactions` for the month range with `type='income'`, select `created_by, amount`.
- Aggregate sums by `created_by` → `{ userId, total }[]`.
- Join with `useHouseholdMembers` results in the page (avoid extra query) — return raw aggregated map and let the page combine with member metadata.

**Render (new component): `src/components/finance/MemberContributions.tsx`**
- Header: "Member contributions this month".
- For each member, one row: avatar (initials fallback), display name, amount in INR, percentage of total household income, and a thin horizontal bar (`<Progress />` from shadcn or a simple div) sized to that percentage.
- Members with `total === 0` show muted text: "₹0 — No income added yet" and an empty bar.
- Sort: highest contribution first.
- Total bar at the bottom (optional): "Total: ₹X,XX,XXX".

**Visibility rule:** the section is hidden when `members.length <= 1` — single-occupant households don't need a split view.

**Files touched:**
- New: `src/hooks/useMemberContributions.ts`, `src/components/finance/MemberContributions.tsx`.
- Edited: `src/pages/Finance.tsx` (insert section + wire data).

No DB changes — RLS on `finance_transactions` already gates by household membership, so the query works for any member.

---

### Out of scope

- Migrating data in `finance_transactions.category` (keys remain old; aliases handle display).
- Changing the subscriptions category list (`SUBSCRIPTION_CATEGORIES` in `useSubscriptions.ts`) — that's a separate dropdown the prompt didn't mention.
- Per-member income editing UI / attribution rules (created_by drives it).
- Trends/Review pages: they consume `CATEGORY_LABELS` so they pick up the new labels automatically; no extra work.