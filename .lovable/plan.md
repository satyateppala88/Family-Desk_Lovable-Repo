# Comprehensive Email System Implementation Plan

## Overview

This plan implements **all email communication points** for Family Desk, organized into 4 phases by priority. The existing email template infrastructure and Resend integration will be leveraged.

---

## ✅ ALL PHASES COMPLETED

---

## Phase 1: Access Request Emails (High Priority) ✅ COMPLETED

### 1.1 Request Confirmation Email ✅
**Trigger**: When user submits access request form  
**Edge Function**: `send-access-request-confirmation`

- ✅ Created edge function
- ✅ Modified `RequestAccess.tsx` to call function after form submit
- ✅ Uses existing `getAccessRequestConfirmationContent()` template

### 1.2 Approval Notification Email ✅
**Trigger**: When admin approves request in AdminAccessRequests page  
**Edge Function**: `send-access-decision`

- ✅ Created edge function handling both approval and rejection
- ✅ Modified `AdminAccessRequests.tsx` to call function after approve/reject
- ✅ Uses existing `getAccessApprovedContent()` template

### 1.3 Rejection Notification Email ✅
**Trigger**: When admin rejects request  
- ✅ Same `send-access-decision` edge function with rejection parameter  
- ✅ Uses existing `getAccessRejectedContent()` template

---

## Phase 2: Household Management Emails (High Priority) ✅ COMPLETED

### 2.1 Household Invitation Email ✅
**Trigger**: When admin invites member via InviteMemberDialog  
**Edge Function**: `send-household-invitation`

- ✅ Created edge function with household details
- ✅ Modified `InviteMemberDialog.tsx` to call function after invitation created
- ✅ Uses existing `getHouseholdInvitationContent()` template
- ✅ Respects `user_email_preferences.household_invitations`

### 2.2 Join Request Notification (to Admin) ✅
**Trigger**: When user requests to join household  
**Edge Function**: `send-join-request-notification`

- ✅ Created edge function that notifies household admins
- ✅ Uses existing `getJoinRequestNotificationContent()` template
- ✅ Queries all admin members and sends notification to each
- ✅ Respects admin's `user_email_preferences.household_invitations`

### 2.3 Invitation Response Notification ✅
**Trigger**: When invited user accepts or declines  
**Edge Function**: `send-invitation-response`

- ✅ Created edge function
- ✅ Added `getInvitationResponseContent()` template
- ✅ Modified `PendingInvitationBanner.tsx` to call function on accept/decline

---

## Phase 3: Task & Productivity Emails (Medium Priority) ✅ COMPLETED

### 3.1 Task Assignment Email ✅
**Trigger**: When task is assigned to a member  
**Edge Function**: `send-task-notification`

- ✅ Created edge function for task-related notifications
- ✅ Modified `useTasks.ts` to detect assignment changes and trigger email
- ✅ Respects `user_email_preferences.task_notifications`
- ✅ Added `getTaskAssignmentContent()` template

### 3.2 Task Reminder Email (Cron-based) ✅
**Trigger**: Daily cron job checks for tasks due tomorrow  
**Edge Function**: `send-task-reminders`

- ✅ Created edge function (ready for cron scheduling via pg_cron)
- ✅ Queries tasks with due_date = tomorrow
- ✅ Groups by assignee and sends digest email
- ✅ Respects `user_email_preferences.task_notifications`
- ✅ Added `getTaskReminderContent()` template

---

## Phase 4: Engagement & Summary Emails (Lower Priority) ✅ COMPLETED

### 4.1 Weekly Digest Email (Cron-based) ✅
**Trigger**: Weekly cron job (e.g., Sunday evening)  
**Edge Function**: `send-weekly-digest`

- ✅ Created edge function
- ✅ Includes tasks completed, upcoming tasks, habit streaks, meals planned
- ✅ Respects `user_email_preferences.weekly_digest`
- ✅ Added `getWeeklyDigestContent()` template

### 4.2 Habit Streak Reminders (Cron-based) ✅
**Trigger**: Daily cron for users with active habits  
**Edge Function**: `send-habit-reminders`

- ✅ Created edge function
- ✅ Checks for users who haven't logged habits today
- ✅ Sends streak warning if streak >= 3 days is at risk
- ✅ Respects `user_email_preferences.habit_reminders`
- ✅ Added `getHabitReminderContent()` and `getStreakWarningContent()` templates

