
# Comprehensive User Guide, Privacy Policy & Terms Update

## Overview

This plan addresses three major areas:
1. **Feature-Specific User Guides** - Complete, per-feature onboarding tours that show only once per feature per user lifetime
2. **Privacy Policy Updates** - Add missing features (Habits, Taskmaster) and ensure completeness
3. **Terms of Service Updates** - Fix section numbering, add missing features

---

## Part 1: Feature-Specific User Guide System

### 1.1 Database Changes

Create a new column in the `profiles` table to track which feature tours have been completed:

```sql
ALTER TABLE profiles 
ADD COLUMN completed_tours JSONB DEFAULT '{}'::jsonb;
```

The JSONB structure will be:
```json
{
  "dashboard": true,
  "tasks": true,
  "meals": true,
  "grocery": false,
  "habits": false,
  "calendar": false,
  "taskmaster": false
}
```

### 1.2 New Hook: `useFeatureTour`

Create `src/hooks/useFeatureTour.ts`:

```typescript
// Manages feature-specific tour state
export const useFeatureTour = (featureName: string) => {
  // Fetches completed_tours from profiles
  // Returns { shouldShowTour, markTourComplete }
  // Only shows tour if user hasn't seen it before
};
```

### 1.3 Updated OnboardingTour Component

Modify `src/components/onboarding/OnboardingTour.tsx`:
- Accept `featureName` prop to identify which feature tour
- On completion, update only that feature in `completed_tours` JSONB
- Remove global `onboarding_completed` update

### 1.4 Complete Tour Steps for Each Feature

**Dashboard Tour** (`src/pages/Index.tsx`):
```typescript
const dashboardTourSteps: Step[] = [
  {
    target: "body",
    content: "Welcome to Family Desk! Your central hub for managing household activities.",
    placement: "center",
    disableBeacon: true,
  },
  {
    target: ".dashboard-overview",
    content: "This is your dashboard showing an overview of tasks, meals, calendar events, and pantry status.",
    placement: "bottom",
  },
  {
    target: ".tasks-card",
    content: "Quick view of pending tasks. Click to manage all your household tasks.",
    placement: "top",
  },
  {
    target: ".meals-card",
    content: "Today's meal plan at a glance. Get AI-powered meal suggestions.",
    placement: "top",
  },
  {
    target: ".grocery-card",
    content: "Track your pantry inventory and shopping lists.",
    placement: "top",
  },
  {
    target: ".calendar-card",
    content: "Upcoming events and deadlines from your connected calendars.",
    placement: "top",
  },
  {
    target: ".user-menu",
    content: "Access settings, household management, and this guide anytime from the menu.",
    placement: "bottom",
  },
];
```

**Tasks Tour** (`src/pages/Tasks.tsx`):
```typescript
const tasksTourSteps: Step[] = [
  {
    target: "body",
    content: "Welcome to Tasks! Manage household tasks for you and your family.",
    placement: "center",
    disableBeacon: true,
  },
  {
    target: "[data-tour='add-task-button']",
    content: "Click here to create a new task. You can set priority, due date, and assign to family members.",
    placement: "bottom",
  },
  {
    target: "[data-tour='task-filters']",
    content: "Filter tasks by status (pending, in progress, completed) or priority level.",
    placement: "bottom",
  },
  {
    target: "[data-tour='task-card']",
    content: "Each task card shows the title, priority, due date, and assignee. Click to edit or mark complete.",
    placement: "top",
  },
];
```

**Meals Tour** (`src/pages/Meals.tsx`):
```typescript
const mealsTourSteps: Step[] = [
  {
    target: "body",
    content: "Welcome to Meal Planning! Plan your weekly meals with AI-powered suggestions.",
    placement: "center",
    disableBeacon: true,
  },
  {
    target: "[data-tour='generate-full-week']",
    content: "Generate a complete week of meals based on your dietary preferences and family size.",
    placement: "bottom",
  },
  {
    target: "[data-tour='generate-remaining']",
    content: "Or just fill in the remaining days of the current week.",
    placement: "bottom",
  },
  {
    target: "[role='tablist']",
    content: "Switch between Calendar View to see your weekly plan, or All Recipes to browse your collection.",
    placement: "bottom",
  },
  {
    target: "[data-tour='week-navigator']",
    content: "Navigate between weeks to plan ahead or review past meals.",
    placement: "bottom",
  },
  {
    target: "[data-tour='meal-card']",
    content: "Click any meal to see the full recipe, rate it, or mark it as cooked to update your pantry.",
    placement: "top",
  },
];
```

