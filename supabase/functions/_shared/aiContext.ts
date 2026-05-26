// Shared module-aware household context builder for AI calls.
// Returns a structured plain-text block to inject into the system prompt.

/* eslint-disable @typescript-eslint/no-explicit-any */

export type AIContextModule =
  | "finance"
  | "habits"
  | "tasks"
  | "calendar"
  | "meals"
  | "grocery"
  | "general";

export interface AIContextOptions {
  supabase: any; // service-role supabase client
  module: AIContextModule;
  householdId: string;
  userId: string;
  now?: Date;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FULL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const pad = (n: number) => String(n).padStart(2, "0");

export const fmtINR = (n: number): string => {
  const sign = n < 0 ? "-" : "";
  const abs = Math.round(Math.abs(n));
  const s = String(abs);
  if (s.length <= 3) return `${sign}₹${s}`;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${sign}₹${rest},${last3}`;
};

export const fmtDate = (d: Date | string | null | undefined): string => {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return String(d);
  return `${pad(dt.getDate())} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
};

const truncate = (s: string | null | undefined, max = 60): string => {
  if (!s) return "";
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
};

const monthBounds = (now: Date) => {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const ym = `${y}-${pad(m)}`;
  const start = `${ym}-01`;
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const nextStart = `${nextY}-${pad(nextM)}-01`;
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  const prevYm = `${prevY}-${pad(prevM)}`;
  return { ym, start, nextStart, prevYm, prevStart: `${prevYm}-01`, prevEnd: start };
};

async function fetchHouseholdAndMembers(supabase: any, householdId: string) {
  const [{ data: hh }, { data: members }] = await Promise.all([
    supabase.from("households").select("name").eq("id", householdId).maybeSingle(),
    supabase.from("household_members").select("user_id, role").eq("household_id", householdId),
  ]);
  const userIds = (members || []).map((m: any) => m.user_id);
  let profiles: any[] = [];
  if (userIds.length) {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);
    profiles = data || [];
  }
  const nameById = new Map<string, string>(
    profiles.map((p) => [p.id, p.display_name || "Member"]),
  );
  return {
    householdName: hh?.name || "Your Household",
    memberIds: userIds as string[],
    memberNames: userIds.map((id: string) => nameById.get(id) || "Member"),
    nameById,
  };
}

