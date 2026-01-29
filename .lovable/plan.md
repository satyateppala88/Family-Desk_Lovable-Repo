

# WhatsApp P0 Implementation Plan

## Executive Summary

This plan implements WhatsApp as an **additional notification channel** alongside email, with phone number verification via OTP. Users will be able to receive notifications on both WhatsApp AND email for each notification type.

### P0 Features
1. **Phone Verification via OTP** - Secure phone number verification
2. **Task Assignment Notifications** - Instant WhatsApp alerts when tasks are assigned
3. **Daily Plan Summaries** - Morning AI-generated task priorities via WhatsApp
4. **Expiring Item Alerts** - Pantry expiration warnings via WhatsApp

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                     FAMILY DESK APP                              │
├─────────────────────────────────────────────────────────────────┤
│  Account Settings Page                                           │
│  ┌──────────────────┐  ┌───────────────────────────────────┐   │
│  │ Phone Number     │  │ Notification Preferences          │   │
│  │ +91 9876543210   │  │ ┌─────────────┬─────────┬───────┐ │   │
│  │ [✓ Verified]     │  │ │ Type        │ Email   │ WA    │ │   │
│  │                  │  │ ├─────────────┼─────────┼───────┤ │   │
│  │ [Change Number]  │  │ │ Tasks       │ ✓       │ ✓     │ │   │
│  │                  │  │ │ Daily Plan  │ ✓       │ ✓     │ │   │
│  └──────────────────┘  │ │ Pantry      │ ✓       │ ✓     │ │   │
│                        │ │ Habits      │ ✓       │ □     │ │   │
│                        │ └─────────────┴─────────┴───────┘ │   │
│                        └───────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EDGE FUNCTIONS                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────┐  ┌────────────────────────────────┐    │
│  │ whatsapp-send-otp  │  │ whatsapp-verify-otp            │    │
│  │ Send 6-digit OTP   │  │ Validate & mark verified       │    │
│  └────────────────────┘  └────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────┐  ┌────────────────────────────────┐    │
│  │ whatsapp-notify    │  │ send-task-notification         │    │
│  │ Generic WA sender  │  │ (Enhanced: Email + WA)         │    │
│  └────────────────────┘  └────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────┐  ┌────────────────────────────────┐    │
│  │ send-daily-plan-wa │  │ send-pantry-alerts             │    │
│  │ Morning summary    │  │ (Enhanced: Email + WA)         │    │
│  └────────────────────┘  └────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 WHATSAPP CLOUD API                               │
│  ─────────────────────────────────────────────────────────────  │
│  • Template Messages (pre-approved)                              │
│  • Session Messages (24h window after user interaction)         │
│  • Webhook for delivery receipts                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Changes

### 1. Update `profiles` Table

Add phone number and verification fields:

```sql
ALTER TABLE profiles
ADD COLUMN phone_number VARCHAR(20),
ADD COLUMN phone_verified BOOLEAN DEFAULT false,
ADD COLUMN phone_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN whatsapp_opted_in BOOLEAN DEFAULT false;
```

### 2. Create `phone_verification_tokens` Table

Store OTP tokens for verification:

```sql
CREATE TABLE phone_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  token VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE phone_verification_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tokens"
ON phone_verification_tokens FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Service role can manage tokens"
ON phone_verification_tokens FOR ALL
TO service_role
USING (true) WITH CHECK (true);
```

### 3. Update `user_email_preferences` to `notification_preferences`

Rename and extend to support channel selection:

```sql
-- Add WhatsApp preference columns
ALTER TABLE user_email_preferences
ADD COLUMN task_notifications_whatsapp BOOLEAN DEFAULT false,
ADD COLUMN daily_plan_whatsapp BOOLEAN DEFAULT false,
ADD COLUMN pantry_alerts_whatsapp BOOLEAN DEFAULT false,
ADD COLUMN habit_reminders_whatsapp BOOLEAN DEFAULT false,
ADD COLUMN household_invitations_whatsapp BOOLEAN DEFAULT false,
ADD COLUMN weekly_digest_whatsapp BOOLEAN DEFAULT false;
```

