import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";
import type { AnnualBudgetData, AnnualBudgetRow, FinanceBudget } from "./types";

export const useFinanceBudgets = (householdId: string | null, month?: string) => {
  const currentMonth = month || format(new Date(), "yyyy-MM");
  return useQuery({
    queryKey: ["finance-budgets", householdId, currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_budgets")
        .select("*")
        .eq("household_id", householdId!)
        .or(`month.eq.${currentMonth},is_recurring.eq.true`)
        .lte("month", currentMonth)
        .order("month", { ascending: false });
      if (error) throw error;
      const rows = (data || []) as FinanceBudget[];
      const currentYear = currentMonth.slice(0, 4);
      const exactByCat = new Map<string, FinanceBudget>();
      const recurringByCat = new Map<string, FinanceBudget>(); // most-recent wins (data is desc)
      const annualByCat = new Map<string, FinanceBudget>();
      for (const r of rows) {
        if (r.month === currentMonth && (r.budget_type ?? "monthly") === "monthly" && !r.is_recurring) {
          if (!exactByCat.has(r.category)) exactByCat.set(r.category, r);
        } else if (r.is_recurring && (r.budget_type ?? "monthly") === "monthly") {
          if (!recurringByCat.has(r.category)) recurringByCat.set(r.category, r);
        } else if (r.is_recurring && r.budget_type === "annual") {
          // Annual rows are anchored to <year>-01 and scoped to that calendar year only.
          if (r.month.slice(0, 4) === currentYear && !annualByCat.has(r.category)) {
            annualByCat.set(r.category, r);
          }
        } else if (r.month === currentMonth) {
          // Fallback: any row matching the exact month (e.g. legacy without flags).
          if (!exactByCat.has(r.category)) exactByCat.set(r.category, r);
        }
      }
      const resolved: FinanceBudget[] = [];
      const allCats = new Set<string>([
        ...exactByCat.keys(),
        ...recurringByCat.keys(),
        ...annualByCat.keys(),
      ]);
      for (const cat of allCats) {
        const exact = exactByCat.get(cat);
        if (exact) {
          resolved.push({ ...exact, _source: "exact" });
          continue;
        }
        const annual = annualByCat.get(cat);
        if (annual) {
          resolved.push({
            ...annual,
            month: currentMonth,
            _source: "annual",
            _originalId: annual.id,
            _originalMonth: annual.month,
          });
          continue;
        }
        const rec = recurringByCat.get(cat);
        if (rec) {
          resolved.push({
            ...rec,
            month: currentMonth,
            _source: "recurring",
            _originalId: rec.id,
            _originalMonth: rec.month,
          });
        }
      }
      resolved.sort((a, b) => a.category.localeCompare(b.category));
      return resolved;
    },
    enabled: !!householdId,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
    placeholderData: keepPreviousData,
  });
};

export const useUpsertBudget = (householdId: string | null) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      month: string;
      category: string;
      planned_amount: number;
      is_recurring?: boolean;
      budget_type?: "monthly" | "annual";
      annual_amount?: number | null;
    }) => {
      const { data: row, error } = await supabase.from("finance_budgets").upsert(
        {
          household_id: householdId!,
          created_by: user!.id,
          month: data.month,
          category: data.category,
          planned_amount: data.planned_amount,
          is_recurring: data.is_recurring ?? false,
          budget_type: data.budget_type ?? "monthly",
          annual_amount: data.annual_amount ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "household_id,month,category" }
      ).select().single();
      if (error) throw error;
      return row as FinanceBudget;
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["finance-budgets", householdId] });
      const optimistic: FinanceBudget = {
        id: `optimistic-${Date.now()}`,
        household_id: householdId!,
        month: data.month,
        category: data.category,
        planned_amount: data.planned_amount,
        is_recurring: data.is_recurring ?? false,
        budget_type: data.budget_type ?? "monthly",
        annual_amount: data.annual_amount ?? null,
        created_by: user?.id || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const snapshots: Array<[readonly unknown[], unknown]> = [];
      queryClient
        .getQueriesData<FinanceBudget[]>({ queryKey: ["finance-budgets", householdId] })
        .forEach(([key, prev]) => {
          snapshots.push([key, prev]);
          if (Array.isArray(prev)) {
            const idx = prev.findIndex((b) => b.category === data.category && b.month === data.month);
            const next = idx >= 0
              ? prev.map((b, i) => (i === idx ? { ...b, planned_amount: data.planned_amount } : b))
              : [optimistic, ...prev];
            queryClient.setQueryData(key, next);
          }
        });
      toast.success("Budget saved");
      return { snapshots, optimisticId: optimistic.id };
    },
    onError: (e: Error, _vars, ctx) => {
      ctx?.snapshots?.forEach(([key, prev]) => queryClient.setQueryData(key, prev));
      toast.error(e.message);
    },
    onSuccess: (row, _vars, ctx) => {
      if (!row) return;
      queryClient
        .getQueriesData<FinanceBudget[]>({ queryKey: ["finance-budgets", householdId] })
        .forEach(([key, list]) => {
          if (!Array.isArray(list)) return;
          queryClient.setQueryData(
            key,
            list.map((b) => (b.id === ctx?.optimisticId || (b.category === row.category && b.month === row.month) ? row : b))
          );
        });
      queryClient.invalidateQueries({ queryKey: ["finance-budgets", householdId] });
      queryClient.invalidateQueries({ queryKey: ["finance-annual-budget", householdId] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-budgets", householdId] });
      queryClient.invalidateQueries({ queryKey: ["finance-annual-budget", householdId] });
    },
  });
};

