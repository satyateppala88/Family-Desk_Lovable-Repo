## Plan: Clean up `useFinanceTransactions` queryFn

The current implementation has a bug: when `filters.month` is set, it rebuilds the query from scratch, which drops any previously-applied `category`/`type`/`search` filters that were chained before. It also has dead code (a `gte`/`lt` pair using the same date) and an inconsistent `limit` story.

### Replace lines 142–180 with the clean version you provided

- Single `query` builder, conditionally extended.
- Correct month-end calculation (handles December rollover to next year).
- All filters compose correctly together.
- `.limit(500)` (up from current 200, per your snippet).

```ts
queryFn: async () => {
  let query = supabase
    .from("finance_transactions")
    .select("*")
    .eq("household_id", householdId!)
    .order("transaction_date", { ascending: false })
    .limit(500);

  if (filters?.month) {
    const [y, m] = filters.month.split("-").map(Number);
    const nextMonth = m === 12
      ? `${y + 1}-01`
      : `${y}-${String(m + 1).padStart(2, "0")}`;
    query = query
      .gte("transaction_date", `${filters.month}-01`)
      .lt("transaction_date", `${nextMonth}-01`);
  }
  if (filters?.category && filters.category !== "all")
    query = query.eq("category", filters.category);
  if (filters?.type && filters.type !== "all")
    query = query.eq("type", filters.type);
  if (filters?.search)
    query = query.ilike("description", `%${filters.search}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data as FinanceTransaction[];
},
```

No other changes — wrapper (`useQuery` options, key, `enabled`, `staleTime`, `placeholderData`) stays identical.
