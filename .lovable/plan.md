# Replace User Guide menu entry with How to Use + What's New

## Problem
- Profile dropdown's **User Guide** item calls `onStartOnboarding`, which on most pages is not wired (only Index/Calendar/etc. trigger their own per-page tour). From the profile menu it usually does nothing.
- The `HowToUseSection` and `WhatsNewSection` are currently rendered inside the Household Settings page, where they don't belong (this page is for household preferences/admin).

## Changes

### 1. New standalone pages
- **`src/pages/HowToUse.tsx`** — wraps existing `<HowToUseSection />` in a standard page shell (Header + back button + Footer). Reuses `HOW_TO_USE_SECTIONS` from `src/lib/howToUse.ts`. No new content authored.
- **`src/pages/WhatsNew.tsx`** — wraps existing `<WhatsNewSection />` in the same page shell.

### 2. Routing (`src/App.tsx`)
- Add lazy routes:
  - `/how-to-use` → `HowToUse`
  - `/whats-new` → `WhatsNew`
- Both wrapped in `ProtectedRoute` for consistency with `/settings`.

### 3. Profile dropdown (`src/components/layout/Header.tsx`)
- **Remove** the `User Guide` `DropdownMenuItem` (and the now-unused `onStartOnboarding` invocation in the menu).
- **Add** two new items in the same spot, above Terms/Privacy:
  - `How to use` → `navigate("/how-to-use")`
  - `What's new` → `navigate("/whats-new")`
- Keep the `onStartOnboarding` prop on `Header` intact (still used by per-page tours like Calendar/Tasks/etc.) — only the menu entry is removed. No changes needed in pages that pass it.

### 4. Settings page cleanup (`src/pages/Settings.tsx`)
- Remove `<HowToUseSection />` and `<WhatsNewSection />` renders (lines 315–316).
- Remove their imports (lines 20–21).
- Leave `TermsSection` and `PrivacySection` in place (untouched).

### 5. Files NOT changed
- `src/components/settings/HowToUseSection.tsx` and `WhatsNewSection.tsx` remain as-is — just relocated by being rendered from the new pages.
- `src/lib/howToUse.ts` content unchanged.
- Per-page tour wiring (`handleStartOnboarding` in Calendar/Tasks/Habits/Grocery/Index/Meals) unchanged.

## Result
- Profile dropdown shows working **How to use** and **What's new** entries that route to dedicated pages.
- Household Settings page is focused purely on household/account preferences.
- Per-page guided tours continue to work where they're already wired.
