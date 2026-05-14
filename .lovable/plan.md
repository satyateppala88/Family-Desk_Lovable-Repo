# Floating Brand-Green Bottom Nav Redesign

Replace the current bordered white bottom nav with a floating green capsule, restore Finance to the primary nav (5 tabs), and move Habits into the More sheet.

## Scope

Single component rewrite (`BottomNav.tsx`) + small updates to `MoreSheet.tsx` and the global content padding in `ProtectedRoute.tsx`. No routing, no AI logic, no other module changes.

## 1. `src/components/layout/BottomNav.tsx` — full rewrite

New tab order (left → right):

| # | Label  | Route             | Icon (lucide)            | Size |
|---|--------|-------------------|--------------------------|------|
| 1 | Home   | `/dashboard`       | `Home`                   | 20px |
| 2 | Tasks  | `/taskmaster/today`| `CheckSquare`            | 20px |
| 3 | Ask AI | `/ai`              | `Sparkles`               | 24px |
| 4 | Finance| `/finance`         | `Wallet`                 | 20px |
| 5 | More   | (opens sheet)      | `MoreHorizontal`         | 20px |

Visuals (matching uploaded option C):

- Container: `fixed bottom-4 left-4 right-4 z-40 lg:hidden`, `max-w-[600px] mx-auto`
- Bar: `bg-[#0F6E56] rounded-[20px] h-[60px] flex items-center px-1`
- Shadow: `boxShadow: '0 4px 20px rgba(15,110,86,0.30)'`
- Safe-area: wrapper adds `marginBottom: env(safe-area-inset-bottom)`
- No border, no top divider, no backdrop blur, solid green only

Each tab button:

- `flex-1 flex flex-col items-center justify-center gap-[3px] min-h-[44px] rounded-[16px] py-2`
- Press: `active:scale-[0.92] transition-transform duration-150 ease-out`
- Inactive icon + label color: `text-white/45`
- Active icon + label color: `text-white`
- Label: `text-[10px] font-medium tracking-[0.01em]`
- Active state via `NavLink` `isActive`; for More, active when path matches `MORE_MATCH`
- No pill, underline, or background highlight on active

`MORE_MATCH` becomes `["/meals", "/grocery", "/habits", "/calendar"]` (Finance removed, Habits added).

Keep existing `HIDDEN_PREFIXES` behaviour.

## 2. `src/components/layout/MoreSheet.tsx`

Replace `ROWS` with, in order:

1. Meals → `/meals` (`UtensilsCrossed`)
2. Grocery → `/grocery` (`ShoppingCart`)
3. Habits → `/habits` (`Leaf`)
4. Calendar → `/calendar` (`Calendar`)

Row markup unchanged (icon left, label, chevron right). Remove `Wallet`/Finance import.

Note: the spec says "name + live subtitle" but no subtitle source is defined and the current sheet has no subtitle field. Keeping existing single-line row layout to avoid inventing data; flag this if you want real live subtitles wired up later.

## 3. `src/components/layout/ProtectedRoute.tsx`

Change wrapper padding so floating nav never overlaps content:

- `pb-16 lg:pb-0` → `pb-24 lg:pb-0` (96px on mobile, 0 on desktop where nav is hidden)

## Out of scope

- `/ai` page, `AIActionSheet`, contextual AI buttons (untouched)
- All routes, AI backend, edge functions, prompts
- Desktop layout (nav already `lg:hidden`)
- Tabler icon swap — sticking with existing `lucide-react` set already used everywhere; visual sizing/colors match the spec exactly. Switching icon libraries would add a dependency and touch unrelated files.
