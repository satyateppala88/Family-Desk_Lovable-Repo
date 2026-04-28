# Replace example-prompt cards with iOS/Android system-prompt mockups

## Problem
In `PermissionsTutorial.tsx`, the "example" card on each slide is just a line of italic text (e.g. `"Profile → Change photo → Take a photo"`). It doesn't show users what the actual OS permission dialog looks like, so when the real prompt appears it can feel unfamiliar and lower the grant rate.

## Why we won't ship literal Apple/Google screenshots
Shipping pixel-perfect screenshots of iOS / Android system dialogs is a trademark and App Store review risk (Apple's HIG explicitly disallows mimicking system UI in marketing in a misleading way; Google has similar rules). The industry-standard, review-safe pattern is a **stylized mockup** of the system sheet — same shape, layout, and tone, no Apple/Google logos or SF/Roboto fonts. We'll do that.

We also won't use animated GIFs — they're heavy (often 200KB+ each, 4 capabilities × 2 platforms = 8 assets), hard to localize, and don't add meaningful information over a static mockup with a subtle entrance animation.

## Solution

### 1. New component: `SystemPromptMock`
`src/components/permissions/SystemPromptMock.tsx`

- Pure React + Tailwind. No external assets, no GIFs.
- Renders a stylized **iOS-style** alert sheet OR **Android-style** Material dialog based on a `platform` prop.
- Props:
  ```ts
  {
    kind: "microphone" | "camera" | "photos" | "notifications";
    platform: "ios" | "android";
  }
  ```
- Per-capability copy mirrors the real system wording (these strings are the user-facing OS strings, which are factual descriptions, not protected IP):
  - **iOS**: `"\"Family Desk\" Would Like to Access the Microphone"` + our `NSMicrophoneUsageDescription` body + `Don't Allow` / `OK` buttons.
  - **Android**: `"Allow Family Desk to record audio?"` + `While using the app` / `Only this time` / `Don't allow` buttons.
- Visual details:
  - iOS: rounded 14px corners, centered title, divider line between buttons, tinted blue confirm button, light translucent backdrop.
  - Android: 28px rounded corners, left-aligned title, three stacked text buttons in primary tint, no divider.
  - Subtle `animate-scale-in` on mount (already in Tailwind config) so it feels like the real prompt sliding in.
  - Wrapped inside a soft "phone bezel" hint (rounded outer container + gradient bg) so it visually reads as "a system prompt", not part of our UI.

### 2. Platform toggle inside the tutorial
On each capability slide, show:
- The mockup for the user's likely platform first (iOS if the device is iPhone/iPad, Android otherwise — detected via `navigator.userAgent` and Capacitor's `getPlatform()` when available).
- A small **iOS / Android** segmented toggle above the mockup so anyone can preview the other style. Default selection comes from detection.
- Welcome slide (`kind: null`) keeps the existing illustrative card — there's no system prompt to mimic there.

### 3. Wire into `PermissionsTutorial.tsx`
- Remove the `example: string` field's role as the visual.
- Replace the `<div className="rounded-xl border ...italic">{slide.example}</div>` block with:
  ```tsx
  {slide.kind ? (
    <SystemPromptMock kind={slide.kind} platform={selectedPlatform} />
  ) : (
    <div className="rounded-xl border ...">{slide.example}</div>
  )}
  ```
- Keep the `example` text as a one-line caption **below** the mockup ("This is the prompt you'll see next") so the existing copy isn't lost.
- Add `selectedPlatform` state + segmented toggle (only rendered for capability slides).
- Bullets + dots + CTA buttons stay exactly as they are.

### 4. Detection helper
Small inline helper in `SystemPromptMock` (or a new `src/lib/devicePlatform.ts`):
```ts
export const detectMobilePlatform = (): "ios" | "android" => {
  const cap = (window as any).Capacitor?.getPlatform?.();
  if (cap === "ios") return "ios";
  if (cap === "android") return "android";
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ? "ios" : "android";
};
```

## Files

**New**
- `src/components/permissions/SystemPromptMock.tsx`

**Edited**
- `src/components/permissions/PermissionsTutorial.tsx` — render the mockup, add platform toggle, repurpose `example` as caption.

**Unchanged**
- Slide copy / order / analytics surface labels.
- `usePermissionPrimer`, `PermissionPrimerDialog`, OS-prompt flow.
- No new dependencies, no new assets, no migrations.

## Why this beats real screenshots / GIFs
- App Store / Play Store safe (no trademarked imagery).
- Zero KB asset weight — all CSS / SVG.
- Always crisp at any DPR; works in dark mode if added later.
- One source of truth for prompt copy, easy to keep in sync with the real `Info.plist` / `AndroidManifest` strings we ship.
- Both iOS and Android visible on every device — useful for a cross-platform household app.
