
# Warm Minimal Theme Implementation Plan

## Overview

Apply a cozy, family-friendly "Warm Minimal" theme across the entire application with full support for both light and dark modes. This theme uses warm creams, soft corals, and forest greens to create a welcoming yet modern interface.

---

## Color Palette

### Light Mode
| Element | Color | HSL Value |
|---------|-------|-----------|
| Background | Warm Cream | `36 100% 98%` (#FFFBF5) |
| Card/Surface | Soft White | `0 0% 100%` (#FFFFFF) |
| Primary | Warm Coral | `11 76% 63%` (#E07A5F) |
| Primary Hover | Deeper Coral | `11 70% 55%` |
| Accent | Soft Gold | `28 89% 67%` (#F4A261) |
| Success | Forest Green | `145 60% 51%` (#47CC7B) |
| Text | Warm Black | `24 10% 16%` (#2D2A26) |
| Muted Text | Warm Gray | `24 6% 50%` |
| Borders | Warm Light Gray | `30 20% 90%` |

### Dark Mode
| Element | Color | HSL Value |
|---------|-------|-----------|
| Background | Warm Charcoal | `24 12% 10%` (#1C1917) |
| Card/Surface | Warm Dark | `20 10% 14%` (#292524) |
| Primary | Soft Coral | `15 85% 73%` (#F09C7D) |
| Accent | Gold | `45 96% 55%` (#FBBF24) |
| Success | Bright Green | `145 60% 55%` |
| Text | Warm White | `40 20% 98%` (#FAFAF9) |
| Muted Text | Warm Gray | `24 6% 60%` |
| Borders | Warm Dark Gray | `20 6% 25%` |

---

## Files to Modify

### 1. `src/index.css` - Core Theme Variables

Update all CSS custom properties for both `:root` (light) and `.dark` modes:

**Light Mode Changes:**
- `--background`: `36 100% 98%` (warm cream)
- `--foreground`: `24 10% 16%` (warm black)
- `--card`: `0 0% 100%` (pure white)
- `--primary`: `11 76% 63%` (warm coral)
- `--primary-foreground`: `0 0% 100%` (white)
- `--accent`: `28 89% 67%` (soft gold)
- `--success`: `145 60% 51%` (forest green)
- `--muted`: `30 15% 85%`
- `--muted-foreground`: `24 6% 45%`
- `--border`: `30 20% 90%`

**Dark Mode Changes:**
- `--background`: `24 12% 10%` (warm charcoal)
- `--foreground`: `40 20% 98%` (warm white)
- `--card`: `20 10% 14%` (warm dark)
- `--primary`: `15 85% 73%` (soft coral)
- `--accent`: `45 96% 55%` (gold)
- `--border`: `20 6% 25%`

**Additional Updates:**
- Landing page colors aligned with new palette
- Sidebar colors updated for consistency
- Chart colors updated to warm tones
- Softer shadow definitions
- Add Inter font import

### 2. `tailwind.config.ts` - Font Family

Update the font stack to use Inter as the primary font:

```typescript
fontFamily: {
  sans: [
    'Inter',
    'ui-sans-serif',
    'system-ui',
    // ... fallbacks
  ],
}
```

### 3. `src/components/ui/card.tsx` - Subtle Card Styling

Reduce visual noise by using subtler shadows and borders:

```typescript
// Current
"rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md"

// Updated
"rounded-xl border border-border/50 bg-card text-card-foreground shadow-xs hover:shadow-sm"
```

### 4. `index.html` - Font Preconnect

Already has Inter font imported - no changes needed.

---

## Visual Comparison

### Before (Current Theme)
```text
+----------------------------------------------------------+
|  [Logo] Family Desk              [Avatar]                 |
|  ──────────────────────────────────────────              |
|                                                           |
|  Primary: Teal (#0FA580)                                  |
|  Background: Cool Gray (#F5F5F5)                          |
|  Cards: Harsh shadows, cool tones                         |
|                                                           |
+----------------------------------------------------------+
```

### After (Warm Minimal)
```text
+----------------------------------------------------------+
|  [Logo] Family Desk              [Avatar]                 |
|  ──────────────────────────────────────────              |
|                                                           |
|  Primary: Warm Coral (#E07A5F)                            |
|  Background: Cream (#FFFBF5)                              |
|  Cards: Subtle shadows, warm undertones                   |
|                                                           |
+----------------------------------------------------------+
```

---

## Implementation Summary

| File | Changes |
|------|---------|
| `src/index.css` | Update ~50 CSS variables for light/dark modes, add Inter font |
| `tailwind.config.ts` | Change primary font to Inter |
| `src/components/ui/card.tsx` | Soften shadows and border opacity |

---

## Benefits of Warm Minimal Theme

1. **Eye Comfort**: Warm cream backgrounds reduce blue light and eye strain
2. **Family Friendly**: Coral and gold tones feel welcoming and approachable
3. **Professional**: Minimalist design maintains credibility for an "ERP for home"
4. **Dark Mode Ready**: Carefully crafted dark palette with warm undertones
5. **Consistent**: Landing page and app share the same color language
