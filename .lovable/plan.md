

# Update WhatsApp OTP Template Name

## Issue
The code uses template name `otp_verification` but the approved Meta template is named `otp_verification_new`.

## Fix
Update the `WHATSAPP_TEMPLATES` constant in the shared WhatsApp utilities file.

## Change Details

**File:** `supabase/functions/_shared/whatsapp.ts`

**Current (line 246):**
```typescript
OTP_VERIFICATION: "otp_verification",
```

**Updated:**
```typescript
OTP_VERIFICATION: "otp_verification_new",
```

## After the Fix
1. The edge function will be automatically redeployed
2. You can test the OTP flow again from Account Settings → Notifications tab
3. Enter your phone number and click "Send Verification Code"

## Expected Result
You should receive the OTP message on your WhatsApp within a few seconds.

