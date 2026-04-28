## Fix overlapping UI on the Auth page (mobile Chrome)

Scope is intentionally narrow: only the `/auth` screen (sign-in, sign-up, "verification pending" view) on mobile. No global rewrites — we only touch what's actually causing overlap.

### What's overlapping today (and why)

1. **Eye / EyeOff icon sits on top of the password text.** The icon button is rendered with `size="icon"` + `h-full px-3` and absolutely positioned at `right-0`. On coarse pointers our global rule forces inputs to `min-height: 44px`, but the button stays its own width and ends up wider than the input's `pr-10` (40px) padding reservation. Long emails / passwords therefore disappear *under* the icon.
2. **Card gets clipped at the top of the screen.** The wrapper uses `min-h-screen flex items-center justify-center`. On mobile Chrome `100vh` includes the URL bar, so when the Card is taller than the visible area, vertical centering pushes the logo *above* the viewport — looks like the logo is overlapping the browser chrome and there's no way to scroll up to it.
3. **Logo block is oversized** (`h-24 w-24` logo inside a padded white tile) — combined with `text-3xl` title, two tabs, four form fields, terms checkbox, and submit button, the Sign Up card overflows a 390×~700 viewport and triggers issue 2.
4. **Terms checkbox visually collides with the wrapping label.** `items-start` + `leading-none` on a label that wraps across two lines (because of the two underlined links) makes the checkbox sit tight against the first link's underline.
5. **Tab focus ring overlaps the neighbouring tab.** The global `:focus-visible { ring-offset-2 }` rule paints a 2px offset ring that bleeds into the adjacent TabsTrigger inside the segmented `TabsList`.
6. **Verification-pending card** has the same `min-h-screen` centering problem on shorter screens.

### Fixes

**`src/pages/Auth.tsx`**
- Replace the page wrapper on both the form view and the verification-pending view:
  - `min-h-screen flex items-center justify-center p-4` → `min-h-[100svh] flex flex-col items-center justify-center p-4 py-6 overflow-y-auto`
  - This uses the *small viewport height* unit so the URL bar can't clip the card, and allows scrolling when content is tall.
- Shrink the logo block on phones: `p-3` → `p-2.5`, logo size `h-24 w-24 sm:h-28 sm:w-28` → `h-16 w-16 sm:h-24 sm:w-24`. Reduce `mb-4` → `mb-3`. Drop title from `text-3xl` → `text-2xl sm:text-3xl`.
- Rebuild the password show/hide control so it can no longer cover the input text:
  - Wrap is still `relative`, but the input gets `pr-12` (48px) instead of `pr-10`.
  - Replace the `Button size="icon" h-full` with a plain `<button type="button">` sized `h-9 w-9` (36×36) centered with `absolute right-1.5 top-1/2 -translate-y-1/2`, `inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent`.
  - This guarantees the button sits *inside* the reserved 48px padding on the right, so typed text never slides under the icon, regardless of the input's enforced 44px coarse-pointer height.
  - Apply the same change to both the Sign In and Sign Up password fields.
- Terms row: change `items-start space-x-2` → `items-start gap-2.5`, give the Checkbox `mt-0.5 shrink-0`, and on the label drop `leading-none` (use default `leading-snug`) so wrapped lines don't crowd the checkbox.

**`src/index.css`**
- The `:focus-visible` rule currently applies `ring-offset-2 ring-offset-background` globally, which is what causes Tab triggers (and other tightly-packed controls) to visually overlap when focused. Soften it to `outline-none ring-2 ring-ring/50 rounded-sm` (no offset). Keyboard focus is still clearly visible; offsets are only useful when controls have breathing room around them, which segmented tabs and inline icon buttons don't.

### Out of scope

- No changes to other pages, the Header, Hub launcher, AI chat widget, or permissions tour — those were already fixed in the previous round and weren't reported as broken now.
- No new design tokens, no library swaps.

### Verification

After the changes, on a 390×754 viewport (matches your OnePlus 11's CSS pixels with the URL bar visible):
- The whole Auth card — logo, tabs, all form fields, terms, submit — fits without the logo being clipped.
- Typing a long email/password in either tab shows the text right up to the eye icon with no overlap.
- The terms checkbox aligns with the first line of the label even when the links wrap.
- Tapping between Sign In / Sign Up tabs no longer paints a focus ring that bleeds into the other tab.