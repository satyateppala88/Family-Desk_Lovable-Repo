import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RotateCcw, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/hooks/useHousehold";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const ResetOnboardingButton = () => {
  const { user } = useAuth();
  const { householdId } = useHousehold();
  const navigate = useNavigate();
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    if (!user || !householdId) {
      toast.error("No user or household found");
      return;
    }

    setIsResetting(true);

    try {
      // Delete household preferences
      await supabase
        .from("household_preferences")
        .delete()
        .eq("household_id", householdId);

      // Delete enabled products
      await supabase
        .from("household_enabled_products")
        .delete()
        .eq("household_id", householdId);

      // Delete dietary preferences
      await supabase
        .from("dietary_preferences")
        .delete()
        .eq("household_id", householdId);

      // Delete user onboarding progress
      await supabase
        .from("user_onboarding_progress")
        .delete()
        .eq("user_id", user.id);

      // Reset household onboarding_completed flag
      await supabase
        .from("households")
        .update({
          onboarding_completed: false,
          onboarding_completed_at: null,
          onboarding_completed_by: null,
        })
        .eq("id", householdId);

      toast.success("Onboarding data cleared! Redirecting...");

      // Redirect to onboarding
      setTimeout(() => {
        navigate("/onboarding/preferences");
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Error resetting onboarding:", error);
      toast.error("Failed to reset onboarding data");
    } finally {
      setIsResetting(false);
    }
  };

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <div>
            <h3 className="font-semibold text-orange-900 dark:text-orange-100">
              Development Reset
            </h3>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Clear all onboarding data and restart the flow
            </p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              disabled={isResetting}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Onboarding
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Onboarding Data?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete all household preferences, enabled products,
                dietary preferences, and onboarding progress. This action cannot
                be undone. You will be redirected to the onboarding flow.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset} disabled={isResetting}>
                {isResetting ? "Resetting..." : "Reset & Restart"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
