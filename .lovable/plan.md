## TaskCompletionSheet — three confirm-form fixes

All edits in `src/components/taskmaster/TaskCompletionSheet.tsx`. No changes to `lib/taskCompletion.ts` (state model is correct; the component just isn't exercising it everywhere).

### Bug 1 — "AI suggested — tap to confirm" chip is inert
`AiSuggestedBadge` is rendered as a non-interactive `<Badge>`, so taps do nothing.

- Convert `AiSuggestedBadge` to render a `<button type="button">` wrapping the badge when not yet confirmed; on click it invokes a passed-in `onConfirm` callback. When `confirmed`, render a non-interactive green badge as today.
- Pass `onConfirm={() => confirmField("category")}` and `onConfirm={() => confirmField("priority")}` (and `"status"`, `"due"`) at the three call sites that already use the badge.
- Result: tapping the amber chip flips that field to `userConfirmed.<key> = true`, badge swaps to green "✓ Confirmed", and the bottom validation list updates. Once Category + Priority + Status + Due are confirmed and the title is non-empty, "Create task" enables (logic already in `isDraftReady`).

### Bug 2 — Status "Pick one" badge stays after selection
`onValueChange` already calls `confirmField("status")`, but Radix Select does **not** fire `onValueChange` when the user picks the currently-selected value. With `defaultStatus="today"` the dropdown opens already on "Today", so re-tapping "Today" never confirms.

- Add `onOpenChange={(open) => { if (!open) confirmField("status"); }}` on the Status `<Select>`. Closing the dropdown after any interaction (whether or not the value changed) counts as confirmation, which matches the user's mental model and clears the orange "Pick one" badge immediately.
- Apply the same `onOpenChange` confirmation to the Category and Priority selects so that "tapped the dropdown and chose the existing value" also counts as confirmation (parity with the chip path).

### Bug 3 — Priority dropdown cycles instead of opening
On narrow widths the Priority column is half a `grid-cols-2`. The "AI suggested — tap to confirm" badge is long and sits in a `flex items-center justify-between` row directly above a small `SelectTrigger`; on small viewports the badge wraps and visually/interactively overlaps the trigger area, so taps land on the badge or get consumed in unexpected ways. Combined with `SelectContent` defaulting to `z-50` (same as the parent Sheet), the dropdown can also fail to surface above the sheet content.

- Restructure each field header so the chip wraps below the label instead of overlapping the trigger:
  - Replace `flex items-center justify-between` with `flex flex-wrap items-center justify-between gap-2 min-w-0` and add `shrink-0` to the chip button. This guarantees the chip never sits on top of the `SelectTrigger`.
- Add `className="z-[60]"` to all four `SelectContent` instances in this sheet (Status, Category, Priority, Project) so the popover always renders above the bottom Sheet (matches the same fix used in `AddPantryItemDialog`).
- The chip is now a real `<button>` (Bug 1), so its hit-target is unambiguous and won't accidentally proxy clicks into the trigger.

### Verification
1. Open Today → AI-create a task → sheet opens with amber chips on Category/Priority and "Pick one" on Status.
2. Tap Category chip → turns green ✓. Tap Priority chip → turns green ✓.
3. Open Status dropdown, pick "Today" (or re-pick the default) → "Pick one" disappears, validation row no longer lists Status.
4. Open Priority dropdown on a narrow viewport → it opens normally and shows P1–P4; selecting any value updates the trigger label without cycling.
5. With title present and all four fields confirmed, "Create task" becomes enabled.