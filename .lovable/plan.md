

# Fix: "Failed to start Google authorization" in Production

## Root Cause Analysis

The error "Failed to start Google authorization" is a generic client-side toast that hides the actual failure reason. After reviewing the code, several potential failure points exist:

1. **No household ID** -- `initiateOAuth` throws immediately if `householdId` is falsy, but the error is swallowed into a generic toast
2. **Stale auth session** -- `getSession()` can return a cached/expired session; the edge function then rejects the token
3. **Edge function response shape** -- `supabase.functions.invoke()` sometimes returns errors inside `response.data.error` rather than `response.error`, so the check on line 57 may pass while `response.data.authUrl` is undefined

## Changes

### 1. Improve error handling in `useCalendarConnections.ts`

- Add specific error messages for each failure point (no household, no session)
- Check `response.data?.authUrl` exists before redirecting
- Log the actual error details to console for debugging
- Show more descriptive toast messages so the user (and developer) knows what went wrong

### 2. Add defensive checks in `useCalendarConnections.ts`

- Validate `response.data.authUrl` is a valid URL before assigning to `window.location.href`
- Check for error in `response.data.error` (edge function may return 200 with error body)
- Add a fallback if `authUrl` is missing

---

## Technical Details

**File: `src/hooks/useCalendarConnections.ts`** (initiateOAuth mutation)

Current:
```typescript
if (!householdId) throw new Error("No household");
const { data: { session } } = await supabase.auth.getSession();
if (!session) throw new Error("Not authenticated");
// ...
if (response.error) throw response.error;
window.location.href = response.data.authUrl;
```

Updated:
```typescript
if (!householdId) throw new Error("Please set up your household first");
const { data: { session } } = await supabase.auth.getSession();
if (!session) throw new Error("Please sign in again to connect your calendar");
// ...
if (response.error) throw new Error(response.error.message || "Connection failed");
if (response.data?.error) throw new Error(response.data.error);
if (!response.data?.authUrl) throw new Error("No authorization URL returned");
window.location.href = response.data.authUrl;
```

And improve the `onError` handler to show the actual error message:
```typescript
onError: (error) => {
  console.error("OAuth error:", error);
  toast.error(error instanceof Error ? error.message : "Failed to start Google authorization");
},
```

This will surface the real reason for the failure instead of hiding it behind a generic message, making it immediately clear whether the issue is a missing household, expired session, or backend problem.

