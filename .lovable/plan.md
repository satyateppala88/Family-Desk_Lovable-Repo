
# Comprehensive Pre-Launch Audit and Fix Plan

## Executive Summary

This plan addresses multiple critical issues identified during the pre-launch audit:

| Issue | Priority | Status |
|-------|----------|--------|
| Wrong domain in edge functions (homemate vs familydesk) | Critical | Needs Fix |
| CORS blocking production requests | Critical | Needs Fix |
| Meals nav not visible | Medium | Investigate |
| UI Theme options | Low | Options Provided |
| Google Calendar not working | Critical | CORS related |
| Scalability assessment | Informational | Reviewed |

---

## Issue 1: Wrong Production Domain (CRITICAL)

**Root Cause:** All edge functions reference the old domain `homemate.lovable.app` instead of `familydesk.lovable.app`. This causes:
- CORS failures for edge function calls from production
- Incorrect URLs in emails
- OAuth callbacks failing

**Affected Files (13 files, 80+ references):**

1. `supabase/functions/_shared/cors.ts` (line 6)
2. `supabase/functions/_shared/email-templates.ts` (lines 6, 117)
3. `supabase/functions/send-access-decision/index.ts` (line 98)
4. `supabase/functions/send-meal-plan-summary/index.ts` (line 94)
5. `supabase/functions/send-weekly-digest/index.ts` (line 120)
6. `supabase/functions/send-habit-reminders/index.ts` (lines 154, 170)
7. `supabase/functions/send-task-notification/index.ts` (line 97)
8. `supabase/functions/send-task-reminders/index.ts` (line 115)
9. `supabase/functions/send-daily-plan-whatsapp/index.ts` (line 124)
10. `supabase/functions/send-pantry-alerts/index.ts` (lines 90, 147)
11. `supabase/functions/verify-email-token/index.ts` (line 99)
12. `supabase/functions/send-join-request-notification/index.ts` (line 90)
13. `supabase/functions/send-household-invitation/index.ts` (line 91)

**Solution:**
Replace all instances of `homemate.lovable.app` with `familydesk.lovable.app` across all edge functions.

---

## Issue 2: CORS Configuration Fix

**File:** `supabase/functions/_shared/cors.ts`

**Current (broken):**
```typescript
const ALLOWED_ORIGINS = [
  "https://homemate.lovable.app",  // Wrong!
  // ...
];
```

**Fixed:**
```typescript
const ALLOWED_ORIGINS = [
  "https://familydesk.lovable.app",  // Correct
  "https://id-preview--3862c136-3a8c-457d-b6f8-bd3654b2fade.lovable.app",
  "https://lovable.app",
  "https://lovable.dev",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
];
```

---

## Issue 3: Google Calendar Not Working

**Root Cause:** Same as Issue 1 - CORS is blocking requests from `familydesk.lovable.app` because only `homemate.lovable.app` is in the allowed origins list.

**Additionally:** The dynamic CORS check allows any `*.lovable.app` domain, BUT the default fallback uses the wrong origin when none matches explicitly.

---

## Issue 4: "Meals" Nav Item Not Visible

**Investigation Results:**
- The `MobileNav.tsx` component filters nav items based on `household_enabled_products`
- Database shows all households have "meals" enabled
- The issue is likely the mobile viewport showing only 5-6 items max

**Analysis of MobileNav:**
```typescript
const allNavItems = [
  { path: "/dashboard", icon: Home, label: "Home", product: null },           // Always visible
  { path: "/tasks", icon: CheckSquare, label: "Tasks", product: "tasks" },    // If enabled
  { path: "/habits", icon: Leaf, label: "Habits", product: "habits" },        // If enabled
  { path: "/meals", icon: UtensilsCrossed, label: "Meals", product: "meals" }, // If enabled
  { path: "/grocery", icon: ShoppingCart, label: "Grocery", product: "grocery" },
  { path: "/calendar", icon: Calendar, label: "Calendar", product: "calendar" },
];
```

With all products enabled (6 items), the nav might be truncated on smaller screens. Looking at your screenshot, I can see only 5 items visible (Home, Tasks, Habits, [cut off], Calendar).

**Solution Options:**
1. Add horizontal scroll to mobile nav for overflow
2. Collapse less-used items into a "More" menu
3. Reduce icon/label size for mobile

