# Global Design System Refresh

A comprehensive visual overhaul. Strategy: route everything through `index.css` semantic tokens + Tailwind config so the existing shadcn-based components (cards, buttons, inputs, sheets, badges) inherit the new look automatically. Then make targeted updates to a few bespoke surfaces (logo, dashboard greeting, AI tip card, AI sheet bubbles). No routing, data, auth, or AI logic touched. Bottom nav untouched.

## 1. Fonts

`index.html` (or `index.css`): swap Poppins import for:

```
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap');
```

`index.css` body rule + `tailwind.config.ts` `fontFamily.sans` → `'DM Sans'`. Add a new `fontFamily.serif: ['DM Serif Display', 'serif']` token and a `.font-display` helper class so the greeting + logo wordmark can opt in. No other component uses serif.

## 2. Token system (single source of truth in `index.css`)

Add the full `--fd-*` block under `:root` (raw hex + radii + shadows), then **rewire the existing semantic HSL tokens to point at the new palette**, so all shadcn components reflect the change without per-file edits:

| Semantic | New value | Source |
|---|---|---|
| `--background` | `40 25% 97%` | `#F7F6F2` (fd-surface) |
| `--foreground` | `0 0% 10%` | `#1A1A1A` (fd-ink) |
| `--card` | `0 0% 100%` | white |
| `--primary` | `165 76% 24%` (kept) | `#0F6E56` |
| `--primary-foreground` | `0 0% 100%` | white |
| `--secondary` | `158 53% 92%` | `#E1F5EE` (fd-green-light) |
| `--secondary-foreground` | `165 84% 15%` | `#085041` (fd-green-dark) |
| `--muted` | `40 25% 97%` | surface |
| `--muted-foreground` | `0 0% 54%` | `#8A8A8A` (fd-ink-3) |
| `--accent` | `158 53% 92%` | green-light |
| `--accent-foreground` | `165 84% 15%` | green-dark |
| `--border` | `165 76% 24% / 0.15` → static `158 30% 88%` | matches `--fd-border` mid-tone (HSL can't carry alpha for shadcn `hsl(var(--border))` consumers) |
| `--input` | same as border | |
| `--ring` | `165 76% 24%` | green |
| `--destructive` | `13 68% 35%` | `#993C1D` (fd-coral) |
| `--destructive-foreground` | `0 0% 100%` | |
| `--warning` | `30 78% 41%` | `#BA7517` (fd-amber) |
| `--success` | `165 76% 24%` | green |

Radii: set `--radius: 12px` so shadcn `rounded-md/lg` lands on the new `--fd-radius-md/lg` scale.

Shadows: redefine `--shadow-sm/md/lg/xl` to the new green-tinted recipe so any `shadow-sm`/`shadow-lg` consumer inherits.

Dark mode block: leave intact but bump `--background` and `--border` to mirror the new palette intent (no functional change requested by the user, kept consistent).

## 3. Tailwind config (`tailwind.config.ts`)

- `fontFamily.sans` → DM Sans, `fontFamily.serif` → DM Serif Display.
- Extend `colors` with raw `fd` palette (`fd.green`, `fd.greenDark`, `fd.greenLight`, `fd.greenMid`, `fd.ink`, `fd.ink2`, `fd.ink3`, `fd.surface`, `fd.amber`, `fd.amberLight`, `fd.coral`, `fd.coralLight`, `fd.blue`, `fd.blueLight`, `fd.pink`, `fd.pinkLight`) so spec-driven cases (AI bubbles, badge variants, module icon backgrounds) can use them as Tailwind classes.
- Extend `borderRadius`: `xl-fd: 24px`. Keep existing radii.
- Extend `boxShadow`: `fd-sm`, `fd-lg` matching `--fd-shadow-*`.

## 4. Logo — new shared component

Create `src/components/brand/FamilyDeskLogo.tsx` per spec:

- 40×40 green rounded-square (radius 11) with inline SVG (rounded rect + 2 horizontal lines, white 1.5 stroke).
- Wordmark: "Family" (`text-fd-ink`) + "Desk" (`text-fd-green`) in `font-serif`. Size prop: `lg` (22px) for auth/setup, `sm` (18px) for header.
- Sub-tagline: "HOUSEHOLD OS", DM Sans 9px, tracking 0.14em, `text-fd-ink3`.

Replace existing `<img src=…familydesk-lockup/wordmark/icon…>` usages on:

- `src/pages/Auth.tsx`
- `src/pages/HouseholdSetup.tsx`
- `src/pages/VerifyEmail.tsx`
- `src/pages/RequestAccess.tsx`
- `src/components/launch/SplashScreen.tsx`
- `src/components/landing/LandingNav.tsx` (only auth/in-app surfaces specified — landing kept identical unless a quick swap is trivial; will swap for consistency)
- App header where the lockup PNG appears (search confirms it's only in the above)

Keep PNG assets in `src/assets` (used by manifest/PWA) — don't delete.

## 5. Dashboard greeting (`src/pages/Index.tsx` + `Hero/Header` block)

Locate the "Good evening, {name}" element and re-render as:

- Name line: `font-serif text-[26px] text-fd-ink`, with the user's first name in `italic text-fd-green`.
- Sub line: DM Sans 12px, `text-fd-ink3`.

No new data — pull existing `profile.first_name` already in scope.

## 6. AI tip card

Update existing `DidYouKnowCard.tsx` (the dashboard tip surface) to spec: `bg-fd-greenLight`, 0.5px `border-fd-borderStrong`, radius `md`, sparkle icon left in `text-fd-green`, body text 12px `text-fd-greenDark`, dismiss `X` 14px green @ 60% opacity.

## 7. AI bottom sheet bubbles

Update `AIActionSheet.tsx` and `AskAi.tsx`:

- Assistant bubble: `bg-fd-greenLight text-fd-greenDark`, asymmetric radius `0 12px 12px 12px`, 13px / leading-1.6.
- Follow-up input row: pill input (radius 20px, `bg-fd-surface`, 40px), 40×40 circular green send button with `ArrowUp` icon.

## 8. Component visual sweeps (light, token-driven)

Because shadcn primitives consume the semantic tokens we just rewired, the following get the new look automatically with **zero per-file edits**:

- `Button` (default = primary green, secondary = green-light, ghost picks up new accent, destructive = coral).
- `Card` (white on warm surface, new border + radius).
- `Input`, `Textarea`, `Select` (new border, radius, focus ring).
- `Badge` (default/secondary/destructive get new colors; **add 4 new semantic variants** `amber`, `coral`, `blue`, `neutral` to `src/components/ui/badge.tsx` so the spec's full badge palette is available for opt-in usage).
- `Sheet`/`Dialog` (already round-top on mobile; verify radius `24px 24px 0 0`, add 36×4 handle bar to `SheetContent` mobile variant, ensure header layout matches).
- `Switch` (track 44×26, green on, thumb 20×20).
- `Checkbox` (20×20, radius 6, green check).

For Sheet/Switch/Checkbox/Badge I'll patch the shadcn files in `src/components/ui/` directly — these are the four primitives that need structural tweaks beyond pure token re-pointing.

## 9. Page padding / rhythm

`index.css` `.page-content` already uses `--page-padding-x: 1rem`. No change needed beyond confirming surface bg. Section gaps: dashboard sections and module grid live in `src/pages/Index.tsx` — apply `gap-5` (20px) and `gap-2` (8px) where mismatched.

Module grid: confirm 2-col mobile / 3-col `sm:` already in `QuickActionsRow` / module grid; bump to spec where it differs.

## 10. Out of scope

- Bottom nav (already updated).
- All routing, hooks, queries, edge functions.
- Per-file color audits beyond the surfaces listed above — the token rewire handles the rest.
- Dark mode redesign (keep functional, no spec change).
- Landing page marketing aesthetic (logo swap only).
- Replacing every hardcoded hex in obscure components — only the 4 token entry points (`index.css` semantics, Tailwind config, badge variants, sheet/switch/checkbox primitives) plus the named bespoke surfaces (logo, greeting, AI tip, AI sheet).

## Files touched

- `index.html` (font import) **or** `src/index.css` (font import + token rewire + shadow + radius + helpers)
- `tailwind.config.ts` (fonts, fd palette, shadows, radii)
- `src/components/brand/FamilyDeskLogo.tsx` (new)
- `src/components/ui/badge.tsx` (add amber/coral/blue/neutral variants + restyle)
- `src/components/ui/sheet.tsx` (handle bar, radius)
- `src/components/ui/switch.tsx` (sizing)
- `src/components/ui/checkbox.tsx` (sizing, radius, color)
- `src/components/dashboard/DidYouKnowCard.tsx` (AI tip card)
- `src/pages/Index.tsx` (greeting block + module grid spacing)
- `src/pages/Auth.tsx`, `HouseholdSetup.tsx`, `VerifyEmail.tsx`, `RequestAccess.tsx`, `Settings.tsx` header, `SplashScreen.tsx`, `LandingNav.tsx` (logo swap)
- `src/components/ai/AIActionSheet.tsx`, `src/pages/AskAi.tsx` (assistant bubble + send button)

Verification on 390px mobile after build: warm surface visible, logo renders on `/auth` and `/household-setup`, greeting uses DM Serif italic green first name, tap targets ≥ 44px on inputs, no overflow.
