

# Fix: Dashboard and Meals Page Showing Different Data

## Problem

There are two meal plans for the same week (Feb 8, 2026) in the database. The dashboard and the Meals page use slightly different queries to fetch "today's meals," causing them to pick different plans and show different recipes.

- **Dashboard**: Sorts only by `week_start_date DESC` (no tiebreaker), so when two plans share the same week, the pick is unpredictable.
- **Meals page**: Sorts by `week_start_date DESC`, then `created_at DESC`, so it consistently picks the newest plan.

## Fix (2 changes)

### 1. Align the dashboard query with the Meals page query

**File: `src/hooks/useDashboardStats.ts`**

Add `.order("created_at", { ascending: false })` after the existing `week_start_date` order on the meal_plans query so both pages consistently pick the most recently created plan.

### 2. Prevent duplicate meal plans for the same week

**File: `src/hooks/useMealPlans.ts`**

In the `createMealPlan` mutation, before inserting a new plan, delete any existing meal plan for the same household and week. This prevents duplicates from accumulating.

---

### Technical Details

**`useDashboardStats.ts` change (line ~45):**

Add a secondary order:
```typescript
.order("week_start_date", { ascending: false })
.order("created_at", { ascending: false })  // new line
.limit(1)
```

**`useMealPlans.ts` change (inside `createMealPlan` mutationFn):**

Before inserting the new plan, delete old plans for the same week:
```typescript
// Remove existing plan for this week to prevent duplicates
await supabase
  .from("meal_plan_items")
  .delete()
  .in("meal_plan_id", 
    supabase.from("meal_plans")
      .select("id")
      .eq("household_id", householdId)
      .eq("week_start_date", weekStartDate)
  );

await supabase
  .from("meal_plans")
  .delete()
  .eq("household_id", householdId)
  .eq("week_start_date", weekStartDate);
```

Alternatively, a simpler approach: fetch existing plan IDs first, then delete items and plans by those IDs before creating the new one.

