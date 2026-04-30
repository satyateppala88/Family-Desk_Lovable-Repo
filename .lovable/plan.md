## Goal

When a user taps "Upload photo" on any avatar (profile, household, family member), show a small chooser with two options: **Take photo (camera)** and **Choose from gallery**. Each path checks the right permission, primes the user if needed, and then either opens the front camera or the phone's gallery. If a permission is blocked, show a clear "enable in settings, then try again" message.

## What changes for the user

1. Tap **Upload photo** / **Change photo** on any avatar.
2. A bottom sheet (mobile) / dialog (desktop) appears with two large buttons:
   - **Take photo** — uses camera (front-facing by default for selfies)
   - **Choose from gallery** — opens the phone's photo library
3. First time on each option:
   - Soft "why we need this" primer → OS permission prompt → camera or gallery opens.
4. If the user previously blocked it: a friendly toast says "Camera/Photos access is blocked. Enable it in your device settings, then tap Try again," with a Try-again button that re-invokes the flow.
5. Cancelling the chooser does nothing — no errors.

## How it works (technical)

### New component: `AvatarSourceSheet`
- A small `Sheet` (mobile-friendly) at `src/components/avatar/AvatarSourceSheet.tsx`.
- Two buttons: **Take photo** (Camera icon), **Choose from gallery** (Image icon).
- Emits `onPick("camera" | "gallery")`.

### Update `AvatarUploader.tsx`
- Replace single `handlePick` with:
  - `handleOpenChooser()` — opens `AvatarSourceSheet`.
  - `handleCameraPick()` — runs camera flow.
  - `handleGalleryPick()` — runs gallery flow.
- Keep existing `<input type="file">` for the **gallery** path on web; add a **second** hidden input with `capture="user"` for the **camera** path on web (front-facing on mobile browsers).
- On native (Capacitor), use `@capacitor/camera`'s `Camera.getPhoto({ source: CameraSource.Camera | CameraSource.Photos, resultType: ResultType.Uri })`, then fetch the URI as a Blob and upload through the existing Supabase storage code path.

### Permission flow per option
- **Take photo** → `ensurePermission("camera", "avatar-uploader-camera")`.
  - On web: primer → `getUserMedia({ video: true })` triggers OS prompt; on grant we immediately click the hidden `capture="user"` input (no `getUserMedia` stream is kept — the input itself opens the camera UI; the `getUserMedia` call is only used as the prompt vehicle and stops tracks immediately, matching existing pattern in `requestPermission`).
  - On native: primer → `Camera.requestPermissions({ permissions: ["camera"] })` → `Camera.getPhoto({ source: Camera })`.
- **Choose from gallery** → `ensurePermission("photos", "avatar-uploader-gallery")`.
  - On web: photos has no real permission — primer is skipped (`queryPermission` returns "prompt", primer shows once unless suppressed). After "Allow," click the existing hidden `<input type="file">`.
  - On native: primer → `Camera.requestPermissions({ permissions: ["photos"] })` → `Camera.getPhoto({ source: Photos })`.

### Denied / blocked handling
- Reuse the existing `DENIED_HINTS` toast in `usePermissionPrimer` (already shows "Camera access is blocked…" / "Photo access is blocked…").
- Keep the existing `PermissionRetryHint` block under the uploader; add a second one so both `camera` and `photos` retry hints can surface independently.

### Files touched
- **New:** `src/components/avatar/AvatarSourceSheet.tsx`
- **Edit:** `src/components/avatar/AvatarUploader.tsx`
  - Add chooser state, two flows, second hidden input with `capture="user"`, native Capacitor branch.
- No changes to `src/lib/permissions.ts`, `usePermissionPrimer`, primer dialog copy, or storage logic.

### What is NOT changed
- Storage bucket, path layout, file validation (type/size), and the `onChange(publicUrl)` contract are all untouched.
- Other call sites of `usePermissionPrimer` (voice input, notifications) are untouched.
- No DB migrations, no edge functions.

## Native Capacitor note

The Capacitor branch only activates when `window.Capacitor.isNativePlatform()` is true. On the published web app and PWA, the existing `<input type="file">` paths handle both camera (`capture="user"`) and gallery — exactly what mobile Chrome/Safari already do natively. No new npm dependency is required because `@capacitor/camera` is already imported lazily by `src/lib/permissions.ts`.

## Risks / call-outs

- `capture="user"` is a *hint*, not a guarantee — some Android browsers may open a chooser between camera apps. This is the platform behaviour; we cannot force-open a specific lens in a PWA.
- If the user blocks camera at the OS level on a native build, re-enabling requires a trip to system Settings (standard Android/iOS behaviour). The toast tells them this.
