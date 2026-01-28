
# Comprehensive Email System Implementation Plan

## Overview

This plan implements **all email communication points** for Family Desk, organized into 4 phases by priority. The existing email template infrastructure and Resend integration will be leveraged.

---

## Phase 1: Access Request Emails (High Priority)

### 1.1 Request Confirmation Email
**Trigger**: When user submits access request form  
**Edge Function**: `send-access-request-confirmation`

Changes required:
- Create new edge function that sends confirmation email
- Modify `RequestAccess.tsx` to call the function after successful form submission
- Uses existing `getAccessRequestConfirmationContent()` template

### 1.2 Approval Notification Email  
**Trigger**: When admin approves request in AdminAccessRequests page  
**Edge Function**: `send-access-decision`

Changes required:
- Create edge function that handles both approval and rejection emails
- Modify `AdminAccessRequests.tsx` to call function after approve mutation succeeds
- Uses existing `getAccessApprovedContent()` template

### 1.3 Rejection Notification Email
**Trigger**: When admin rejects request  
**Uses**: Same `send-access-decision` edge function with rejection parameter  
- Uses existing `getAccessRejectedContent()` template

---

## Phase 2: Household Management Emails (High Priority)

### 2.1 Household Invitation Email
**Trigger**: When admin invites member via InviteMemberDialog  
**Edge Function**: `send-household-invitation`

Changes required:
- Create edge function that sends invitation with household details
- Modify `InviteMemberDialog.tsx` to call function after invitation created
- Uses existing `getHouseholdInvitationContent()` template
- Respects `user_email_preferences.household_invitations`

### 2.2 Join Request Notification (to Admin)
**Trigger**: When user requests to join household  
**Edge Function**: `send-join-request-notification`

Changes required:
- Create edge function that notifies household admins
- Add new email template `getJoinRequestNotificationContent()` (already exists)
- Query all admin members and send notification to each
- Respects admin's `user_email_preferences.household_invitations`

### 2.3 Invitation Response Notification
**Trigger**: When invited user accepts or declines  
**Edge Function**: `send-invitation-response`

New template needed:
```typescript
getInvitationResponseContent(
  memberName: string,
  action: 'accepted' | 'declined',
  householdName: string
)
```

---

## Phase 3: Task & Productivity Emails (Medium Priority)

### 3.1 Task Assignment Email
**Trigger**: When task is assigned to a member  
**Edge Function**: `send-task-notification`

Changes required:
- Create edge function for task-related notifications
- Modify task creation/update flows to detect assignment changes
- Respects `user_email_preferences.task_notifications`

New template needed:
```typescript
getTaskAssignmentContent(
  taskTitle: string,
  assignerName: string,
  dueDate?: string,
  taskUrl: string
)
```

### 3.2 Task Reminder Email (Cron-based)
**Trigger**: Daily cron job checks for tasks due tomorrow  
**Edge Function**: `send-task-reminders`

Changes required:
- Create edge function with cron scheduling
- Query tasks with due_date = tomorrow
- Group by assignee and send digest email
- Respects `user_email_preferences.task_notifications`

New template needed:
```typescript
getTaskReminderContent(
  tasks: Array<{title: string, dueDate: string}>,
  dashboardUrl: string
)
```

---

## Phase 4: Engagement & Summary Emails (Lower Priority)

### 4.1 Weekly Digest Email (Cron-based)
**Trigger**: Weekly cron job (e.g., Sunday evening)  
**Edge Function**: `send-weekly-digest`

Content includes:
- Tasks completed this week
- Upcoming tasks for next week
- Habit streak progress
- Meal plan preview
- Respects `user_email_preferences.weekly_digest`

### 4.2 Habit Streak Reminders (Cron-based)
**Trigger**: Daily cron for users with active habits  
**Edge Function**: `send-habit-reminders`

- Check for users who haven't logged habits today
- Send gentle reminder if streak is at risk
- Respects `user_email_preferences.habit_reminders`

### 4.3 Pantry Expiration Alerts (Cron-based)
**Trigger**: Daily check for expiring items  
**Edge Function**: `send-pantry-alerts`

- Query pantry_items with expiry_date within 3 days
- Send grouped alert to household members

### 4.4 Meal Plan Summary Email
**Trigger**: When weekly meal plan is generated  
**Edge Function**: `send-meal-plan-summary`

- Send formatted meal plan for the week
- Include shopping list summary
- Respects `user_email_preferences.meal_summaries`

---

## Technical Architecture

### New Edge Functions to Create

| Function Name | Type | Priority |
|--------------|------|----------|
| `send-access-request-confirmation` | On-demand | Phase 1 |
| `send-access-decision` | On-demand | Phase 1 |
| `send-household-invitation` | On-demand | Phase 2 |
| `send-join-request-notification` | On-demand | Phase 2 |
| `send-invitation-response` | On-demand | Phase 2 |
| `send-task-notification` | On-demand | Phase 3 |
| `send-task-reminders` | Cron (daily) | Phase 3 |
| `send-weekly-digest` | Cron (weekly) | Phase 4 |
| `send-habit-reminders` | Cron (daily) | Phase 4 |
| `send-pantry-alerts` | Cron (daily) | Phase 4 |
| `send-meal-plan-summary` | On-demand | Phase 4 |

### New Email Templates to Add

Add to `email-templates.ts`:
- `getInvitationResponseContent()`
- `getTaskAssignmentContent()`
- `getTaskReminderContent()`
- `getWeeklyDigestContent()`
- `getHabitReminderContent()`
- `getPantryAlertContent()`
- `getMealPlanSummaryContent()`

### Database Changes

Enable `pg_cron` and `pg_net` extensions for scheduled emails:
```sql
-- For cron-based email functions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Frontend Integration Points

| File | Change |
|------|--------|
| `RequestAccess.tsx` | Add email call after form submit |
| `AdminAccessRequests.tsx` | Add email calls to approve/reject mutations |
| `InviteMemberDialog.tsx` | Add email call after invitation insert |
| `useTasks.ts` | Detect assignment changes, trigger email |
| `useMealPlans.ts` | Trigger meal plan summary after generation |

---

## Implementation Order

**Week 1: Phase 1 (Access Requests)**
1. Create `send-access-request-confirmation` edge function
2. Create `send-access-decision` edge function  
3. Wire up `RequestAccess.tsx`
4. Wire up `AdminAccessRequests.tsx`

**Week 2: Phase 2 (Household Management)**
5. Create `send-household-invitation` edge function
6. Create `send-join-request-notification` edge function
7. Create `send-invitation-response` edge function
8. Wire up invitation flows

**Week 3: Phase 3 (Tasks)**
9. Create `send-task-notification` edge function
10. Create `send-task-reminders` cron function
11. Modify task creation/assignment flows

**Week 4: Phase 4 (Engagement)**
12. Create remaining cron-based functions
13. Create summary/digest email functions
14. Add remaining templates

---

## Email Preference Respect

All emails will check `user_email_preferences` before sending:
```typescript
// Example check in edge function
const { data: prefs } = await supabase
  .from('user_email_preferences')
  .select('task_notifications')
  .eq('user_id', userId)
  .single();

if (prefs?.task_notifications === false) {
  return; // User opted out
}
```

---

## Summary

- **11 new edge functions** to create
- **7 new email templates** to add
- **5 frontend files** to modify
- **Cron scheduling** needed for reminder/digest emails
- All emails respect user preferences
