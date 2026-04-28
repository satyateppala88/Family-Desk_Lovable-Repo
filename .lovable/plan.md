# Fix Permissions Tour + Global CSS Responsiveness

## What's actually broken

**1. There is no carousel.** `PermissionsTutorial` is a 5-step wizard with Next / Skip buttons and decorative dots — no swipe, no arrow keys, no clickable dots. On touch the user expects to swipe; it doesn't move, which reads as "broken carousel."

**2. The dialog overflows the viewport.** `ui/dialog.tsx`'s `DialogContent` has no `max-height` or scroll behavior. The tutorial card (hero + iOS/Android tabs + ~140px system-prompt mock + 3 bullets + dots + 2 buttons) is taller than ~720px viewports, pushing the Continue / Skip buttons off-screen. Combined with the auto-injected close `X` overlapping the hero icon, this is the main "CSS gone for the toss" symptom.

**3. Global selector forces 44px min-height on EVERYTHING interactive.** `src/index.css` lines 222–224:
```css
button, a, [role="button"], input, select, textarea {
  min-height: var(--touch-target, 44px);
}
```
This breaks: inline links inside text, the iOS/Android segmented tabs in the tutorial, the mock prompt's "Don't Allow / OK / Allow" buttons (now 44px tall instead of ~36px), dropdown-menu items, breadcrumb links, sub-nav pills, dialog close X, badge buttons, and tag chips across the entire app. It's the single biggest source of layout regression.

**4. `html, body { overflow-x: hidden }`** silently hides any horizontal overflow bug instead of fixing it — a tablet swipe-carousel won't work as expected and any element wider than the viewport is just clipped, masking real responsive bugs elsewhere.

## Fix plan

### A. Convert the tour into a real swipeable carousel (`src/components/permissions/PermissionsTutorial.tsx`)
- Replace the manual `index` stepper UI with the existing **Embla-based `Carousel`** (`src/components/ui/carousel.tsx`).
- 5 `CarouselItem`s, one per slide, each rendering current header / mock / bullets / CTA.
- Wire `CarouselApi` to track the active slide so the dot indicators highlight correctly and **clicking a dot** jumps to that slide.
- Enable swipe on touch (default Embla behavior) and **left/right arrow keys** via `setOptions`.
- Footer buttons (`Enable …` / `Remind me in 7 days` / `Done`) operate on the active slide and call `api.scrollNext()` instead of `setIndex`.
- Keep `setHasSeenPermissionsTutorial()` on close/finish.

### B. Make the tutorial dialog viewport-safe
- In `PermissionsTutorial.tsx`, change `DialogContent` props to:
  - `className="max-w-md p-0 overflow-hidden gap-0 max-h-[90vh] flex flex-col"`
  - Wrap the slide body in a `flex-1 overflow-y-auto` region so long content scrolls instead of pushing the footer off-screen.
  - Footer (Enable / Skip) stays as a non-scrolling `shrink-0` block at the bottom.
- Hide the auto-injected Radix close `X` inside this dialog only, since the tour already has explicit Skip / Done buttons. Add a small `[&>button[aria-label='Close']]:hidden` (or pass a custom prop) to avoid overlap with the hero icon.

### C. Fix the global 44px min-height regression (`src/index.css`)
- Remove the blanket `button, a, [role="button"], input, select, textarea { min-height: 44px }` rule.
- Replace it with an opt-in approach that only enforces touch targets where they matter:
  - Keep `--touch-target: 44px` token.
  - Update the `Button` component (`src/components/ui/button.tsx`) `default` and `lg` size variants to already meet 44px (they do via `h-10` / `h-11` once we audit). For `sm` / `icon` keep their existing compact sizes — they're typically used inside dense toolbars where 44px breaks layout.
  - For form controls (`Input`, `Select`, `Textarea`, `SelectTrigger`) keep the existing `h-10` (40px) which is acceptable for desktop and bumps via padding on mobile.
  - Add a media-query rule that **only on coarse pointers** raises primary form inputs to 44px:
    ```css
    @media (pointer: coarse) {
      input:not([type='checkbox']):not([type='radio']):not([type='range']),
      select, textarea { min-height: var(--touch-target); }
    }
    ```
  - This preserves accessibility on touch devices without trashing inline links, dropdown items, segmented tabs, dialog close icons, etc.

### D. Light global responsive cleanup (`src/index.css`)
- Remove `html, body { overflow-x: hidden }`. Replace with `body { overflow-x: clip }` only when needed; better yet, drop it entirely and fix any actual offenders. Add a small audit pass and, if any wide element is found in landing/dashboard during local check, constrain it with `max-w-full` / `min-w-0`.
- Add a `--page-padding-x` step at the smallest breakpoint (≤360px) of `0.75rem` so very narrow Android screens (320–360 CSS px) don't crowd content against the edge.
- Ensure the hero icon container in the tutorial uses `mt-2` on small screens to avoid bumping the (now hidden) close X area.

### E. Sanity-check that nothing relied on the global 44px rule
- Quick `rg` for components depending on the global rule (icon-only `<button>`s without explicit height in `header`, FABs, dropdown items). Where any such button truly needs the 44px floor, add `min-h-[var(--touch-target)]` directly on the element rather than via the universal selector.

## Files touched
- `src/components/permissions/PermissionsTutorial.tsx` — convert to Embla `Carousel`, fix dialog sizing, hide auto close X.
- `src/components/ui/dialog.tsx` — no structural change, but verify the close-X can be opt-out via class targeting (already supported via the `[&>button]` trick).
- `src/index.css` — remove blanket 44px rule, add `@media (pointer: coarse)` form-controls rule, drop/relax `overflow-x: hidden`, add ≤360px padding step.
- `src/components/layout/Header.tsx` and any FAB/icon-button usages identified during audit — add explicit `min-h-[44px]` or `h-11 w-11` where the global rule was implicitly making them tappable.

## Out of scope
- No design-system color/font changes.
- No changes to other tour/onboarding flows (`OnboardingIntro`, `FeatureTour`) unless the global CSS fix surfaces a regression there.
- No changes to backend / RLS / edge functions.
