## Goal
Single tap on a date selects it and immediately closes the popover, across every form. Fix this once at the component level instead of patching each form.

## Findings
There is no existing shared date-picker wrapper. Five forms each compose `Popover + PopoverTrigger(Button) + Calendar` inline, and none of them call `setOpen(false)` after `onSelect`, so the popover stays open after a tap. Two other `Calendar` usages are not popovers and are out of scope:
- `CalendarSidebar.tsx` — inline mini-month for navigating the calendar page (no popover)
- `PantryAnalytics.tsx` — inline date-range filter (no popover)
- `TaskCompletionSheet.tsx` — already wires `setOpen(false)` manually, will be migrated for consistency

## Plan

### 1. Create shared component `src/components/ui/date-picker.tsx`

A single `<DatePicker />` wrapping shadcn `Popover` + `Calendar` with auto-close behaviour:

```tsx
interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;          // default "Pick a date"
  format?: string;               // default "dd/MM/yyyy"
  disabled?: (date: Date) => boolean;
  className?: string;            // applied to trigger Button
  align?: "start" | "center" | "end"; // default "start"
  id?: string;
}
```

Internals:
- Local `const [open, setOpen] = useState(false)` wired to `Popover open / onOpenChange`.
- Trigger: outline `Button` with `CalendarIcon` + formatted date or placeholder, full width, left-aligned.
- `Calendar mode="single" selected={value} onSelect={(d) => { onChange(d); if (d) setOpen(false); }}` with `className="p-3 pointer-events-auto"` and `initialFocus`.
- Forwards `disabled` to `Calendar`.
- Format display via `date-fns/format`.

### 2. Refactor inline popover pickers to use `<DatePicker />`

Replace the inline Popover/Calendar block in each of these files with a single `<DatePicker value={...} onChange={...} />` (preserving any `disabled` predicate, placeholder, and the parent's existing string conversion where needed):

- `src/components/calendar/CreateEventDialog.tsx` — event date
- `src/components/finance/TransactionDialog.tsx` — transaction date (parent stores `yyyy-MM-dd` string; convert in `onChange`)
- `src/components/finance/SubscriptionDialog.tsx` — `nextDueDate` and `endDate` (two instances)
- `src/components/grocery/AddPantryItemDialog.tsx` — `expiryDate`
- `src/components/taskmaster/TaskCompletionSheet.tsx` — reschedule date (drop the local `open` state and manual `setOpen(false)`)

Remove the now-unused `Popover`, `PopoverContent`, `PopoverTrigger`, `Calendar`, and `CalendarIcon` imports from each file.

### 3. Out of scope
- `CalendarSidebar.tsx` and `PantryAnalytics.tsx` keep their inline `<Calendar>` (not popover-based).
- No changes to validation, form submission, layout, or other field behaviour.
- No mobile/tablet/desktop conditionals — the shared component works everywhere.

### 4. Verification
- `bunx tsc --noEmit`
- Spot-check one form in the preview: tap a date → popover closes, field shows `DD/MM/YYYY`.
