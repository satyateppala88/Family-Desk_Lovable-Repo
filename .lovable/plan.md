# Bill Image Scanner for Pantry

Add a vision-powered bill scanner so users can photograph grocery bills (Indian retail receipts) and have items pushed into the household pantry after a review step.

## User flow

```
Pantry → "Scan Bill" button (next to "AI Import")
   ↓
ScanBillDialog
  • Drop / pick 1–5 images (camera on mobile, file picker on desktop)
  • Thumbnails shown, remove individual images
  • "Extract Items" → loading state per image
   ↓
Edge function: ai-scan-bill (vision)
  • Returns merged items + bill metadata (store, date, total)
   ↓
BillReviewDialog (editable preview)
  • Table of items: name, qty, unit, category, expiry (days), price (optional)
  • Inline edit, delete row, "Add row" manually
  • Confidence chip per row (low-confidence highlighted)
  • Duplicate detector: if name fuzzy-matches an existing pantry item,
    show "Merge with existing (current qty X)" toggle → updates instead of insert
  • Footer: store name + bill date (editable), item count
  • "Save to Pantry" → bulkAdd + bulkUpdate
   ↓
Toast + pantry list refreshes (realtime already wired)
```

## Why this fits cleanly (no conflicts)

- **Mirrors existing `AIPantryImportDialog`** pattern — same edge-function shape, same `bulkAddItems` mutation, same household scoping. The text importer stays as-is for voice/typing; bill scan is the visual sibling.
- **Household-shared rule honored**: items inserted with `household_id` flow through existing RLS + realtime publication, so all members see updates instantly.
- **Reuses `usePantryItems` hook** (`bulkAddItems`, `updatePantryItem`) — no new mutations needed.
- **Categories + units** match the controlled vocab the AI already uses, so review chips/dropdowns reuse `usePantryCategories`.
- **No conflict with `last_purchased_at` / staples logic** — bill date populates `last_purchased_at`, which improves the existing "average usage days" analytics for free.
- **Meal-plan auto-deduction is unaffected** — it reads pantry totals; adding via bill is just another insert path.

## Optional enhancements (call out, default OFF)

- **Auto-create a "Bill" record** in a new `pantry_bills` table for history/spend tracking. Skipped by default to keep scope tight; can be added later and tied into Finance module.
- **Push bill total into Finance as a transaction** — only if user opts in via a checkbox in the review dialog. Off by default.

## Technical details

**New files**
- `supabase/functions/ai-scan-bill/index.ts` — vision call to `google/gemini-2.5-flash` (or `pro` for low-quality bills). Accepts `images: string[]` (base64 data URLs, max 5, ~4MB each post-compression). Same auth/rate-limit/Zod pattern as `ai-pantry-import`. Tool-call schema returns `{ store, bill_date, currency, items: [{name, quantity, unit, category, expiry_days, unit_price?, confidence}] }`.
- `src/components/grocery/ScanBillDialog.tsx` — image picker, client-side compression (canvas → JPEG ~1600px max edge, q=0.8), thumbnail strip, extract button.
- `src/components/grocery/BillReviewDialog.tsx` — editable items table with merge-detection (fuzzy match against current `pantryItems` by lowercased name + Levenshtein ≤ 2).
- `src/hooks/useScanBill.ts` — wraps `supabase.functions.invoke("ai-scan-bill", ...)`.

**Edited files**
- `src/pages/Grocery.tsx` — add "Scan Bill" action button alongside existing AI Import.
- `supabase/config.toml` — register `[functions.ai-scan-bill]` with `verify_jwt = false` (matches sibling functions; auth done in code).

**Limits & guardrails**
- Max 5 images per scan, 4MB each pre-compression (client rejects larger).
- Use existing `AI_RATE_LIMIT` (per-user).
- If AI returns 0 items → friendly empty state with "Try another photo" CTA.
- All inserts use `household_id` + `added_by = auth.uid()`.

**Image handling**
- Images are sent inline as base64 to the edge function (not stored). Keeps the feature stateless and avoids needing a new storage bucket. If users later want bill history, we add a `bills` bucket + table.

**Permission primer**
- Camera access on mobile uses existing `usePermissionPrimer` hook (already in memory) so the soft-prompt → OS-prompt pattern stays consistent.

## Out of scope (this iteration)

- Bill history / spend tracking table
- Auto-posting to Finance transactions
- Multi-language OCR beyond what Gemini handles natively (it already handles English + common Indian-language store receipts well)
- Background async processing — call is synchronous (~5–10s), shown with progress UI
