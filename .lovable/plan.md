## Scope

Three additions to the Grocery module: predictive low-stock chips with one-tap add to shopping list, a daily 6 PM pantry-low push reminder, WhatsApp share for shopping lists, and emoji-grouped category sections in shopping list views.

---

## CHANGE 1 — Running Low chips + Daily 6 PM reminder

### Pantry "Running low" chip row
- Replace the existing `LowStockAlert` (alert box style) with a new `RunningLowChips` component rendered at the top of the Pantry tab in `Grocery.tsx`.
- Hidden entirely when `lowStockItems` is empty (existing detection in `usePantryItems` already compares `quantity < minimum_quantity`).
- Horizontally scrollable row (`overflow-x-auto snap-x`) of amber/orange pill chips. Each chip:
  - Small `ShoppingCart` icon (lucide).
  - Item name + remaining quantity ("Toor Dal · 500g left").
  - Tap action: add to active shopping list and toast "Toor Dal added to shopping list".
- Colour: warm amber using existing tokens (`bg-amber-100 text-amber-900 border-amber-300` mapped via index.css if not already available — fallback to inline HSL warning tokens already in use by `ExpiringItemsAlert`).

### "Add to active list" behaviour
- New helper inside `Grocery.tsx` (or extracted into `useShoppingLists.ts` as `addPantryItemToActiveList`):
  1. Find first list with `status === "active"`. If none, create one named "Shopping List" via existing `createShoppingList`.
  2. If item with same `pantry_item_id` already on the active list (and not checked), skip insert and toast "Already on list".
  3. Otherwise insert via existing `addItemToList` mutation (pre-fills name, quantity = `minimum_quantity - quantity`, unit, category, `pantry_item_id`).

### Daily pantry reminder toggle + 6 PM push
- Migration: add `pantry_daily_reminder boolean not null default false` to `notification_preferences`.
- New "Grocery settings" section. Search shows there's no dedicated grocery settings page yet; we will add a small inline settings sheet accessible from the Pantry tab header (gear icon → bottom sheet with the toggle and a one-line explainer). This avoids inventing a new route.
- New edge function `pantry-low-reminder`:
  - For each user with `pantry_daily_reminder = true` AND `pantry = true` (master pantry channel), find the user's household, query `pantry_items` where `quantity < minimum_quantity`, and if ≥ 1, call `dispatch_push` with title "Pantry running low" and body "{N} items running low in your pantry: {first 3 names}. Add to list →" deep-linking to `/grocery`.
- Schedule: pg_cron job at `30 12 * * *` UTC (= 18:00 IST) using `supabase--insert` (per project convention for cron) calling the function via `net.http_post`.

---

## CHANGE 2 — WhatsApp Share for Shopping Lists

- New component `ShareOnWhatsAppButton.tsx` placed:
  - In the shopping-list overview header next to "Create List" (renders only when at least one list exists; shares the currently active list, or opens a tiny picker if multiple non-archived lists).
  - In `ShoppingListDetailView.tsx` header next to the back button (shares the open list).
- Formatter `formatListForWhatsApp(list, householdName)`:
  ```
  🛒 *{list.name} — {householdName}*

  □ {item.name}{quantity ? ` — ${quantity}${unit}` : ""}
  ...

  _Shared from FamilyDesk_
  ```
  Only includes unchecked items (checked items appended in a `~strikethrough~` block at bottom — optional polish, can be dropped for v1; default: unchecked only).
- Share logic:
  - Mobile (UA test for Android/iOS): `window.location.href = "whatsapp://send?text=" + encodeURIComponent(text)`.
  - Wrap in try/catch + 800 ms fallback timer: if still on page, copy to clipboard and toast "List copied — paste it in WhatsApp".
  - Desktop: skip the deep link entirely, copy + toast.
- Uses `navigator.clipboard.writeText`. No backend changes.

---

## CHANGE 3 — Smart category grouping with emoji headers

`ShoppingListDetailView.tsx` already groups by `item.category`. Upgrades:

- New util `src/lib/groceryCategories.ts`:
  - `CATEGORY_META: Record<string, { label: string; emoji: string; order: number }>` covering Vegetables 🥬, Fruits 🍎, Grains & Dal 🌾, Dairy 🥛, Spices 🌶, Meat & Seafood 🍗, Bakery 🍞, Beverages 🥤, Snacks 🍪, Frozen 🧊, Household 🧴, Personal Care 🧼, Other 📦.
  - `normalizeCategory(raw: string | null): keyof typeof CATEGORY_META` — case/synonym map (e.g. "veg", "vegetable", "veggies" → Vegetables; "dal", "lentils", "grain" → Grains & Dal; null → Other).
  - `groupAndSort(items)` returning `[{ key, label, emoji, items }]` sorted by `order`, with Other forced last.
- `ShoppingListDetailView.tsx`: replace ad-hoc grouping with `groupAndSort`. Render each section header as `{emoji} {label}` keeping existing checked counter and card styling. No changes to add/check/delete behaviour.
- Apply the same grouping in `ShoppingListCard.tsx` preview if it currently lists items (verify and align headers if so; otherwise leave card as a summary).

---

## Files

**New**
- `src/components/grocery/RunningLowChips.tsx`
- `src/components/grocery/ShareOnWhatsAppButton.tsx`
- `src/components/grocery/PantrySettingsSheet.tsx`
- `src/lib/groceryCategories.ts`
- `src/lib/whatsappShare.ts` (formatter + share helper)
- `supabase/functions/pantry-low-reminder/index.ts`
- `supabase/migrations/<ts>_pantry_daily_reminder.sql`

**Edited**
- `src/pages/Grocery.tsx` — swap `LowStockAlert` for `RunningLowChips`, add settings sheet trigger, add WhatsApp button in lists header.
- `src/hooks/useShoppingLists.ts` — add `addPantryItemToActiveList` helper + dedupe check.
- `src/hooks/useNotificationPreferences.ts` — extend `NotificationChannel` type with `pantry_daily_reminder`.
- `src/components/grocery/ShoppingListDetailView.tsx` — emoji grouping + WhatsApp button.
- `src/components/grocery/LowStockAlert.tsx` — delete (or leave unused; will delete).

**Cron**
- `supabase--insert` schedules `pantry-low-reminder` daily at 12:30 UTC.

## Out of scope
- Editing the cart-quantity prompt before adding from a chip (always uses `minimum_quantity - current` rounded).
- Per-list WhatsApp recipient picker (handled by WhatsApp itself).
- Reordering items inside a category (kept: unchecked-first within section).
- Predictive consumption-rate forecasting beyond the existing `quantity < minimum_quantity` check.