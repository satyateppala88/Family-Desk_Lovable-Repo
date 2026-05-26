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