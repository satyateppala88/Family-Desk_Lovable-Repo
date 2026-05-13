## Goal

Make the logo on `/household-setup` visually identical to the one on `/auth`, and prevent any black strip / crop artifact on the right edge.

## Changes (single file: `src/pages/HouseholdSetup.tsx`)

1. Swap the import to use the same asset the Auth page uses:
   - Remove: `import logoImg from "@/assets/familydesk-lockup.png";`
   - Add: `import lockupImg from "@/assets/familydesk-wordmark.png";`

2. Replace the current logo block (lines 296–304) with the exact same markup used in `Auth.tsx` (lines 336–342), wrapped in a fixed-width, `overflow-hidden` container so the image cannot overflow horizontally and produce the black strip:

   ```tsx
   <div className="flex justify-center mb-3">
     <div className="overflow-hidden w-[260px] flex justify-center">
       <img
         src={lockupImg}
         alt="FamilyDesk — Household OS"
         className="h-16 sm:h-20 w-auto object-contain"
       />
     </div>
   </div>
   ```

   This drops the white rounded card wrapper (`bg-white/90 rounded-2xl p-3 shadow-lg ring-1 ring-black/5`) that was unique to HouseholdSetup, so both pages render the wordmark identically against the page background.

## Out of scope

No changes to other pages, no new asset files, no logic changes.