---

## Edge Functions

### 1. `whatsapp-send-otp` (NEW)

Sends a 6-digit OTP to the user's WhatsApp number.

**Flow:**
1. Validate phone number format
2. Generate 6-digit OTP
3. Store in `phone_verification_tokens`
4. Send via WhatsApp Cloud API template message
5. Return success/failure

**Template Message (to be registered in Meta Business):**
```
🔐 Your Family Desk verification code is: {{1}}

This code expires in 10 minutes. Do not share this code with anyone.
```

### 2. `whatsapp-verify-otp` (NEW)

Validates the OTP and marks phone as verified.

**Flow:**
1. Accept phone number + OTP
2. Look up token in `phone_verification_tokens`
3. Verify not expired and not used
4. Mark token as used
5. Update `profiles.phone_verified = true`
6. Return success

### 3. `whatsapp-notify` (NEW)

Generic WhatsApp message sender using Cloud API.

**Parameters:**
- `phoneNumber`: Target phone number
- `templateName`: Registered template name
- `templateParams`: Array of dynamic values

**Supported Templates (to register in Meta):**
- `task_assigned` - New task notification
- `daily_plan` - Morning plan summary
- `pantry_expiry` - Items expiring soon
- `otp_verification` - OTP code

### 4. `send-task-notification` (ENHANCE)

Add WhatsApp delivery alongside email:

```typescript
// After email sending logic...

// Check WhatsApp preferences
const { data: profile } = await supabaseAdmin
  .from("profiles")
  .select("phone_number, phone_verified, whatsapp_opted_in")
  .eq("id", assigneeId)
  .single();

const { data: waPrefs } = await supabaseAdmin
  .from("user_email_preferences")
  .select("task_notifications_whatsapp")
  .eq("user_id", assigneeId)
  .single();

if (profile?.phone_verified && 
    profile?.whatsapp_opted_in && 
    waPrefs?.task_notifications_whatsapp) {
  // Send WhatsApp notification
  await sendWhatsAppTemplate(
    profile.phone_number,
    "task_assigned",
    [taskTitle, assignerName, formattedDueDate || "No due date"]
  );
}
```

### 5. `send-daily-plan-whatsapp` (NEW)

Send morning daily plan summary via WhatsApp.

**Trigger:** Scheduled cron job at 7:00 AM IST

**Message Format:**
```
🌅 Good morning, {name}!

Here's your plan for today:

1. ⚡ {task1} - {reasoning1}
2. 📋 {task2} - {reasoning2}
3. 📋 {task3} - {reasoning3}

📅 {calendar_summary}

Tap to view full plan: {link}
```

### 6. `send-pantry-alerts` (ENHANCE)

Add WhatsApp delivery for expiring items:

**Message Format:**
```
🥫 Pantry Alert!

{count} items expiring soon:
• {item1} - expires {date1}
• {item2} - expires {date2}
• {item3} - expires {date3}

Plan meals around these to reduce waste!
View pantry: {link}
```

---

## Frontend Components

### 1. Phone Verification Component

**File:** `src/components/settings/PhoneVerificationSection.tsx`

Features:
- Phone number input with country code dropdown
- "Send OTP" button
- 6-digit OTP input (using existing InputOTP component)
- Resend timer (60 seconds)
- Verification success state

### 2. Notification Preferences Grid

**File:** `src/components/settings/NotificationPreferencesSection.tsx`

Features:
- Grid layout: Notification Type | Email | WhatsApp
- WhatsApp toggles disabled until phone verified
- Tooltip explaining why disabled
- Visual indicator when both channels enabled

### 3. Account Settings Updates

**File:** `src/pages/AccountSettings.tsx`

Add two new sections:
1. Phone Verification Section
2. Notification Channel Preferences

---

## WhatsApp Template Messages

These templates must be registered with Meta Business Manager:

