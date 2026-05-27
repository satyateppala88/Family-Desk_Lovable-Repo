# Disable pinch-zoom and rubber-band drag

The viewport meta in `index.html` already declares `maximum-scale=1.0, user-scalable=no`, but iOS Safari ignores that hint, which is why the page still pinch-zooms and rubber-band drags. Fixing it needs CSS + a tiny iOS gesture guard.

## Changes

**1. `src/index.css` — global `html, body` block**
- `touch-action: pan-x pan-y;` — kills pinch-zoom while preserving scroll.
- `overscroll-behavior: none;` — kills the elastic drag at the top/bottom of the page.
- `-webkit-text-size-adjust: 100%;` — prevents iOS auto text scaling.
- `-webkit-tap-highlight-color: transparent;` (cosmetic, while we're here).

We intentionally do NOT set `overflow: hidden` on body — the app still needs to scroll.

**2. `src/main.tsx` — iOS gesture guard (≈10 lines)**
iOS fires `gesturestart`/`gesturechange`/`gestureend` for pinch and `dblclick` for double-tap zoom regardless of the viewport meta. Add passive-false listeners on `document` that call `preventDefault()`. Mounted once at app boot, no React tree impact.

**3. Capacitor (native shell)**
Capacitor WebView already honors `user-scalable=no`, so no extra config needed. The CSS + JS above also covers it.

## Scope

- Affects every route. Inputs, dialogs, charts, and normal scrolling are unaffected (`pan-x pan-y` keeps both scroll axes alive).
- No change to recharts pinch — those charts don't use pinch interaction today.
- No backend / data changes.
