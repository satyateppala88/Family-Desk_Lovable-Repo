## Goal
Bring the existing persistent bottom navigation into compliance with the spec. `BottomNav` already exists and is rendered from `ProtectedRoute`, so this is a refinement, not a from-scratch build.

## Changes

### 1. `src/components/layout/BottomNav.tsx` (rewrite)
- Wrapper visibility: `lg:hidden` so the bar disappears on desktop (top header takes over).
- Container: fixed bottom, full width, `h-16` (64px), `bg-background` (white), `border-t border-border` (matches `#D3D1C7`), preserves `env(safe-area-inset-bottom)`.
- Tabs (5): Home, Tasks, Finance, Habits, More — using the same icons as the dashboard module cards in `src/pages/Index.tsx`:
  - Home → `Home` (lucide) → `/dashboard`
  - Tasks → `CheckSquare` → `/taskmaster/today` (active for any `/taskmaster*`)
  - Finance → `Wallet` → `/finance`
  - Habits → `Leaf` → `/habits`
  - More → `MoreHorizontal` (opens sheet)
- Active state: icon + label in `text-primary` (brand green `#0F6E56` already mapped to `--primary`); 3px green indicator bar absolutely positioned at the top of the active tab (`absolute top-0 h-[3px] w-8 bg-primary rounded-b`).
- Inactive state: icon + label in `text-muted-foreground` (matches `#888780`).
- Active detection via `useLocation()` with prefix matching; `More` is active when route is `/meals`, `/grocery`, or `/calendar`.
- Keep the existing `HIDDEN_PREFIXES` list so the bar still hides on `/auth`, onboarding, admin, etc.

### 2. `src/components/layout/MoreSheet.tsx` (new)
- Extract the bottom sheet from `BottomNav.tsx` into its own component.
- Props: `open: boolean`, `onOpenChange: (v: boolean) => void`.
- Uses shadcn `Sheet` with `side="bottom"`, rounded top corners.
- Three full-width rows (one per line, not a grid): Meals (`UtensilsCrossed`, `/meals`), Grocery (`ShoppingCart`, `/grocery`), Calendar (`Calendar`, `/calendar`). Each row: icon left in brand green, label, chevron right; tapping navigates and closes the sheet. Removes the existing `Settings` entry to match spec.

### 3. `src/components/layout/ProtectedRoute.tsx`
- Wrap `{children}` in a `<div className="pb-16 lg:pb-0">` so authenticated page content is not hidden behind the 64px bar on mobile and gets no extra padding on desktop.
- `BottomNav` continues to be rendered here (component itself handles `lg:hidden` and route-based hiding).

## Out of scope
- No routing, auth, or page component changes.
- Desktop top nav (`Header.tsx`) is untouched.

## Technical notes
- Brand green is already wired as `--primary` (HSL `165 76% 24%`); use semantic tokens (`text-primary`, `bg-primary`, `border-border`, `text-muted-foreground`) — no hex literals in JSX.
- Indicator line uses `relative` on the `NavLink` and an absolutely positioned span so it sits above the icon without shifting layout.
- More-sheet rows use `w-full flex items-center gap-4 px-4 py-4 border-b border-border` for the full-width row look.
