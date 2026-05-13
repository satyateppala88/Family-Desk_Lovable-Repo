import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/layout/BottomNav";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isEmailVerified } = useAuth();
  const location = useLocation();

  if (loading) {
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

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Allow access to verification-related pages even if not verified
  const allowedUnverifiedPaths = ["/verify-email"];
  if (!isEmailVerified && !allowedUnverifiedPaths.includes(location.pathname)) {
    // Redirect unverified users to auth page where they'll see the verification pending state
    return <Navigate to="/auth" replace />;
  }

  return (
    <>
      {children}
      <BottomNav />
    </>
  );
};