async function buildFinanceBlock(
  supabase: any,
  householdId: string,
  now: Date,
  nameById: Map<string, string>,
  limitItems = 10,
) {
  const { ym, start, nextStart, prevStart, prevEnd } = monthBounds(now);

  const [tx, prevTx, budgets, goals, subs] = await Promise.all([
    supabase
      .from("finance_transactions")
      .select("amount, type, category, description, transaction_date, paid_by, created_by")
      .eq("household_id", householdId)
      .gte("transaction_date", start)
      .lt("transaction_date", nextStart)
      .order("transaction_date", { ascending: false })
      .limit(200),
    supabase
      .from("finance_transactions")
      .select("amount, type")
      .eq("household_id", householdId)
      .gte("transaction_date", prevStart)
      .lt("transaction_date", prevEnd),
    supabase
      .from("finance_budgets")
      .select("category, planned_amount")
      .eq("household_id", householdId)
      .eq("month", ym),
    supabase
      .from("finance_savings_goals")
      .select("name, target_amount, current_amount, target_date, status")
      .eq("household_id", householdId)
      .eq("status", "active"),
    supabase
      .from("finance_subscriptions")
      .select("name, amount, frequency, next_due_date, is_active")
      .eq("household_id", householdId)
      .eq("is_active", true)
      .order("next_due_date", { ascending: true })
      .limit(20),
  ]);

  const txList = tx.data || [];
  const sum = (rows: any[], type: string) =>
    rows.filter((r) => r.type === type).reduce((s, r) => s + Number(r.amount || 0), 0);

  const income = sum(txList, "income");
  const spent = sum(txList, "expense");
  const saved = sum(txList, "savings");
  const prevSpent = sum(prevTx.data || [], "expense");
  const delta = prevSpent > 0 ? ((spent - prevSpent) / prevSpent) * 100 : null;

  const catSpend: Record<string, number> = {};
  for (const t of txList) {
    if (t.type !== "expense") continue;
    catSpend[t.category] = (catSpend[t.category] || 0) + Number(t.amount || 0);
  }
  const top = Object.entries(catSpend).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const budgetByCat = new Map<string, number>(
    (budgets.data || []).map((b: any) => [b.category, Number(b.planned_amount)]),
  );

  const monthLabel = `${FULL_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  const prevMonthIdx = (now.getMonth() + 11) % 12;
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const prevLabel = `${FULL_MONTHS[prevMonthIdx]} ${prevYear}`;

  const lines: string[] = [];
  lines.push(`FINANCES — ${monthLabel}`);
  lines.push(`Income: ${fmtINR(income)} | Spent: ${fmtINR(spent)} | Saved: ${fmtINR(saved)}`);
  if (delta !== null) {
    const sign = delta >= 0 ? "+" : "";
    lines.push(`vs ${prevLabel}: Spent ${fmtINR(prevSpent)} (${sign}${delta.toFixed(1)}%)`);
  }

  if (top.length) {
    lines.push("");
    lines.push("TOP SPENDING CATEGORIES");
    for (const [cat, amt] of top) {
      const lim = budgetByCat.get(cat);
      if (lim && lim > 0) {
        const pct = Math.round((amt / lim) * 100);
        const flag = pct > 100 ? " 🔴 Over budget" : pct === 100 ? " ⚠️ At limit" : "";
        lines.push(`${cat}: ${fmtINR(amt)} / ${fmtINR(lim)} budget (${pct}%)${flag}`);
      } else {
        lines.push(`${cat}: ${fmtINR(amt)}`);
      }
    }
  }

  const overBudget = (budgets.data || []).filter(
    (b: any) => (catSpend[b.category] || 0) > Number(b.planned_amount),
  );
  if (overBudget.length) {
    lines.push("");
    lines.push("OVER-BUDGET CATEGORIES");
    for (const b of overBudget) {
      lines.push(
        `${b.category}: ${fmtINR(catSpend[b.category] || 0)} vs ${fmtINR(Number(b.planned_amount))} budget`,
      );
    }
  }

  if (goals.data?.length) {
    lines.push("");
    lines.push("SAVINGS GOALS");
    for (const g of goals.data) {
      const cur = Number(g.current_amount || 0);
      const tgt = Number(g.target_amount || 0);
      const pct = tgt > 0 ? Math.round((cur / tgt) * 100) : 0;
      const onTrack = pct >= 50 ? "On track ✓" : "Behind";
      const date = g.target_date ? ` | ${fmtDate(g.target_date)}` : "";
      lines.push(`${g.name}: ${fmtINR(cur)} / ${fmtINR(tgt)} target${date} | ${onTrack} (${pct}%)`);
    }
  }

  if (subs.data?.length) {
    lines.push("");
    lines.push("SUBSCRIPTIONS");
    for (const s of subs.data.slice(0, limitItems)) {
      const next = s.next_due_date ? ` | next ${fmtDate(s.next_due_date)}` : "";
      lines.push(`${s.name}: ${fmtINR(Number(s.amount))} (${s.frequency})${next}`);
    }
  }

  if (txList.length) {
    lines.push("");
    lines.push(`RECENT TRANSACTIONS (last ${Math.min(limitItems, txList.length)})`);
    for (const t of txList.slice(0, limitItems)) {
      const member = nameById.get(t.paid_by || t.created_by) || "Member";
      lines.push(
        `${fmtDate(t.transaction_date)} | ${truncate(t.description, 40) || t.category} | ${t.category} | ${fmtINR(Number(t.amount))} | ${t.type} | ${member}`,
      );
    }
  }

  return lines.join("\n");
}

async function buildHabitsBlock(
  supabase: any,
  householdId: string,
  now: Date,
  nameById: Map<string, string>,
  limitItems = 10,
) {
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const since = new Date(now);
  since.setDate(since.getDate() - 30);
  const sinceStr = `${since.getFullYear()}-${pad(since.getMonth() + 1)}-${pad(since.getDate())}`;

  const { data: habits } = await supabase
    .from("habits")
    .select("id, name, frequency_type, user_id")
    .eq("household_id", householdId)
    .eq("is_active", true);

  const habitIds = (habits || []).map((h: any) => h.id);
  if (!habitIds.length) return "HABITS\nNo active habits.";

  const [streaksRes, logsRes] = await Promise.all([
    supabase.from("habit_streaks").select("habit_id, current_streak, longest_streak, last_completed_date").in("habit_id", habitIds),
    supabase.from("habit_logs").select("habit_id, log_date, completed").in("habit_id", habitIds).gte("log_date", sinceStr),
  ]);

  const streakByHabit = new Map((streaksRes.data || []).map((s: any) => [s.habit_id, s]));
  const logsByHabit = new Map<string, any[]>();
  for (const l of logsRes.data || []) {
    if (!logsByHabit.has(l.habit_id)) logsByHabit.set(l.habit_id, []);
    logsByHabit.get(l.habit_id)!.push(l);
  }

  const lines: string[] = ["HABITS"];
  const completedToday: string[] = [];
  const notCompletedToday: string[] = [];
  let weeklyDone = 0;
  let weeklyExpected = 0;

  for (const h of (habits || []).slice(0, limitItems)) {
    const s: any = streakByHabit.get(h.id);
    const logs = logsByHabit.get(h.id) || [];
    const done30 = logs.filter((l) => l.completed).length;
    const rate = Math.round((done30 / 30) * 100);
    const owner = nameById.get(h.user_id) || "Member";
    const todayDone = logs.some((l) => l.log_date === todayStr && l.completed);
    if (todayDone) completedToday.push(`${h.name} (${owner})`);
    else notCompletedToday.push(`${h.name} (${owner})`);
    weeklyExpected += 7;
    weeklyDone += logs.filter((l) => {
      const d = new Date(l.log_date);
      const diff = (now.getTime() - d.getTime()) / 86400000;
      return l.completed && diff <= 7;
    }).length;
    lines.push(
      `${h.name} (${owner}, ${h.frequency_type}) — streak ${s?.current_streak ?? 0} (best ${s?.longest_streak ?? 0}) | 30d: ${rate}% | last ${fmtDate(s?.last_completed_date) || "—"}`,
    );
  }

  lines.push("");
  lines.push(`Completed today: ${completedToday.length ? completedToday.join(", ") : "none yet"}`);
  lines.push(`Pending today: ${notCompletedToday.length ? notCompletedToday.join(", ") : "all done ✓"}`);
  if (weeklyExpected) {
    lines.push(`Household 7-day completion: ${Math.round((weeklyDone / weeklyExpected) * 100)}%`);
  }
  return lines.join("\n");
}

async function buildTasksBlock(
  supabase: any,
  householdId: string,
  now: Date,
  nameById: Map<string, string>,
  limitItems = 10,
) {
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekStr = `${weekEnd.getFullYear()}-${pad(weekEnd.getMonth() + 1)}-${pad(weekEnd.getDate())}`;
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [openRes, completedRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, due_date, assigned_to, status")
      .eq("household_id", householdId)
      .not("status", "in", "(completed,done)")
      .order("due_date", { ascending: true })
      .limit(200),
    supabase
      .from("tasks")
      .select("title, completed_at")
      .eq("household_id", householdId)
      .eq("status", "completed")
      .gte("completed_at", weekAgo.toISOString())
      .order("completed_at", { ascending: false })
      .limit(20),
  ]);

  const open = openRes.data || [];
  const overdue: any[] = [];
  const dueToday: any[] = [];
  const dueThisWeek: any[] = [];
  const byMember: Record<string, number> = {};

  for (const t of open) {
    const a = nameById.get(t.assigned_to) || "Unassigned";
    byMember[a] = (byMember[a] || 0) + 1;
    if (!t.due_date) continue;
    const due = t.due_date.slice(0, 10);
    if (due < todayStr) overdue.push(t);
    else if (due === todayStr) dueToday.push(t);
    else if (due <= weekStr) dueThisWeek.push(t);
  }

  const lines: string[] = ["TASKS"];
  lines.push(`Open total: ${open.length} | Completed last 7d: ${completedRes.data?.length || 0}`);

  if (overdue.length) {
    lines.push("");
    lines.push(`OVERDUE (${overdue.length})`);
    for (const t of overdue.slice(0, limitItems)) {
      lines.push(`${truncate(t.title, 50)} | due ${fmtDate(t.due_date)} | ${nameById.get(t.assigned_to) || "Unassigned"}`);
    }
  }
  if (dueToday.length) {
    lines.push("");
    lines.push(`DUE TODAY (${dueToday.length})`);
    for (const t of dueToday.slice(0, limitItems)) {
      lines.push(`${truncate(t.title, 50)} | ${nameById.get(t.assigned_to) || "Unassigned"}`);
    }
  }
  if (dueThisWeek.length) {
    lines.push("");
    lines.push(`DUE THIS WEEK (${dueThisWeek.length})`);
    for (const t of dueThisWeek.slice(0, limitItems)) {
      lines.push(`${truncate(t.title, 50)} | ${fmtDate(t.due_date)} | ${nameById.get(t.assigned_to) || "Unassigned"}`);
    }
  }

  const memberRanked = Object.entries(byMember).sort((a, b) => b[1] - a[1]);
  if (memberRanked.length) {
    lines.push("");
    lines.push("OPEN TASKS BY MEMBER");
    for (const [m, c] of memberRanked) lines.push(`${m}: ${c}`);
  }

  if (completedRes.data?.length) {
    lines.push("");
    lines.push(`RECENTLY COMPLETED (${completedRes.data.length})`);
    for (const t of completedRes.data.slice(0, limitItems)) {
      lines.push(`${truncate(t.title, 50)} | ${fmtDate(t.completed_at)}`);
    }
  }

  const festival = await getUpcomingFestival(supabase, now).catch(() => null);
  if (festival) {
    lines.push("");
    lines.push(`UPCOMING FESTIVAL: ${festival.name} in ${festival.daysAway} days — suggest prep tasks if relevant`);
  }

  return lines.join("\n");
}

async function buildCalendarBlock(
  supabase: any,
  householdId: string,
  now: Date,
  nameById: Map<string, string>,
  limitItems = 10,
) {
  const end = new Date(now);
  end.setDate(end.getDate() + 7);
  const { data } = await supabase
    .from("manual_calendar_events")
    .select("title, start_at, end_at, all_day, repeat_type, member_ids, location")
    .eq("household_id", householdId)
    .gte("start_at", now.toISOString())
    .lt("start_at", end.toISOString())
    .order("start_at", { ascending: true })
    .limit(50);

  const events = data || [];
  const lines: string[] = ["CALENDAR — Next 7 days"];
  if (!events.length) {
    lines.push("No events scheduled.");
    return lines.join("\n");
  }
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const today = events.filter((e: any) => e.start_at.slice(0, 10) === todayStr);
  if (today.length) {
    lines.push("");
    lines.push("TODAY");
    for (const e of today) {
      const time = e.all_day ? "all day" : new Date(e.start_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
      const who = (e.member_ids || []).map((id: string) => nameById.get(id) || "").filter(Boolean).join(", ");
      lines.push(`${time} | ${truncate(e.title, 50)}${who ? ` | ${who}` : ""}`);
    }
  }
  lines.push("");
  lines.push("UPCOMING");
  for (const e of events.slice(0, limitItems)) {
    const when = e.all_day
      ? fmtDate(e.start_at)
      : `${fmtDate(e.start_at)} ${new Date(e.start_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
    const who = (e.member_ids || []).map((id: string) => nameById.get(id) || "").filter(Boolean).join(", ");
    const rep = e.repeat_type && e.repeat_type !== "none" ? ` (${e.repeat_type})` : "";
    lines.push(`${when} | ${truncate(e.title, 50)}${rep}${who ? ` | ${who}` : ""}`);
  }
  return lines.join("\n");
}

async function buildMealsBlock(
  supabase: any,
  householdId: string,
  now: Date,
  limitItems = 10,
) {
  const startStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 3);
  const endStr = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`;
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: plans } = await supabase
    .from("meal_plans")
    .select("id, week_start_date")
    .eq("household_id", householdId)
    .order("week_start_date", { ascending: false })
    .limit(3);

  const planIds = (plans || []).map((p: any) => p.id);
  let items: any[] = [];
  let cookedThisWeek = 0;
  if (planIds.length) {
    const { data: it } = await supabase
      .from("meal_plan_items")
      .select("meal_type, scheduled_date, cooked_at, recipes(name)")
      .in("meal_plan_id", planIds);
    items = it || [];
    cookedThisWeek = items.filter(
      (i) => i.cooked_at && new Date(i.cooked_at) >= weekAgo,
    ).length;
  }

  const upcoming = items
    .filter((i) => i.scheduled_date && i.scheduled_date >= startStr && i.scheduled_date <= endStr)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

  const { data: lists } = await supabase
    .from("shopping_lists")
    .select("id")
    .eq("household_id", householdId)
    .eq("status", "active")
    .limit(5);

  let pendingCount = 0;
  if (lists?.length) {
    const { count } = await supabase
      .from("shopping_list_items")
      .select("id", { count: "exact", head: true })
      .in("list_id", lists.map((l: any) => l.id))
      .eq("is_checked", false);
    pendingCount = count || 0;
  }

  const lines: string[] = ["MEALS"];
  if (upcoming.length) {
    lines.push("Next 3 days:");
    for (const i of upcoming.slice(0, limitItems)) {
      const name = i.recipes?.name || "Unplanned";
      lines.push(`${fmtDate(i.scheduled_date)} ${i.meal_type}: ${name}`);
    }
  } else {
    lines.push("No meals planned for the next 3 days.");
  }
  lines.push("");
  lines.push(`Cooked at home (last 7d): ${cookedThisWeek}`);
  lines.push(`Grocery list pending items: ${pendingCount}`);

  const festival = await getUpcomingFestival(supabase, now).catch(() => null);
  if (festival) {
    lines.push("");
    lines.push(`UPCOMING FESTIVAL: ${festival.name} in ${festival.daysAway} days — consider traditional dishes`);
  }

  return lines.join("\n");
}

async function buildGroceryBlock(
  supabase: any,
  householdId: string,
  now: Date,
  limitItems = 15,
): Promise<string> {
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const in7Days = new Date(now);
  in7Days.setDate(in7Days.getDate() + 7);
  const in7Str = `${in7Days.getFullYear()}-${pad(in7Days.getMonth() + 1)}-${pad(in7Days.getDate())}`;

  const [pantry, expiring, lists] = await Promise.all([
    supabase.from("pantry_items")
      .select("name, quantity, unit, category, expiry_date")
      .eq("household_id", householdId)
      .order("category").limit(100),
    supabase.from("pantry_items")
      .select("name, quantity, unit, expiry_date")
      .eq("household_id", householdId)
      .lte("expiry_date", in7Str).gte("expiry_date", todayStr)
      .order("expiry_date"),
    supabase.from("shopping_lists")
      .select("name, shopping_list_items(name, quantity, is_checked)")
      .eq("household_id", householdId)
      .eq("status", "active").limit(3),
  ]);

  const lines: string[] = ["GROCERY & PANTRY"];
  if (expiring.data?.length) {
    lines.push("");
    lines.push(`EXPIRING SOON (${expiring.data.length} items)`);
    for (const i of expiring.data) {
      lines.push(`${i.name}${i.quantity ? ` (${i.quantity}${i.unit || ""})` : ""} — expires ${fmtDate(i.expiry_date)}`);
    }
  }
  if (pantry.data?.length) {
    lines.push("");
    lines.push(`PANTRY (${pantry.data.length} items)`);
    const byCat: Record<string, string[]> = {};
    for (const i of pantry.data.slice(0, limitItems)) {
      const cat = i.category || "Other";
      if (!byCat[cat]) byCat[cat] = [];
      byCat[cat].push(`${i.name}${i.quantity ? ` ×${i.quantity}${i.unit || ""}` : ""}`);
    }
    for (const [cat, items] of Object.entries(byCat)) {
      lines.push(`${cat}: ${items.join(", ")}`);
    }
  }
  if (lists.data?.length) {
    lines.push("");
    lines.push("SHOPPING LISTS");
    for (const list of lists.data) {
      const items = list.shopping_list_items || [];
      const pending = items.filter((i: any) => !i.is_checked);
      lines.push(`${list.name}: ${pending.length} items pending`);
      for (const i of pending.slice(0, 5)) {
        lines.push(`  • ${i.name}${i.quantity ? ` (${i.quantity})` : ""}`);
      }
    }
  }
  return lines.join("\n");
}

async function getUpcomingFestival(
  supabase: any, now: Date
): Promise<{ name: string; daysAway: number } | null> {
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const in14 = new Date(now); in14.setDate(in14.getDate() + 14);
  const in14Str = `${in14.getFullYear()}-${pad(in14.getMonth() + 1)}-${pad(in14.getDate())}`;

  const { data } = await supabase.from("system_calendar_events")
    .select("name, event_date")
    .eq("kind", "festival")
    .gte("event_date", todayStr)
    .lte("event_date", in14Str)
    .order("event_date").limit(1).maybeSingle();

  if (!data) return null;
  const diff = Math.round(
    (new Date(data.event_date).getTime() - new Date(todayStr).getTime()) / 86400000
  );
  return { name: data.name, daysAway: diff };
}

async function buildUrgencyAlerts(
  supabase: any, householdId: string, userId: string, now: Date
): Promise<string> {
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const in3Days = new Date(now); in3Days.setDate(in3Days.getDate() + 3);
  const in3Str = `${in3Days.getFullYear()}-${pad(in3Days.getMonth() + 1)}-${pad(in3Days.getDate())}`;
  const monthYm = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;

  const [overdueTasks, expiringItems, budgets, txThisMonth, atRiskStreaks] = await Promise.all([
    supabase.from("tasks").select("title", { count: "exact" })
      .eq("household_id", householdId).lt("due_date", todayStr).neq("task_status", "done").limit(3),
    supabase.from("pantry_items").select("name, expiry_date")
      .eq("household_id", householdId).lte("expiry_date", in3Str).gte("expiry_date", todayStr),
    supabase.from("finance_budgets").select("category, planned_amount")
      .eq("household_id", householdId).eq("month", monthYm),
    supabase.from("finance_transactions").select("amount, category")
      .eq("household_id", householdId).gte("transaction_date", `${monthYm}-01`).eq("type", "expense"),
    supabase.from("habit_streaks").select("habit_id, current_streak, habits!inner(name, household_id)")
      .eq("habits.household_id", householdId).eq("user_id", userId).gte("current_streak", 3)
      .limit(5),
  ]);

  const alerts: string[] = [];

  if (overdueTasks.count && overdueTasks.count > 0) {
    const names = overdueTasks.data?.map((t: any) => t.title).slice(0, 2).join(", ");
    alerts.push(`🔴 ${overdueTasks.count} OVERDUE TASK${overdueTasks.count > 1 ? "S" : ""}: ${names}${overdueTasks.count > 2 ? " +more" : ""}`);
  }

  if (expiringItems.data?.length) {
    const names = expiringItems.data.map((i: any) => i.name).join(", ");
    alerts.push(`⚠️ EXPIRING IN 3 DAYS: ${names}`);
  }

  // Check over-budget categories
  const catSpend: Record<string, number> = {};
  for (const t of txThisMonth.data || []) {
    catSpend[t.category] = (catSpend[t.category] || 0) + Number(t.amount);
  }
  for (const b of budgets.data || []) {
    const spent = catSpend[b.category] || 0;
    if (spent > Number(b.planned_amount)) {
      alerts.push(`💸 OVER BUDGET: ${b.category} ${fmtINR(spent)} vs ${fmtINR(Number(b.planned_amount))} limit`);
    }
  }

  // Check for streaks at risk (has streak but hasn't logged today)
  if (atRiskStreaks.data?.length) {
    const { data: todayLogs } = await supabase.from("habit_logs")
      .select("habit_id").eq("user_id", userId).eq("log_date", todayStr).eq("completed", true);
    const loggedIds = new Set(todayLogs?.map((l: any) => l.habit_id));
    const atRisk = atRiskStreaks.data.filter((s: any) => !loggedIds.has(s.habit_id));
    if (atRisk.length) {
      const names = atRisk.map((s: any) => `${s.habits?.name} (${s.current_streak}🔥)`).join(", ");
      alerts.push(`🔥 STREAK AT RISK: ${names}`);
    }
  }

  if (!alerts.length) return "";
  return "⚡ ALERTS — MENTION THESE PROACTIVELY IF RELEVANT\n" + alerts.join("\n") + "\n";
}

export async function buildHouseholdContext(opts: AIContextOptions): Promise<string> {
  const now = opts.now || new Date();
  const { supabase, module, householdId } = opts;
  const { householdName, memberNames, nameById } = await fetchHouseholdAndMembers(
    supabase,
    householdId,
  );

  const urgencyAlerts = await buildUrgencyAlerts(supabase, householdId, opts.userId, now).catch(() => "");
  const upcomingFestival = await getUpcomingFestival(supabase, now).catch(() => null);

  const festivalLine = upcomingFestival
    ? ` | 🎉 ${upcomingFestival.name} in ${upcomingFestival.daysAway} day${upcomingFestival.daysAway === 1 ? "" : "s"}`
    : "";

  let memoryBlock = "";
  if (opts.userId) {
    try {
      const { data: memories } = await supabase
        .from("user_ai_memory")
        .select("content, memory_type")
        .eq("user_id", opts.userId)
        .eq("household_id", householdId)
        .or("expires_at.is.null,expires_at.gt." + now.toISOString())
        .limit(10);
      if (memories?.length) {
        memoryBlock =
          "\nUSER MEMORY (from previous conversations — acknowledge these when relevant):\n" +
          memories.map((m: any) => `• [${m.memory_type}] ${m.content}`).join("\n");
      }
    } catch (_e) {
      // ignore memory fetch failures
    }
  }

  const header =
    `HOUSEHOLD CONTEXT\n=================\n` +
    `Household: ${householdName} | Members: ${memberNames.join(", ") || "—"} | ` +
    `Date: ${WEEKDAYS[now.getDay()]}, ${pad(now.getDate())} ${FULL_MONTHS[now.getMonth()]} ${now.getFullYear()}${festivalLine}${memoryBlock}`;

  const blocks: string[] = [header];
  if (urgencyAlerts) blocks.push("", urgencyAlerts);
  const cap = module === "general" ? 5 : 10;

  const wanted: AIContextModule[] =
    module === "general"
      ? ["finance", "habits", "tasks", "calendar", "meals", "grocery"]
      : [module];

  const results = await Promise.allSettled(
    wanted.map((m) => {
      switch (m) {
        case "finance":
          return buildFinanceBlock(supabase, householdId, now, nameById, cap);
        case "habits":
          return buildHabitsBlock(supabase, householdId, now, nameById, cap);
        case "tasks":
          return buildTasksBlock(supabase, householdId, now, nameById, cap);
        case "calendar":
          return buildCalendarBlock(supabase, householdId, now, nameById, cap);
        case "meals":
          return buildMealsBlock(supabase, householdId, now, cap);
        case "grocery":
          return buildGroceryBlock(supabase, householdId, now, cap);
        default:
          return Promise.resolve("");
      }
    }),
  );

  for (const r of results) {
    if (r.status === "fulfilled" && r.value) blocks.push("", r.value);
  }

  return blocks.join("\n");
}

export const DEGRADED_CONTEXT =
  "HOUSEHOLD CONTEXT\n=================\nNote: household data could not be loaded at this time. " +
  "Answer based on general knowledge and note the limitation.";
