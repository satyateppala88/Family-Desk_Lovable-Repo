# Native Permissions Setup (iOS & Android)

These reference files document every permission Family Desk needs for an
App Store / Play Store release. Apply them **after** running:

```bash
npm install
npx cap add ios       # if releasing to App Store
npx cap add android   # if releasing to Play Store
npx cap sync
```

## What permissions we ask for and why

| Capability                    | Used by feature                              | iOS key                              | Android permission                     |
|-------------------------------|----------------------------------------------|--------------------------------------|----------------------------------------|
| Microphone                    | Voice input on tasks, AI chat, pantry import | `NSMicrophoneUsageDescription`       | `RECORD_AUDIO`                         |
| Speech recognition (iOS only) | On-device dictation                          | `NSSpeechRecognitionUsageDescription`| —                                      |
| Camera                        | Take profile / household / family photos     | `NSCameraUsageDescription`           | `CAMERA`                               |
| Photo library (read)          | Pick existing photo for avatar               | `NSPhotoLibraryUsageDescription`     | `READ_MEDIA_IMAGES` (33+) / `READ_EXTERNAL_STORAGE` (≤32) |
| Photo library (add)           | Save captured photo back to library          | `NSPhotoLibraryAddUsageDescription`  | —                                      |
| Push notifications            | Task / habit / meal / pantry reminders       | (entitlement + runtime)              | `POST_NOTIFICATIONS` (33+)             |
| Internet / network state      | Cloud sync                                   | (none required)                      | `INTERNET`, `ACCESS_NETWORK_STATE`     |

## How to apply

1. **iOS** — open `ios/App/App/Info.plist` and paste the keys from
   `ios-Info.plist-additions.xml` inside the top-level `<dict>`.
2. **Android** — open `android/app/src/main/AndroidManifest.xml` and paste
   the `<uses-permission>` entries from `android-AndroidManifest.xml-additions.xml`
   inside `<manifest>` (above `<application>`).
3. Re-run `npx cap sync` after editing.

## Play Store Data Safety / App Store Privacy Nutrition

Declare collection of:
- **Email address** (auth) — linked to user, used for account & communications.
- **Photos** (avatars) — linked to user, optional, stored in Lovable Cloud.
- **Audio** (voice) — *not* stored; transcription happens on-device via the
  OS Speech Recognition API. Disclose "audio data" only as "processed but
  not collected".
- **Device identifiers** (push token) — for delivering notifications.
- **App activity / diagnostics** — household app usage for personalisation.

## Runtime prompts

All four sensitive permissions (mic, camera, photos, notifications) are
requested at the moment the user first taps the corresponding feature —
not on app launch. This is required by App Store review guideline 5.1.1.