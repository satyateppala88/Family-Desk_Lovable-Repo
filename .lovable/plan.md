## Plan

Add a missing route redirect in `src/App.tsx`.

### Change
Insert a single `<Route>` redirect between the existing `/finance/savings` and `/finance/chat` routes:

```tsx
<Route path="/finance/ai-advisor" element={
  <ProtectedRoute>
    <Navigate to="/finance/chat" replace />
  </ProtectedRoute>
} />
```

This mirrors the pattern already used for `/tasks/all` and `/settings/account` redirects. No other files are touched.

### Verification
After the change, navigating to `/finance/ai-advisor` should immediately redirect to `/finance/chat` with the same `replace` behavior as the existing redirects.