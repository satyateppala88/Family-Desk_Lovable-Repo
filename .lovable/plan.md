## Replace todaysHabits filter in `src/hooks/useHabits.ts`

Replace lines 136–146 with the new filter that properly respects weekly habit configuration.

```ts
const todaysHabits = habitsWithStreaks.filter((habit) => {
  const todayDayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon, ...

  if (habit.frequency_type === 'daily') return true;

  if (habit.frequency_type === 'specific_days') {
    return habit.frequency_days.includes(todayDayOfWeek);
  }

  if (habit.frequency_type === 'weekly') {
    // If user configured specific days, respect them; otherwise default to Monday.
    if (habit.frequency_days && habit.frequency_days.length > 0) {
      return habit.frequency_days.includes(todayDayOfWeek);
    }
    return todayDayOfWeek === 1;
  }

  return true;
});
```

Behavior change: weekly habits no longer show every day; they show on configured days, defaulting to Monday. No other changes.