---

## Issue 5: UI Theme Options

The current theme system is defined in `src/index.css` and `tailwind.config.ts`. Here are the available options:

### Current Theme Structure

**Color System (CSS Variables):**
- Primary: Green tones (`--primary: 161 93% 30%`)
- Accent: Soft teal (`--accent: 166 76% 96%`)
- Background: Light gray (`--background: 0 0% 96%`)
- Dark mode: Fully supported

**Theme Customization Options:**

1. **Color Palette Changes:** Modify CSS variables in `src/index.css`
2. **Dark/Light Mode:** Already implemented via `next-themes`
3. **Font Changes:** Configured in `tailwind.config.ts` (currently Work Sans, Lora, Inconsolata)
4. **Spacing/Radius:** Adjustable via `--radius` and `--spacing` variables

**To implement new themes:**
- Create theme variants in `src/index.css`
- Add theme switcher component
- Store preference in user profile or localStorage

---

## Issue 6: Scalability Assessment

**Current Architecture:**

| Component | Scalability Notes |
|-----------|-------------------|
| Frontend | Vite + React - stateless, CDN-friendly |
| Backend (Supabase) | Managed PostgreSQL with connection pooling |
| Edge Functions | Serverless, auto-scaling |
| AI (Lovable Gateway) | Rate-limited but scalable |

**Potential Bottlenecks:**

1. **Database Queries:** Some hooks fetch all records without pagination
2. **RLS Policies:** Complex policies may slow under heavy load
3. **Edge Function Cold Starts:** First request may be slow
4. **API Rate Limits:** AI gateway has rate limits (429 errors handled)

**Recommendations for High Traffic:**

1. Add pagination to list queries (recipes, tasks, habits)
2. Implement caching for household preferences
3. Consider connection pooling configuration
4. Add retry logic for edge function timeouts

---

## Implementation Plan

### Phase 1: Critical Fixes (Domain & CORS)

Update all 13 files with correct domain:

**File 1: `supabase/functions/_shared/cors.ts`**
- Line 6: `homemate.lovable.app` -> `familydesk.lovable.app`

**File 2: `supabase/functions/_shared/email-templates.ts`**
- Line 6: Update LOGO_URL
- Line 117: Update footer link

**Files 3-13:** Update hardcoded URLs in each edge function

### Phase 2: Mobile Nav Enhancement

Add overflow handling or "More" menu for 6+ nav items.

### Phase 3: Theme Options (Optional)

If desired, implement theme selector with preset options.

---

## Testing Checklist (Post-Implementation)

### Authentication Flow
- [ ] Request access form works
- [ ] Admin receives notification
- [ ] Approval email is sent with correct URL
- [ ] Signup works with approved email
- [ ] Verification email is sent
- [ ] Verification link works
- [ ] Welcome email is sent
- [ ] Redirect to household setup works

### Household & Onboarding
- [ ] Household creation succeeds
- [ ] Product selection saves correctly
- [ ] All products appear in nav after enabling
- [ ] Onboarding preferences save
- [ ] Redirect to dashboard works

### Meal Planning
- [ ] Generate Full Week button works
- [ ] Generate Rest of Week button works
- [ ] Recipes are saved to database
- [ ] Meal plan displays in calendar view
- [ ] Regenerate single meal works
- [ ] Mark as cooked works
- [ ] Download meal plan works

### Google Calendar
- [ ] Connect Calendar button works
- [ ] OAuth redirect goes to Google
- [ ] Authorization completes
- [ ] Callback saves tokens
- [ ] Events display in calendar view
- [ ] Toggle visibility works
- [ ] Disconnect works

### Other Features
- [ ] Tasks CRUD operations
- [ ] Habits tracking and streaks
- [ ] Grocery/Pantry management
- [ ] AI chat functionality
- [ ] Email notifications (all types)

---

## Technical Summary

**Root Cause of Production Errors:**
The error "Failed to send a request to the Edge Function" is caused by CORS blocking. The production domain `familydesk.lovable.app` is not in the allowed origins list, so the browser rejects preflight requests.

**Fix Priority:**
1. Update CORS allowlist (immediate fix)
2. Update all hardcoded URLs (complete fix)
3. Deploy all edge functions
4. Test complete user journey

**Estimated Implementation Time:** 30-45 minutes
