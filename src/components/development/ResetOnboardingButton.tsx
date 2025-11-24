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
      // Call edge function to delete everything
      const { data, error } = await supabase.functions.invoke('dev-reset-account');

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      toast.success("Account deleted! Redirecting to login...");

      // Wait a moment for the user to see the success message
      setTimeout(() => {
        // Sign out is handled by the edge function deleting the user
        // Just navigate to auth page
        navigate("/auth");
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Error resetting account:", error);
      toast.error("Failed to reset account. Please try again.");
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
              Development Reset (Complete)
            </h3>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Delete ALL data, household, and user account permanently
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
              Complete Reset & Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Complete Account Deletion?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your user account, household, and ALL associated data including:
                meal plans, recipes, tasks, preferences, and onboarding progress. 
                This action CANNOT be undone. You will be redirected to the login page.
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