| Template Name | Purpose | Variables |
|--------------|---------|-----------|
| `otp_verification` | Phone verification | `{{1}}` = OTP code |
| `task_assigned` | Task assignment | `{{1}}` = task title, `{{2}}` = assigner, `{{3}}` = due date |
| `daily_plan_summary` | Morning summary | `{{1}}` = name, `{{2}}` = task list, `{{3}}` = link |
| `pantry_expiry_alert` | Expiring items | `{{1}}` = count, `{{2}}` = items list, `{{3}}` = link |

---

## Required Secrets

The following secrets need to be configured:

| Secret Name | Description |
|-------------|-------------|
| `WHATSAPP_PHONE_NUMBER_ID` | Your WhatsApp Business phone number ID |
| `WHATSAPP_ACCESS_TOKEN` | Meta Graph API access token |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Your WhatsApp Business Account ID |

---

## Implementation Steps

### Phase 1: Database & Infrastructure (Day 1)
1. Create database migration for new columns and tables
2. Create `whatsapp-notify` base edge function
3. Add secrets for WhatsApp Cloud API
4. Create shared WhatsApp utility functions

### Phase 2: Phone Verification (Day 2)
1. Create `whatsapp-send-otp` edge function
2. Create `whatsapp-verify-otp` edge function
3. Build `PhoneVerificationSection` component
4. Integrate into Account Settings page
5. Test full OTP flow

### Phase 3: Task Notifications (Day 3)
1. Update `send-task-notification` to support WhatsApp
2. Build `NotificationPreferencesSection` component
3. Create hook for notification preferences
4. Test task assignment with WhatsApp enabled

### Phase 4: Daily Plan & Pantry Alerts (Day 4)
1. Create `send-daily-plan-whatsapp` edge function
2. Update `send-pantry-alerts` for WhatsApp
3. Set up cron jobs for scheduled messages
4. Test all notification types

### Phase 5: Testing & Polish (Day 5)
1. End-to-end testing of all flows
2. Error handling improvements
3. Rate limiting implementation
4. Documentation updates

---

## Files to Create

| File | Type | Purpose |
|------|------|---------|
| `supabase/functions/whatsapp-notify/index.ts` | Edge Function | Generic WhatsApp sender |
| `supabase/functions/whatsapp-send-otp/index.ts` | Edge Function | OTP sending |
| `supabase/functions/whatsapp-verify-otp/index.ts` | Edge Function | OTP verification |
| `supabase/functions/send-daily-plan-whatsapp/index.ts` | Edge Function | Daily plan via WA |
| `supabase/functions/_shared/whatsapp-templates.ts` | Shared | Template message helpers |
| `src/components/settings/PhoneVerificationSection.tsx` | Component | Phone verification UI |
| `src/components/settings/NotificationPreferencesSection.tsx` | Component | Channel preferences |
| `src/hooks/useNotificationPreferences.ts` | Hook | Preferences management |
| `src/hooks/usePhoneVerification.ts` | Hook | OTP flow management |

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/send-task-notification/index.ts` | Add WhatsApp channel |
| `supabase/functions/send-pantry-alerts/index.ts` | Add WhatsApp channel |
| `src/pages/AccountSettings.tsx` | Add new sections |
| `supabase/config.toml` | Register new functions |

---

## Security Considerations

1. **OTP Rate Limiting**: Max 3 OTP requests per phone number per hour
2. **Token Expiry**: OTPs expire after 10 minutes
3. **Single Use**: Tokens marked as used after verification
4. **Phone Format Validation**: Server-side validation with libphonenumber
5. **WhatsApp Opt-in**: Explicit opt-in required per notification type

---

## What I Need From You

Before I start implementation, please:

1. **WhatsApp Business Setup**: Provide the following from your Meta Business Manager:
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_BUSINESS_ACCOUNT_ID`

2. **Template Approval**: Register the 4 template messages listed above in Meta Business Manager (I can provide exact copy for each)

3. **Confirmation**: Confirm you're ready to proceed with implementation

