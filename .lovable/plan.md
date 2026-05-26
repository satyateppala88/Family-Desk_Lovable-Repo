Add missing negative-quantity guards to `updatePantryItem` and `bulkAddItems` in `src/hooks/usePantryItems.ts`.

The `addPantryItem` mutation already validates `quantity < 0`, but `updatePantryItem` and `bulkAddItems` accept negative quantities silently. This brings them into parity with `useFinance.ts` (which rejects negative amounts) and prevents data corruption.

Changes:
1. In `updatePantryItem.mutationFn`, add a guard before the Supabase `.update()` call:
   `if (updates.quantity !== undefined && updates.quantity !== null && updates.quantity < 0) throw new Error('Quantity cannot be negative');`
2. In `bulkAddItems.mutationFn`, loop through the array and validate each item's name and quantity, matching the `addPantryItem` pattern.

No database changes required.