

# Redesign: Icon-based Homepage + Remove Bottom Nav

## Summary

Replace the current bottom navigation bar and dashboard summary widgets with a **module icon grid on the homepage**. Each enabled module appears as a tappable card/icon. Remove `MobileNav` from every page. Add a back-to-home mechanism in the header for inner pages.

## What Changes

### 1. Remove MobileNav globally
- Delete `src/components/layout/MobileNav.tsx`
- Remove all `<MobileNav />` imports and usages from ~27 page files (Index, Tasks, Meals, Grocery, Calendar, Habits, Finance, Settings, Taskmaster pages, etc.)
- Remove `pb-20` padding that was compensating for the fixed bottom bar

### 2. Redesign the Homepage (`Index.tsx`)
- Remove all `DashboardXxxWidget` components (TaskWidget, MealWidget, GroceryWidget, CalendarWidget, FinanceWidget)
- Replace with a **module icon grid** showing only the household's enabled products
- Each module tile: large icon + label, tappable, navigates to the module
- Grid layout: 3 columns on mobile, adapts on larger screens
- Module definitions (icon, label, path, color) reused from the existing `ProductSelectionStep` and `MobileNav` definitions
- Keep: Header, onboarding progress banner, pending invitation banner, household name

### 3. Add back/home navigation in Header
- On inner pages (not `/dashboard`), show a left-arrow (ChevronLeft or ArrowLeft) next to "FamilyDesk" that navigates to `/dashboard`
- On the homepage itself, no arrow shown

### 4. Clean up related code
- Can keep `useDashboardStats` hook (used elsewhere) but remove its import from Index
- Remove `DashboardXxxWidget` component files if no longer used elsewhere
- Remove the `Footer` from the homepage (cleaner look) — keep on legal/settings pages

## Files to Modify

| File | Action |
|------|--------|
| `src/components/layout/MobileNav.tsx` | **Delete** |
| `src/pages/Index.tsx` | Rewrite: module icon grid instead of widgets |
| `src/components/layout/Header.tsx` | Add back arrow on inner pages |
| ~25 other page files | Remove `<MobileNav />` import and usage |
| `src/components/dashboard/DashboardTaskWidget.tsx` | Delete (no longer used) |
| `src/components/dashboard/DashboardMealWidget.tsx` | Delete (no longer used) |
| `src/components/dashboard/DashboardGroceryWidget.tsx` | Delete (no longer used) |
| `src/components/dashboard/DashboardCalendarWidget.tsx` | Delete (no longer used) |
| `src/components/dashboard/DashboardFinanceWidget.tsx` | Delete (no longer used) |
| `src/components/dashboard/DashboardHabitWidget.tsx` | Delete (if exists, no longer used) |

## Homepage Module Grid Design

```text
┌─────────────────────────────────┐
│  FamilyDesk            [Avatar] │  ← Header
├─────────────────────────────────┤
│  [Onboarding banner if needed]  │
│                                 │
│  Household Name                 │
│                                 │
│  ┌─────┐  ┌─────┐  ┌─────┐    │
│  │ ✓   │  │ 🍽  │  │ 🛒  │    │
│  │Tasks│  │Meals│  │Groc.│    │
│  └─────┘  └─────┘  └─────┘    │
│  ┌─────┐  ┌─────┐  ┌─────┐    │
│  │ 📅  │  │ 🌿  │  │ 💰  │    │
│  │Cal. │  │Habit│  │Fin. │    │
│  └─────┘  └─────┘  └─────┘    │
│                                 │
└─────────────────────────────────┘
```

Each tile is a card with the module's Lucide icon (matching the colors from ProductSelectionStep), the module name, and a subtle description. Tapping navigates to the module's main page. Only enabled products are shown.

## No Database Changes Required

This is purely a frontend navigation redesign.