**Grocery Tour** (`src/pages/Grocery.tsx`):
```typescript
const groceryTourSteps: Step[] = [
  {
    target: "body",
    content: "Welcome to Grocery Management! Track your pantry and shopping lists.",
    placement: "center",
    disableBeacon: true,
  },
  {
    target: "[data-tour='ai-import']",
    content: "Use AI to quickly import multiple pantry items by describing what you have.",
    placement: "bottom",
  },
  {
    target: "[data-tour='quick-add']",
    content: "Quick add common Indian pantry staples with one click.",
    placement: "bottom",
  },
  {
    target: "[role='tablist']",
    content: "Switch between Pantry to manage inventory, Shopping Lists for upcoming purchases, and Insights for usage analytics.",
    placement: "bottom",
  },
  {
    target: "[data-tour='category-grid']",
    content: "Browse items by category. Low stock and expiring items are highlighted.",
    placement: "top",
  },
];
```

**Habits Tour** (`src/pages/Habits.tsx`):
```typescript
const habitsTourSteps: Step[] = [
  {
    target: "body",
    content: "Welcome to Habits! Build healthy routines for you and your family.",
    placement: "center",
    disableBeacon: true,
  },
  {
    target: "[data-tour='view-toggle']",
    content: "Switch between your personal habits and household-wide progress.",
    placement: "bottom",
  },
  {
    target: "[data-tour='progress-summary']",
    content: "Track your daily progress and completion rate.",
    placement: "bottom",
  },
  {
    target: "[data-tour='habit-card']",
    content: "Check off habits as you complete them. Track streaks and consistency.",
    placement: "top",
  },
  {
    target: "[data-tour='create-habit']",
    content: "Create personal or household habits with reminders and target values.",
    placement: "top",
  },
];
```

**Calendar Tour** (`src/pages/Calendar.tsx`):
```typescript
const calendarTourSteps: Step[] = [
  {
    target: "body",
    content: "Welcome to Calendar! View and manage all your events in one place.",
    placement: "center",
    disableBeacon: true,
  },
  {
    target: "[data-tour='connect-calendar']",
    content: "Connect your Google Calendar to sync events automatically.",
    placement: "bottom",
  },
  {
    target: "[data-tour='calendar-nav']",
    content: "Navigate between months and return to today.",
    placement: "bottom",
  },
  {
    target: "[data-tour='calendar-grid']",
    content: "Click any event to see details. Tasks, meals, and external calendar events are color-coded.",
    placement: "center",
  },
];
```

### 1.5 Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useFeatureTour.ts` | NEW - Hook for managing feature-specific tours |
| `src/components/onboarding/OnboardingTour.tsx` | Accept featureName, update per-feature completion |
| `src/pages/Index.tsx` | Add complete dashboard tour steps with data-tour attributes |
| `src/pages/Tasks.tsx` | Expand tour steps, add data-tour attributes |
| `src/pages/Meals.tsx` | Expand tour steps, add data-tour attributes |
| `src/pages/Grocery.tsx` | Complete tour steps, add data-tour attributes |
| `src/pages/Habits.tsx` | Add full tour implementation |
| `src/pages/Calendar.tsx` | Add full tour implementation |
| Database migration | Add `completed_tours` JSONB column |

---

## Part 2: Privacy Policy Updates

### 2.1 Add Habits Feature Section

Add new section after "4. AI-Powered Features":

```
### 4.5 Habit Tracking

When you use our Habits feature:
- Personal habit data (name, frequency, completion status) is stored securely
- Household habits are visible to all household members
- Habit streaks and completion history are tracked to provide insights
- AI coach suggestions are generated based on your habit patterns
- Habit data is used to create leaderboards and progress reports
- You can delete individual habits and their history at any time
```

### 2.2 Add Taskmaster Feature Section

Add section covering project management:

```
### 4.6 Taskmaster Project Management

When you use the Taskmaster feature:
- Project names, descriptions, and status are stored
- Tasks within projects are associated with your household
- Natural language input is processed to extract task details
- Project data is shared with household members
```

### 2.3 Update Section 2 (Information We Collect)

Add to 2.2 Usage Information:
```
- Habit creation, completion logs, and streaks
- Project and advanced task management data
```

### 2.4 Fix "Last Updated" to Static Date

Change from dynamic date to static:
```typescript
// From:
<p>Last Updated: {new Date().toLocaleDateString('en-IN')}</p>

// To:
<p>Last Updated: February 3, 2026</p>
```

---

## Part 3: Terms of Service Updates

### 3.1 Fix Section Numbering

Current: Section 7 appears twice (Household Sharing Features and Intellectual Property)

Fix numbering:
- Section 7: Household Sharing Features
- Section 8: Intellectual Property
- Section 9: Limitation of Liability
- Section 10: Compliance with Indian Laws (currently 10)
- Section 11: Third-Party Services (currently 11)
- ...continue renumbering

### 3.2 Add Habits Section

Add to Section 5 (Data Usage and AI Features):

```
### 5.7 Habit Tracking Features

When using the Habits feature:
- Personal habits are visible only to you unless marked as household habits
- Household habits and completion data are visible to all household members
- Leaderboards show relative performance of household members
- AI coach suggestions are based on your habit patterns and may not be personalized medical advice
- Habit streaks reset if you miss a scheduled day
```

### 3.3 Add Taskmaster Section

Add to Section 5:

```
### 5.8 Taskmaster Project Management

The Taskmaster feature provides advanced project management:
- Projects and tasks are visible to all household members
- AI parsing of task inputs may not always be accurate; verify extracted details
- Project completion status is tracked and stored
```

### 3.4 Fix "Last Updated" to Static Date

Same as Privacy Policy - use static date.

---

## Part 4: Files Summary

### New Files
| File | Purpose |
|------|---------|
| `src/hooks/useFeatureTour.ts` | Hook for per-feature tour management |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/onboarding/OnboardingTour.tsx` | Feature-specific completion tracking |
| `src/pages/Index.tsx` | Complete dashboard tour, data-tour attributes |
| `src/pages/Tasks.tsx` | Complete tasks tour, data-tour attributes |
| `src/pages/Meals.tsx` | Complete meals tour, data-tour attributes |
| `src/pages/Grocery.tsx` | Complete grocery tour, data-tour attributes |
| `src/pages/Habits.tsx` | Add full Habits tour |
| `src/pages/Calendar.tsx` | Add full Calendar tour |
| `src/pages/PrivacyPolicy.tsx` | Add Habits & Taskmaster sections, fix date |
| `src/pages/TermsOfService.tsx` | Fix numbering, add Habits & Taskmaster, fix date |

### Database Migration
```sql
-- Add completed_tours column for per-feature tour tracking
ALTER TABLE profiles 
ADD COLUMN completed_tours JSONB DEFAULT '{}'::jsonb;

-- Comment for documentation
COMMENT ON COLUMN profiles.completed_tours IS 
  'Tracks which feature tours the user has completed. Keys: dashboard, tasks, meals, grocery, habits, calendar, taskmaster';
```

---

## Part 5: Future Maintenance Process

To keep these documents updated with each feature release:

1. **New Feature Checklist**:
   - Add tour steps for the new feature page
   - Add entry to `completed_tours` JSONB schema
   - Update Privacy Policy with data collection/usage
   - Update Terms of Service with feature terms
   - Update "Last Updated" date

2. **Version Control**:
   - Store policy versions with dates
   - Consider a changelog section for major policy changes

3. **Review Triggers**:
   - Any new AI-powered feature
   - Any new third-party integration
   - Any change to data collection/storage
   - Any new sharing/collaboration feature

---

## Expected Outcomes

1. **Per-Feature Tours**: Users see each feature tour only once, ever
2. **Complete Guides**: Each feature has comprehensive onboarding
3. **Legal Compliance**: Privacy Policy and Terms cover all features
4. **Maintainability**: Clear process for keeping documents updated
5. **User Experience**: Non-intrusive tours that add value
