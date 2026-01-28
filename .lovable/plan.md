
# Development Test Mode Implementation Plan

## Overview

This plan creates a **development-only test mode** that allows full platform testing without authentication barriers. The solution includes:
1. A pre-seeded test user with complete data
2. Auto-login mechanism for development
3. Edge function test mode bypass
4. Visual indicator when test mode is active

---

## Security Considerations

**Critical**: This feature will ONLY work in development mode. Multiple safeguards will be implemented:
- Environment variable checks (`import.meta.env.DEV`)
- Edge function environment checks (`ENVIRONMENT !== 'production'`)
- Test user flagged in database for easy identification
- Clear visual indicators when test mode is active

---

## Implementation Steps

### Step 1: Create Test User Seed Edge Function

**File**: `supabase/functions/dev-seed-test-user/index.ts`

Creates a complete test user with:
- Pre-approved access request
- Verified email
- Household with sample data
- All preferences configured

```text
+------------------------+
|  Test User Creation    |
+------------------------+
         |
         v
+------------------------+
| 1. Create auth user    |
|    with verified email |
+------------------------+
         |
         v
+------------------------+
| 2. Create profile      |
+------------------------+
         |
         v
+------------------------+
| 3. Create household    |
|    "Test Household"    |
+------------------------+
         |
         v
+------------------------+
| 4. Add household       |
|    member (admin)      |
+------------------------+
         |
         v
+------------------------+
| 5. Seed sample data:   |
|    - Tasks (5)         |
|    - Recipes (3)       |
|    - Pantry items (10) |
|    - Habits (3)        |
|    - Preferences       |
+------------------------+
```

Test User Credentials:
- Email: `testuser@familydesk.dev`
- Password: `TestUser123!`
- Display Name: "Test User"

### Step 2: Create Dev Auth Bypass Hook

**File**: `src/hooks/useDevAuth.ts`

A custom hook that handles development authentication:
- Detects dev environment
- Auto-logs in test user on mount (optional)
- Provides manual login function
- Stores dev mode state

```typescript
// Key functionality
export const useDevAuth = () => {
  const [isDevMode, setIsDevMode] = useState(false);
  
  const loginAsTestUser = async () => {
    if (!import.meta.env.DEV) return;
    
    await supabase.auth.signInWithPassword({
      email: 'testuser@familydesk.dev',
      password: 'TestUser123!'
    });
    setIsDevMode(true);
  };
  
  return { isDevMode, loginAsTestUser };
};
```

### Step 3: Create Dev Mode Banner Component

**File**: `src/components/development/DevModeBanner.tsx`

A prominent banner showing when test mode is active:
- Displays test user info
- Quick links to all major pages
- Reset test data button
- Switch to real user option

Visual design:
```text
+----------------------------------------------------------+
| 🧪 DEV MODE ACTIVE | User: testuser@familydesk.dev       |
|    [Dashboard] [Tasks] [Meals] [Grocery] [Reset Data]    |
+----------------------------------------------------------+
```

### Step 4: Add Dev Login Button to Auth Page

**File**: `src/pages/Auth.tsx` (modification)

Add a development-only quick login button:

```typescript
// Only visible in development
{import.meta.env.DEV && (
  <Card className="mt-4 border-purple-300 bg-purple-50">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-purple-900">Dev Mode</h3>
          <p className="text-sm text-purple-700">Quick login as test user</p>
        </div>
        <Button onClick={loginAsTestUser} variant="outline">
          🧪 Login as Test User
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

### Step 5: Edge Function Test Mode Support

**Modify**: `supabase/functions/_shared/cors.ts`

Add a shared utility for test mode detection:

```typescript
export const isTestMode = (req: Request): boolean => {
  const isDev = Deno.env.get('ENVIRONMENT') !== 'production';
  const testHeader = req.headers.get('X-Dev-Test-Mode');
  return isDev && testHeader === 'true';
};

