
# Minimalistic Design + Edge Function Error Fixes

## Three Areas of Work

### 1. Fix Edge Function Errors (Calendar + Meal Plan Generation)

**Root Cause Found:** The `supabase/config.toml` file only contains `project_id` and has NO `verify_jwt = false` settings for any edge function. With Lovable Cloud's ES256 token signing, the default `verify_jwt = true` causes JWT verification failures, resulting in "edge server error" responses.

**Fix:** Add `verify_jwt = false` to `supabase/config.toml` for all edge functions that need it. The functions already handle authentication manually in their code (via `supabase.auth.getUser(token)`), so this is safe.

**File: `supabase/config.toml`**

Add verify_jwt = false entries for all edge functions:
- google-calendar-auth
- fetch-calendar-events
- generate-meal-suggestions
- regenerate-meals
- ai-chat
- ai-pantry-import
- create-household
- dev-reset-account
- dev-seed-test-user
- extract-calendar-tasks
- generate-daily-plan
- generate-shopping-list
- parse-task-input
- send-access-decision
- send-access-request-confirmation
- send-daily-plan-whatsapp
- send-habit-reminders
- send-household-invitation
- send-invitation-response
- send-join-request-notification
- send-meal-plan-summary
- send-pantry-alerts
- send-task-notification
- send-task-reminders
- send-verification-email
- send-weekly-digest
- verify-email-token
- whatsapp-notify
- whatsapp-send-otp
- whatsapp-verify-otp

---

### 2. Minimalistic Design Theme

Apply a clean, minimal aesthetic across the dashboard and global UI components by reducing visual noise, tightening spacing, and simplifying decorative elements.

**File: `src/pages/Index.tsx`**
- Reduce main padding: `py-4 sm:py-6` to `py-3 sm:py-4`
- Reduce welcome section margin: `mb-4 sm:mb-6` to `mb-3`
- Reduce grid gap: `gap-3 sm:gap-4` to `gap-2.5 sm:gap-3`
- Simplify onboarding card: reduce margin from `mb-6` to `mb-4`, simplify gradient

**File: `src/components/ui/card.tsx`**
- Simplify Card: reduce from `rounded-xl border border-border/50 bg-card shadow-xs hover:shadow-sm` to `rounded-lg border border-border/40 bg-card shadow-none hover:shadow-xs`
- Tighten CardHeader padding: `p-4 sm:p-5` to `p-3 sm:p-4`
- Tighten CardContent padding: `px-4 pb-4 sm:px-5 sm:pb-5` to `px-3 pb-3 sm:px-4 sm:pb-4`
- Reduce CardTitle size: `text-lg sm:text-xl` to `text-base sm:text-lg`
- Tighten CardFooter similarly

**File: `src/components/dashboard/DashboardTaskWidget.tsx`**
- Reduce task item spacing: `space-y-2` to `space-y-1.5`

**File: `src/components/dashboard/DashboardMealWidget.tsx`**
- Reduce meal group spacing: `space-y-2` to `space-y-1.5`

**File: `src/components/dashboard/DashboardGroceryWidget.tsx`**
- Reduce stat box padding: `p-1.5` to `p-1`

**File: `src/components/dashboard/DashboardCalendarWidget.tsx`**
- No changes needed (already compact)

---

### 3. Summary of All Files to Modify

| File | Change Type |
|------|-------------|
| `supabase/config.toml` | Add verify_jwt = false for all edge functions |
| `src/components/ui/card.tsx` | Reduce padding, borders, shadows globally |
| `src/pages/Index.tsx` | Tighten dashboard spacing |
| `src/components/dashboard/DashboardTaskWidget.tsx` | Reduce item spacing |
| `src/components/dashboard/DashboardMealWidget.tsx` | Reduce item spacing |
| `src/components/dashboard/DashboardGroceryWidget.tsx` | Reduce stat padding |

---

### Expected Outcomes

1. **Calendar errors fixed**: Google Calendar connection and event fetching will work because JWT verification is handled in code rather than at the gateway level
2. **Meal plan generation fixed**: The generate-meal-suggestions and regenerate-meals functions will no longer return edge server errors
3. **Cleaner UI**: Reduced padding, lighter shadows, and tighter spacing create a minimalistic feel with ~25% less vertical whitespace
