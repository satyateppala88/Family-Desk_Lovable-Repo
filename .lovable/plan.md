

# Landing Page Minimalistic Theme Alignment

The dashboard and inner pages have been updated with tighter spacing, lighter shadows, and subtle micro-animations -- but the landing page still uses the original heavier styling. Here are the necessary changes:

---

## 1. Hero Section (`src/components/landing/Hero.tsx`)

- Reduce heading sizes: `text-5xl md:text-7xl lg:text-8xl` down to `text-4xl md:text-6xl lg:text-7xl`
- Reduce subtitle size: `text-xl md:text-2xl` to `text-lg md:text-xl`
- Reduce button padding: `py-6` to `py-5`, `py-8` references similarly
- Soften the blur blobs: reduce from `blur-[150px]` to `blur-[120px]` and `w-[500px]` to `w-[400px]` for subtlety
- Add `animate-fade-in` to the subtitle and stagger the CTA buttons

## 2. Features Scroll (`src/components/landing/FeaturesScroll.tsx`)

- Reduce section padding: `py-24` to `py-16`
- Reduce heading bottom margin: `mb-16` to `mb-12`
- Reduce card padding: `p-8` to `p-6`
- Lighten card borders: `border-landing-accent/20` to `border-landing-accent/10`
- Remove `hover:scale-105` (too aggressive for minimal design) -- replace with `hover:translate-y-[-2px]`
- Reduce shadows: `shadow-lg hover:shadow-xl` to `shadow-sm hover:shadow-md`
- Reduce icon container size: `w-16 h-16` to `w-12 h-12`, icon size `w-8 h-8` to `w-6 h-6`

## 3. How It Works (`src/components/landing/HowItWorks.tsx`)

- Reduce section padding: `py-24` to `py-16`
- Reduce heading bottom margin: `mb-20` to `mb-12`
- Reduce step number size: `text-[120px]` to `text-[100px]`
- Reduce step icon box: `w-20 h-20` to `w-16 h-16`, icon `w-10 h-10` to `w-8 h-8`
- Reduce vertical spacing: `space-y-16` to `space-y-12`
- Soften shadow: `shadow-lg group-hover:shadow-xl` to `shadow-sm group-hover:shadow-md`

## 4. Benefits (`src/components/landing/Benefits.tsx`)

- Reduce section padding: `py-24` to `py-16`
- Reduce heading bottom margin: `mb-20` to `mb-12`
- Reduce card padding: `p-8` to `p-6`
- Replace `hover:scale-105` with `hover:translate-y-[-2px]`
- Lighten shadows: `shadow-lg hover:shadow-xl` to `shadow-sm hover:shadow-md`
- Lighten borders: `border-landing-accent/20` to `border-landing-accent/10`

## 5. "Made for Indian Households" Banner (`src/pages/Landing.tsx`)

- Reduce padding: `py-12` to `py-8`
- Reduce heading size: `text-3xl md:text-4xl` to `text-2xl md:text-3xl`

## 6. Final CTA (`src/components/landing/FinalCTA.tsx`)

- Reduce section padding: `py-32` to `py-20`
- Reduce heading size: `text-5xl md:text-6xl` to `text-4xl md:text-5xl`
- Reduce CTA button padding: `px-12 py-8` to `px-10 py-6`
- Soften blur blobs same as Hero

## 7. Navigation (`src/components/landing/LandingNav.tsx`)

- Reduce nav height: `h-20` to `h-16`
- Reduce logo size: `h-10 w-10` to `h-8 w-8`
- Reduce brand text: `text-2xl` to `text-xl`

## 8. Footer (`src/components/layout/Footer.tsx`)

- Already compact -- no changes needed

## 9. Micro-Animations

- Add `stagger-fade-in` class to the features grid and benefits grid
- Add intersection-observer-based fade-in for "How It Works" steps (using CSS `animation-timeline` or a simple scroll class)
- Ensure all section transitions use `transition-all duration-300` consistently

---

## Summary

| File | Changes |
|------|---------|
| `Hero.tsx` | Smaller type, softer blobs, tighter buttons |
| `FeaturesScroll.tsx` | Less padding, lighter cards, subtle hover |
| `HowItWorks.tsx` | Smaller numbers/icons, less spacing |
| `Benefits.tsx` | Lighter cards, subtle hover |
| `Landing.tsx` | Smaller India banner |
| `FinalCTA.tsx` | Less padding, smaller heading/button |
| `LandingNav.tsx` | Shorter nav, smaller logo |

All changes align with the minimalistic theme already applied to dashboard and inner pages.
