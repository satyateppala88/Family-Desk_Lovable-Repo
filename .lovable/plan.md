

# Comprehensive Fix: User Onboarding, Emails, and Household Creation

## Overview

This plan addresses four interconnected issues to create a seamless experience for newly approved users:

| # | Issue | Status | Root Cause |
|---|-------|--------|------------|
| 1 | Approval email not being sent | ❌ Broken | Edge function uses invalid method `getClaims()` |
| 2 | Verification/welcome emails not sent | ❌ Broken | Auto-confirm is enabled, bypassing custom flow |
| 3 | Household creation fails | ❌ Broken | Stale JWT token in browser session |
| 4 | No smart redirect after sign-in | ❌ Missing | Goes to dashboard regardless of household status |

---

## Proposed User Journey After Fix

```text
1. User requests access → Confirmation email sent ✓
2. Admin approves → Approval notification email sent (with link to sign up)
3. User signs up → Verification email sent
4. User clicks verify link → Welcome email sent
5. User signs in → Smart redirect to /household-setup
6. User creates household → Redirect to onboarding preferences
7. User completes onboarding → Redirect to dashboard
8. Returning user signs in → Direct to dashboard
```

---

## Fix 1: Approval Email (send-access-decision edge function)

The current edge function has a bug - it uses `supabase.auth.getClaims()` which is not a valid Supabase JS client method.

**File: `supabase/functions/send-access-decision/index.ts`**

Replace the invalid `getClaims()` call with proper user verification:

```typescript
// Replace lines 45-55 with:
const token = authHeader.replace("Bearer ", "");
const { data: { user }, error: userError } = await supabase.auth.getUser(token);

if (userError || !user) {
  return new Response(
    JSON.stringify({ error: "Invalid token" }),
    { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

// Optionally verify user is a platform admin
const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const { data: roleData } = await supabaseAdmin
  .from("user_roles")
  .select("role")
  .eq("user_id", user.id)
  .eq("role", "platform_admin")
  .single();

if (!roleData) {
  return new Response(
    JSON.stringify({ error: "Unauthorized - admin access required" }),
    { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}
```

---

## Fix 2: Verification & Welcome Emails (Auth Configuration)

**Problem:** Supabase has auto-confirm enabled, which immediately marks users as verified without going through the custom email flow.

**Solution:** Disable auto-confirm email in auth settings.

This change will restore the proper flow:
- User signs up → email_confirmed_at stays NULL
- `send-verification-email` edge function is called
- User receives verification email
- User clicks link → `verify-email-token` confirms email and sends welcome email

---

## Fix 3: Smart Redirect After Sign-In

**File: `src/pages/Auth.tsx`** (modify `handleSignIn` function, lines 192-234)

Add household and onboarding checks before redirecting:

```typescript
const handleSignIn = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Check if email is verified
    if (data.user && !data.user.email_confirmed_at) {
      setPendingUserId(data.user.id);
      setDisplayName(data.user.user_metadata?.display_name || "");
      setAuthState("verification-pending");
      toast({
        title: "Email Not Verified",
        description: "Please verify your email address to continue.",
        variant: "destructive",
      });
      return;
    }

    // Check if user has a household
    const { data: memberData } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", data.user.id)
      .limit(1)
      .maybeSingle();

    if (!memberData?.household_id) {
      toast({
        title: "Welcome!",
        description: "Let's set up your household.",
      });
      navigate("/household-setup");
      return;
    }

    // Check if onboarding is complete
    const { data: householdData } = await supabase
      .from("households")
      .select("onboarding_completed")
      .eq("id", memberData.household_id)
      .single();

    if (!householdData?.onboarding_completed) {
      toast({
        title: "Welcome back!",
        description: "Let's continue setting up your preferences.",
      });
      navigate("/onboarding/preferences");
      return;
    }

    // Fully onboarded - go to dashboard
    toast({
      title: "Welcome back!",
      description: "You've successfully signed in.",
    });
    navigate("/dashboard");
  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};
```

---

## Fix 4: Dashboard Safety Net Redirect

**File: `src/pages/Index.tsx`**

Add a redirect for users who somehow reach the dashboard without a household:

```typescript
// Add import if not present
import { useNavigate } from "react-router-dom";

// Inside the component, add this useEffect:
const navigate = useNavigate();

useEffect(() => {
  if (!isLoading && !householdId && user) {
    navigate("/household-setup");
  }
}, [isLoading, householdId, user, navigate]);
```

---

## Fix 5: Session Validation in Household Setup

**File: `src/pages/HouseholdSetup.tsx`**

Add session validation to detect stale JWT tokens and force re-authentication:

```typescript
// Add this useEffect near the top of the component:
useEffect(() => {
  const validateSession = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      toast({
        title: "Session Expired",
        description: "Please sign in again.",
        variant: "destructive",
      });
      await supabase.auth.signOut();
      navigate("/auth");
    }
  };
  validateSession();
}, [navigate, toast]);
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/send-access-decision/index.ts` | Fix invalid `getClaims()` method, add proper admin verification |
| Auth Configuration | Disable auto-confirm email |
| `src/pages/Auth.tsx` | Add household/onboarding checks to `handleSignIn` |
| `src/pages/Index.tsx` | Add safety net redirect for users without households |
| `src/pages/HouseholdSetup.tsx` | Add session validation to detect stale JWTs |

---

## Immediate Action Required (Before Code Changes)

To fix your current household creation issue:
1. **Sign out** completely from the application
2. **Clear browser storage** (or use incognito mode)
3. **Sign in again** with `satyateppala@zohomail.in` to get a fresh JWT token

---

## Testing Checklist (After Implementation)

1. Create new access request
2. Approve the request → Verify approval email arrives
3. Sign up with approved email → Verify verification email arrives
4. Click verification link → Verify welcome email arrives
5. Sign in → Verify redirect to `/household-setup`
6. Create household → Verify no JWT errors
7. Complete onboarding preferences
8. Verify arrival at dashboard
9. Sign out and sign in again → Verify direct dashboard access

