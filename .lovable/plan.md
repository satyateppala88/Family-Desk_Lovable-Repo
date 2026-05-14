## Goal
Fix two visual bugs in the "Top spending categories" bar chart on the Monthly Report page (`/finance/report`) without changing data sources, ranking logic, or any other report section.

## Current State
The chart is rendered inside `ReportCard.tsx` using Recharts (`BarChart layout="vertical"`). It suffers from:
1. The highest-value bar overflows the card boundary because widths are not normalised to the max value.
2. The rupee amount label is positioned inside/on top of the bar via Recharts' `label` prop, causing clipping at the card edge.

## Changes

### 1. Replace Recharts bar chart with a custom flex-based row layout
In `src/components/finance/ReportCard.tsx`, remove the Recharts import and the `<BarChart>` block inside the "Top spending categories" section. Replace it with a manual 3-column flex row for each category.

**Per-row layout:**
```text
[Category name  110px right-aligned] [Bar track flex-grow overflow-hidden] [Amount 90px left-aligned]
```

**Row specs:**
- Height: `min-h-[48px]`
- Category name: right-aligned, `text-[13px]`, `#6B6965`, `text-right`, max 2 lines with ellipsis
- Bar track container: `flex-1`, `overflow-hidden`, background `#E8E4D9`, height `10px`, `rounded-full`
- Bar fill: width calculated as `(amount / maxAmount) * 100` + `%`, height `10px`, `rounded-full`
  - Rank 1: `#0F6E56`
  - Rank 2: `#4A9B7F`
  - Rank 3: `#8FBFB0`
- Amount label: left-aligned in its 90px column, `text-[13px]`, `#2C2C2A`, `font-bold`

**Amount formatting logic:**
- Default: `toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })` → e.g. `₹1,29,000`
- On viewports < 360px wide (use Tailwind `xs:` or a `useIsMobile`-style check): if amount ≥ 100000, show `₹[X.X]L` (e.g. `₹1.3L`); otherwise show the full formatted value.

### 2. Normalise bar widths
```ts
const maxValue = Math.max(...report.topCategories.map(c => c.amount));
// Then for each category:
const widthPercent = maxValue > 0 ? (category.amount / maxValue) * 100 : 0;
```
Apply `style={{ width: `${widthPercent}%` }}` to the inner bar div. The highest bar will always cap at 100% of the track.

### 3. Clean up
Remove the `recharts` import from `ReportCard.tsx` since this is the only chart usage in that file. The `recharts` library can remain in `package.json` if used elsewhere.

## Out of Scope
- Data source (`useMonthlyReport` hook)
- Category ranking/sorting logic
- Other report sections (stats, habits, meals, tasks, tagline, share button)
- Page-level layout in `FinanceReport.tsx`