/**
 * Update an existing recurring/annual budget row by id (e.g. "this and all
 * future months"). For annual rows, pass `annual_amount` and the monthly
 * `planned_amount` will be re-derived by the caller.
 */
export const useUpdateBudgetById = (householdId: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: string;
      planned_amount: number;
      annual_amount?: number | null;
    }) => {
      const patch: Record<string, unknown> = {
        planned_amount: data.planned_amount,
        updated_at: new Date().toISOString(),
      };
      if (data.annual_amount !== undefined) patch.annual_amount = data.annual_amount;
      const { data: row, error } = await supabase
        .from("finance_budgets")
        .update(patch)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw error;
      return row as FinanceBudget;
    },
    onSuccess: () => {
      toast.success("Budget updated");
      queryClient.invalidateQueries({ queryKey: ["finance-budgets", householdId] });
      queryClient.invalidateQueries({ queryKey: ["finance-annual-budget", householdId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

/**
 * Delete a budget row by id. For recurring/annual rows, this removes the
 * anchor — the resolver will stop projecting it into future months.
 */
export const useDeleteBudgetById = (householdId: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("finance_budgets")
        .delete()
        .eq("id", id)
        .eq("household_id", householdId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Budget deleted");
      queryClient.invalidateQueries({ queryKey: ["finance-budgets", householdId] });
      queryClient.invalidateQueries({ queryKey: ["finance-annual-budget", householdId] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete budget"),
  });
};

/**
 * Clones the most recent prior month's budgets into `month` if `month` has
 * no rows yet. Returns { cloned: number, sourceMonth: string | null }.
 */
export const useCarryForwardBudgets = (householdId: string | null) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (month: string) => {
      if (!householdId) return { cloned: 0, sourceMonth: null as string | null, insertedIds: [] as string[] };
      // Skip if already populated.
      const { data: existing, error: existingErr } = await supabase
        .from("finance_budgets")
        .select("id")
        .eq("household_id", householdId)
        .eq("month", month)
        .limit(1);
      if (existingErr) throw existingErr;
      if (existing && existing.length > 0) return { cloned: 0, sourceMonth: null, insertedIds: [] };

      // Find recurring/annual budgets that already cover categories for `month` —
      // these don't need physical clones, the resolver handles them.
      const { data: recurringRows, error: recErr } = await supabase
        .from("finance_budgets")
        .select("category,month,budget_type")
        .eq("household_id", householdId)
        .eq("is_recurring", true)
        .lte("month", month);
      if (recErr) throw recErr;
      const yearOfMonth = month.slice(0, 4);
      const coveredByRecurring = new Set<string>();
      (recurringRows || []).forEach((r: any) => {
        if (r.budget_type === "annual") {
          if (String(r.month).slice(0, 4) === yearOfMonth) coveredByRecurring.add(r.category);
        } else {
          coveredByRecurring.add(r.category);
        }
      });

      // Find the most recent prior month with NON-recurring budgets to clone.
      const { data: prior, error: priorErr } = await supabase
        .from("finance_budgets")
        .select("month")
        .eq("household_id", householdId)
        .lt("month", month)
        .eq("is_recurring", false)
        .order("month", { ascending: false })
        .limit(1);
      if (priorErr) throw priorErr;
      const sourceMonth = prior?.[0]?.month as string | undefined;
      if (!sourceMonth) return { cloned: 0, sourceMonth: null, insertedIds: [] };

      const { data: rows, error: rowsErr } = await supabase
        .from("finance_budgets")
        .select("category,planned_amount,is_recurring")
        .eq("household_id", householdId)
        .eq("month", sourceMonth);
      if (rowsErr) throw rowsErr;
      if (!rows || rows.length === 0) return { cloned: 0, sourceMonth, insertedIds: [] };

      const payload = rows
        .filter((r: any) => !r.is_recurring && !coveredByRecurring.has(r.category))
        .map((r) => ({
          household_id: householdId,
          created_by: user!.id,
          month,
          category: r.category,
          planned_amount: r.planned_amount,
        }));
      if (payload.length === 0) return { cloned: 0, sourceMonth, insertedIds: [] };

      const { data: inserted, error: insErr } = await supabase
        .from("finance_budgets")
        .upsert(payload, { onConflict: "household_id,month,category", ignoreDuplicates: true })
        .select("id");
      if (insErr) throw insErr;
      return {
        cloned: inserted?.length || 0,
        sourceMonth,
        insertedIds: (inserted || []).map((r) => r.id as string),
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-budgets", householdId] });
    },
  });
};

export const useFinanceAnnualBudget = (householdId: string | null, year: number) => {
  return useQuery({
    queryKey: ["finance-annual-budget", householdId, year],
    enabled: !!householdId,
    staleTime: 60_000,
    queryFn: async (): Promise<AnnualBudgetData> => {
      const yStart = `${year}-01`;
      const yEnd = `${year}-12`;
      const dateStart = `${year}-01-01`;
      const dateEnd = `${year + 1}-01-01`;

      const [budgetsRes, txnsRes] = await Promise.all([
        supabase
          .from("finance_budgets")
          .select("month,category,planned_amount,is_recurring,budget_type,annual_amount")
          .eq("household_id", householdId!)
          .or(
            `and(month.gte.${yStart},month.lte.${yEnd}),is_recurring.eq.true`,
          )
          .lte("month", yEnd),
        supabase
          .from("finance_transactions")
          .select("transaction_date,category,amount,type")
          .eq("household_id", householdId!)
          .eq("type", "expense")
          .gte("transaction_date", dateStart)
          .lt("transaction_date", dateEnd),
      ]);
      if (budgetsRes.error) throw budgetsRes.error;
      if (txnsRes.error) throw txnsRes.error;

      const byCat = new Map<string, AnnualBudgetRow>();
      const ensure = (cat: string): AnnualBudgetRow => {
        let r = byCat.get(cat);
        if (!r) {
          r = {
            category: cat,
            monthlyPlanned: Array(12).fill(0),
            monthlyActual: Array(12).fill(0),
            annualPlanned: 0,
            annualActual: 0,
          };
          byCat.set(cat, r);
        }
        return r;
      };

      const allBudgets = (budgetsRes.data || []) as Array<any>;
      // Resolve a planned amount for each (category, month-of-year) using the
      // same precedence as useFinanceBudgets: exact > annual > most-recent recurring.
      // Build per-month resolution per category.
      const cats = new Set<string>(allBudgets.map((b) => b.category));
      // Pre-sort recurring monthly rows desc by month for "most-recent prior" lookup.
      const recurringMonthly = allBudgets
        .filter((b) => b.is_recurring && (b.budget_type ?? "monthly") === "monthly")
        .sort((a, b) => String(b.month).localeCompare(String(a.month)));
      const annualRows = allBudgets.filter(
        (b) => b.is_recurring && b.budget_type === "annual" && String(b.month).slice(0, 4) === String(year),
      );
      const exactRows = allBudgets.filter(
        (b) => !b.is_recurring && String(b.month).slice(0, 4) === String(year),
      );

      for (const cat of cats) {
        const row = ensure(cat);
        const annual = annualRows.find((b) => b.category === cat);
        if (annual) row.isAnnual = true;
        const exactsByMonthIdx = new Map<number, number>(); // 0..11 -> amount
        exactRows
          .filter((b) => b.category === cat)
          .forEach((b) => {
            const mi = parseInt(String(b.month).slice(5, 7), 10) - 1;
            if (mi >= 0 && mi < 12) exactsByMonthIdx.set(mi, Number(b.planned_amount) || 0);
          });
        const catRecurring = recurringMonthly.filter((b) => b.category === cat);
        for (let i = 0; i < 12; i++) {
          if (exactsByMonthIdx.has(i)) {
            row.monthlyPlanned[i] = exactsByMonthIdx.get(i)!;
            continue;
          }
          if (annual) {
            row.monthlyPlanned[i] = Math.floor(Number(annual.annual_amount ?? annual.planned_amount * 12) / 12);
            continue;
          }
          // Most-recent recurring row whose anchor month is <= (year-monthIdx).
          const targetMonth = `${year}-${String(i + 1).padStart(2, "0")}`;
          const rec = catRecurring.find((b) => String(b.month) <= targetMonth);
          if (rec) row.monthlyPlanned[i] = Number(rec.planned_amount) || 0;
        }
        row.annualPlanned = row.monthlyPlanned.reduce((a, b) => a + b, 0);
      }

      (txnsRes.data || []).forEach((t: any) => {
        const m = parseInt(String(t.transaction_date).slice(5, 7), 10) - 1;
        if (m < 0 || m > 11) return;
        const row = ensure(t.category);
        row.monthlyActual[m] += Number(t.amount) || 0;
        row.annualActual += Number(t.amount) || 0;
      });

      const rows = Array.from(byCat.values()).sort(
        (a, b) => b.annualPlanned + b.annualActual - (a.annualPlanned + a.annualActual)
      );
      const monthlyPlanned = Array(12).fill(0);
      const monthlyActual = Array(12).fill(0);
      rows.forEach((r) => {
        for (let i = 0; i < 12; i++) {
          monthlyPlanned[i] += r.monthlyPlanned[i];
          monthlyActual[i] += r.monthlyActual[i];
        }
      });
      return {
        year,
        totalPlanned: monthlyPlanned.reduce((a, b) => a + b, 0),
        totalActual: monthlyActual.reduce((a, b) => a + b, 0),
        monthlyPlanned,
        monthlyActual,
        rows,
        annualCategoryKeys: Array.from(new Set(annualRows.map((b) => b.category))),
      };
    },
  });
};