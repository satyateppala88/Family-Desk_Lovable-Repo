## Apply FamilyDesk brand design system + brand artifacts

Visual-only refresh. No logic, routing, data, or component-API changes.

### A. Brand artifact placement

Copy the four uploaded assets into the project so they can be used as favicon, PWA icons, splash artwork, and in-app brand lockup:

```text
user-uploads://familydesk_appicon.png  → public/pwa-icon-512.png   (replaces, also written as 192 via downscale step below)
user-uploads://familydesk_appicon.png  → public/apple-touch-icon.png
user-uploads://familydesk_icon.png     → public/favicon.png         (and src/assets/familydesk-icon.png for in-app use)
user-uploads://familydesk_lockup.png   → src/assets/familydesk-lockup.png
user-uploads://familydesk_wordmark.png → src/assets/familydesk-wordmark.png
```

Notes:
- Existing `public/pwa-icon-192.png`, `public/pwa-icon-512.png`, `public/favicon-16x16.png`, `public/favicon-32x32.png` will be overwritten with the new green app-icon (downscaled with ImageMagick via `nix run nixpkgs#imagemagick`).
- Delete `public/favicon.ico` if present (browsers default-request it and would override the new PNG favicon).
- `index.html` favicon `<link>` tags repointed to `/favicon.png` (32×32 + 16×16 PNGs regenerated from `familydesk_icon.png`). Apple touch icon repointed to the new app icon.
- `manifest.webmanifest` icon entries continue to reference `/pwa-icon-192.png` and `/pwa-icon-512.png` (now the new artwork).
- The splash screen (`SplashScreen.tsx`), landing nav (`LandingNav.tsx`), auth page (`Auth.tsx`), and email/footer brand surfaces will use the **lockup** image (`@/assets/familydesk-lockup.png`) where a logo + tagline reads well, and the **wordmark** image where space is tight or the icon already appears nearby. Header (`layout/Header.tsx`) keeps the existing in-shell branding swapped to the icon + wordmark pairing. *Scope guard:* only files that already render a brand logo/text are touched — no new placements.

### B. `src/index.css` — `:root` tokens (light mode)

Map shadcn primitives to the new brand palette. The prompt's HSL values (`13 62% 25%` for `#0F6E56`) are wrong; `#0F6E56` is `HSL 165 76% 24%`. I'll use correct conversions so rendered colors match the hex reference card.

- `--primary: 165 76% 24%` (#0F6E56) / `--primary-foreground: 0 0% 100%`
- `--ring: 165 76% 24%`
- `--background: 0 0% 100%`
- `--foreground: 60 3% 17%` (#2C2C2A)
- `--card: 0 0% 100%` / `--card-foreground: 60 3% 17%`
- `--popover: 0 0% 100%` / `--popover-foreground: 60 3% 17%`
- `--secondary: 43 19% 93%` / `--secondary-foreground: 60 3% 17%`
- `--muted: 43 19% 93%` (#F1EFE8) / `--muted-foreground: 45 3% 53%` (#888780)
- `--accent: 158 53% 92%` (#E1F5EE) / `--accent-foreground: 165 76% 24%`
- `--border: 47 13% 80%` (#D3D1C7) / `--input: 47 13% 80%`
- Sidebar tokens repointed to the same brand/ink mappings.
- Module + chart tokens: keep the existing differentiated module colors (Tasks/Meals/Grocery/Calendar/Habits/Finance) so module identity isn't lost, but `--module-tasks` and `--chart-1` move to `165 76% 24%` so the headline brand surfaces use the new green.
- Add hex custom properties as a parallel naming layer for designer/CSS access:
  - `--brand`, `--brand-dark`, `--brand-mid`, `--brand-light`, `--brand-muted`
  - `--ink`, `--ink-secondary`, `--ink-muted`, `--ink-border`, `--ink-surface`
  - Aliases: `--color-primary`, `--color-primary-hover`, `--color-background`, `--color-surface`, `--color-border`, `--color-text`, `--color-text-muted`.

### C. `src/index.css` — dark mode

Lighten the brand for dark surfaces so contrast stays AA:
- `--primary: 158 50% 55%` (≈ brand-light) / `--primary-foreground: 60 3% 12%`
- `--accent: 165 40% 22%` / `--accent-foreground: 158 53% 92%`
- Other tokens stay on the existing warm-dark base; only brand-tinted ones shift.

### D. `src/index.css` — body font

Swap the Google Fonts `@import` to Poppins (300/400/500/600). Update `body { font-family }` to `'Poppins', system-ui, -apple-system, sans-serif`. Heading rule keeps `font-weight: 600` and `letter-spacing: -0.02em` — Poppins handles both well.

### E. `tailwind.config.ts`

- Replace `fontFamily.sans` so `Poppins` is first.
- Extend `theme.extend.colors` with two new groups using exact hex values:
  - `brand`: `DEFAULT/dark/mid/light/muted` → `#0F6E56 / #085041 / #1D9E75 / #5DCAA5 / #E1F5EE`
  - `ink`: `DEFAULT/secondary/muted/border/surface` → `#2C2C2A / #5F5E5A / #888780 / #D3D1C7 / #F1EFE8`
- Existing semantic mappings (`primary`, `secondary`, …) untouched — they still read from CSS vars now repointed to brand.

### F. `index.html`

- Add Poppins preconnect + stylesheet `<link>` tags inside `<head>` (keep Inter link; harmless and may still be used by transactional emails).
- Update `<meta name="theme-color">` from `#0f766e` to `#0F6E56`.
- Repoint favicon links to the regenerated PNGs.

### G. Buttons

`src/components/ui/button.tsx` already uses `bg-primary` / `hover:bg-primary/90` / `rounded-lg`. Because `--primary` now resolves to `#0F6E56`, no component edit is needed; hover deepens to ≈90% of brand which reads close to `#085041`.

### H. Sidebar / nav

Already driven by `--sidebar-*` tokens (repointed in step B). Active-state styling reads from `--sidebar-primary` / `--sidebar-accent`, now brand-green / brand-muted. No component edits.

### I. Memory update

After applying, refresh the `Visual Identity` memory file and the Core line so future sessions don't revert to sage-teal/DM Sans.

### Files touched

```text
public/favicon.png                      (new, from familydesk_icon.png)
public/favicon-16x16.png                (regenerated)
public/favicon-32x32.png                (regenerated)
public/apple-touch-icon.png             (new, from familydesk_appicon.png)
public/pwa-icon-192.png                 (replaced)
public/pwa-icon-512.png                 (replaced)
public/favicon.ico                      (deleted if present)
src/assets/familydesk-icon.png          (new)
src/assets/familydesk-lockup.png        (new)
src/assets/familydesk-wordmark.png      (new)
src/index.css                           (palette tokens, font import, body font, dark-mode brand)
tailwind.config.ts                      (fontFamily.sans → Poppins; brand + ink colors)
index.html                              (Poppins, theme-color, favicon links)
src/components/launch/SplashScreen.tsx  (use lockup image)
src/components/landing/LandingNav.tsx   (use wordmark)
src/components/layout/Header.tsx        (use icon + wordmark pairing)
src/pages/Auth.tsx                      (use lockup above the form)
mem://style/design-system/visual-identity (updated)
mem://index.md                          (Core line refreshed)
```

### Out of scope

No edits to component logic, routing, data fetching, Supabase queries, auth, layout structure, or icon library. New brand artwork only replaces existing brand surfaces — no new placements.