export const getTestUserId = (): string => {
  // Return consistent test user ID for development
  return Deno.env.get('DEV_TEST_USER_ID') || '';
};
```

**Modify**: Edge functions to support test bypass

Example modification for `ai-chat/index.ts`:
```typescript
// At the start of the handler
if (isTestMode(req)) {
  // Skip JWT validation, use test user ID
  const userId = getTestUserId();
  const householdId = getTestHouseholdId();
  // Continue with rest of function
}
```

### Step 6: Create Reset Test Data Function

**File**: `supabase/functions/dev-reset-test-data/index.ts`

Allows resetting test user data without deleting the user:
- Clears tasks, habits, pantry items
- Re-seeds with fresh sample data
- Keeps user account intact

### Step 7: Add DevMode Context Provider

**File**: `src/contexts/DevModeContext.tsx`

Global context for dev mode state:

```typescript
interface DevModeContextType {
  isDevMode: boolean;
  testUserId: string | null;
  testHouseholdId: string | null;
  enableDevMode: () => Promise<void>;
  disableDevMode: () => void;
  resetTestData: () => Promise<void>;
}
```

### Step 8: Integrate with App.tsx

**Modify**: `src/App.tsx`

Wrap application with DevModeProvider:

```typescript
<QueryClientProvider client={queryClient}>
  <DevModeProvider>
    <AuthProvider>
      {/* DevModeBanner renders conditionally */}
      <DevModeBanner />
      <Routes>...</Routes>
    </AuthProvider>
  </DevModeProvider>
</QueryClientProvider>
```

---

## Database Changes

### Add Dev Test User Flag to Profiles

No schema change needed - we'll use a specific email domain (`@familydesk.dev`) to identify test users.

### Environment Variables

Add to Supabase secrets (for edge functions):
- `DEV_TEST_USER_ID` - UUID of the seeded test user
- `DEV_TEST_HOUSEHOLD_ID` - UUID of the test household

---

## Sample Test Data to Seed

### Tasks (5)
1. "Weekly grocery shopping" - due tomorrow, medium priority
2. "Pay electricity bill" - due in 3 days, high priority
3. "Schedule dentist appointment" - no due date, low priority
4. "Clean out garage" - overdue, low priority
5. "Plan birthday party" - due in 1 week, high priority

### Recipes (3)
1. "Dal Tadka" - North Indian, vegetarian
2. "Chicken Biryani" - South Indian, non-veg
3. "Palak Paneer" - North Indian, vegetarian

### Pantry Items (10)
- Rice (5 kg), Wheat flour (2 kg), Sugar (1 kg)
- Milk (2 L), Yogurt (500g) - expiring in 3 days
- Onions (2 kg), Tomatoes (1 kg), Potatoes (3 kg)
- Cooking oil (2 L), Spices variety pack

### Habits (3)
1. "Morning meditation" - daily, 10 min target
2. "Evening walk" - daily, 30 min target
3. "Read a book" - 3x per week, 20 min target

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/dev-seed-test-user/index.ts` | Create | Seed test user with data |
| `supabase/functions/dev-reset-test-data/index.ts` | Create | Reset test data |
| `src/hooks/useDevAuth.ts` | Create | Dev authentication hook |
| `src/contexts/DevModeContext.tsx` | Create | Dev mode state management |
| `src/components/development/DevModeBanner.tsx` | Create | Dev mode UI indicator |
| `src/pages/Auth.tsx` | Modify | Add dev login button |
| `src/App.tsx` | Modify | Add DevModeProvider |
| `supabase/functions/_shared/cors.ts` | Modify | Add test mode utilities |
| `supabase/config.toml` | Modify | Register new functions |

---

## Testing Workflow After Implementation

1. **Initial Setup**: Run `dev-seed-test-user` once to create the test user
2. **Quick Login**: Click "Login as Test User" button on Auth page
3. **Full Access**: Navigate to any protected page with full data
4. **Reset Anytime**: Click "Reset Data" to get fresh test data
5. **Test Chatbot**: AI chatbot will work with test household context

---

## Usage Notes

**For Lovable AI Testing**:
- Open browser, navigate to Auth page
- Click "Login as Test User" button
- Full platform access is now available
- Use "Reset Data" before each test session for consistent state

**Security Reminders**:
- All dev features check `import.meta.env.DEV`
- Edge functions check `ENVIRONMENT` env var
- Test user email uses `.dev` domain for easy identification
- Never deploy with test mode enabled