### 4.3 Pantry Expiration Alerts (Cron-based) ✅
**Trigger**: Daily check for expiring items  
**Edge Function**: `send-pantry-alerts`

- ✅ Created edge function
- ✅ Queries pantry_items with expiry_date within 3 days
- ✅ Sends grouped alert to household members
- ✅ Added `getPantryAlertContent()` template

### 4.4 Meal Plan Summary Email ✅
**Trigger**: When weekly meal plan is generated  
**Edge Function**: `send-meal-plan-summary`

- ✅ Created edge function
- ✅ Sends formatted meal plan for the week
- ✅ Modified `useMealPlans.ts` to trigger after meal plan creation
- ✅ Respects `user_email_preferences.meal_summaries`
- ✅ Added `getMealPlanSummaryContent()` template

---

## Technical Architecture Summary

### Edge Functions Created (11 total)

| Function Name | Type | Status |
|--------------|------|--------|
| `send-access-request-confirmation` | On-demand | ✅ Deployed |
| `send-access-decision` | On-demand | ✅ Deployed |
| `send-household-invitation` | On-demand | ✅ Deployed |
| `send-join-request-notification` | On-demand | ✅ Deployed |
| `send-invitation-response` | On-demand | ✅ Deployed |
| `send-task-notification` | On-demand | ✅ Deployed |
| `send-task-reminders` | Cron (daily) | ✅ Deployed |
| `send-weekly-digest` | Cron (weekly) | ✅ Deployed |
| `send-habit-reminders` | Cron (daily) | ✅ Deployed |
| `send-pantry-alerts` | Cron (daily) | ✅ Deployed |
| `send-meal-plan-summary` | On-demand | ✅ Deployed |

### Email Templates Added (8 total)

All templates in `supabase/functions/_shared/email-templates.ts`:
- ✅ `getInvitationResponseContent()`
- ✅ `getTaskAssignmentContent()`
- ✅ `getTaskReminderContent()`
- ✅ `getWeeklyDigestContent()`
- ✅ `getHabitReminderContent()`
- ✅ `getStreakWarningContent()`
- ✅ `getPantryAlertContent()`
- ✅ `getMealPlanSummaryContent()`

### Frontend Integration Points Modified (5 files)

| File | Change | Status |
|------|--------|--------|
| `RequestAccess.tsx` | Email call after form submit | ✅ Done |
| `AdminAccessRequests.tsx` | Email calls on approve/reject | ✅ Done |
| `InviteMemberDialog.tsx` | Email call after invitation | ✅ Done |
| `PendingInvitationBanner.tsx` | Email on accept/decline | ✅ Done |
| `useTasks.ts` | Task assignment email trigger | ✅ Done |
| `useMealPlans.ts` | Meal plan summary email | ✅ Done |

---

## Cron Scheduling (Next Step)

To enable scheduled emails, run these SQL commands to set up pg_cron jobs:

```sql
-- Daily task reminders (8 AM)
SELECT cron.schedule(
  'daily-task-reminders',
  '0 8 * * *',
  $$SELECT net.http_post(
    url:='https://ekihgsdoscvgbgqhazru.supabase.co/functions/v1/send-task-reminders',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  )$$
);

-- Daily habit reminders (9 AM)
SELECT cron.schedule(
  'daily-habit-reminders',
  '0 9 * * *',
  $$SELECT net.http_post(
    url:='https://ekihgsdoscvgbgqhazru.supabase.co/functions/v1/send-habit-reminders',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  )$$
);

-- Daily pantry alerts (10 AM)
SELECT cron.schedule(
  'daily-pantry-alerts',
  '0 10 * * *',
  $$SELECT net.http_post(
    url:='https://ekihgsdoscvgbgqhazru.supabase.co/functions/v1/send-pantry-alerts',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  )$$
);

-- Weekly digest (Sunday 6 PM)
SELECT cron.schedule(
  'weekly-digest',
  '0 18 * * 0',
  $$SELECT net.http_post(
    url:='https://ekihgsdoscvgbgqhazru.supabase.co/functions/v1/send-weekly-digest',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  )$$
);
```

---

## Email Preference Respect

All emails check `user_email_preferences` before sending:
```typescript
const { data: prefs } = await supabase
  .from('user_email_preferences')
  .select('task_notifications')
  .eq('user_id', userId)
  .maybeSingle();

if (prefs?.task_notifications === false) {
  return; // User opted out
}
```
