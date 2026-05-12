## Plan: Add `AdminRoute` guard for platform admin pages

Create a new route guard that checks both authentication and platform-admin status, then apply it to the two `/admin/*` routes.

### 1. New file: `src/components/layout/AdminRoute.tsx`

Modeled after the existing `ProtectedRoute`, but additionally gates on `useIsPlatformAdmin`. Behavior:

- While `auth` or `admin` status is loading → render the same skeleton shell as `ProtectedRoute` for visual consistency.
- If no user → `<Navigate to="/auth" replace />`.
- If user is not a platform admin → `<Navigate to="/" replace />`.
- Otherwise render `children`.

```tsx
import { useAuth } from "@/contexts/AuthContext";
import { useIsPlatformAdmin } from "@/hooks/useIsPlatformAdmin";
import { Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { isPlatformAdmin, isLoading: adminLoading } = useIsPlatformAdmin();

  if (authLoading || adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-md p-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isPlatformAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};
```

### 2. Update `src/App.tsx`

- Add `import { AdminRoute } from "@/components/layout/AdminRoute";` next to the existing `ProtectedRoute` import.
- Replace `<ProtectedRoute>` wrappers with `<AdminRoute>` for these two routes only:
  - `/admin/access-requests` (around line 98–102)
  - `/admin/permission-analytics` (around line 229–232)

All other routes remain on `ProtectedRoute` unchanged.

### Notes
- I'll verify `useIsPlatformAdmin` actually returns `{ isPlatformAdmin, isLoading }` before writing — if the property names differ, I'll match the hook's real shape.
- This adds a defense-in-depth client redirect; underlying RLS on `access_requests` / permission analytics already enforces server-side admin checks.
