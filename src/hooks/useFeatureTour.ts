import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export type FeatureName = 
  | "dashboard" 
  | "tasks" 
  | "meals" 
  | "grocery" 
  | "habits" 
  | "calendar" 
  | "taskmaster";

interface CompletedTours {
  [key: string]: boolean;
}

export const useFeatureTour = (featureName: FeatureName) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [shouldShowTour, setShouldShowTour] = useState(false);
  const [tourChecked, setTourChecked] = useState(false);

  // Fetch completed tours from profile
  const { data: completedTours, isLoading } = useQuery({
    queryKey: ["completed-tours", user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      
      const { data, error } = await supabase
        .from("profiles")
        .select("completed_tours")
        .eq("id", user.id)
        .single();
      
      if (error) {
        console.error("Error fetching completed tours:", error);
        return {};
      }
      
      return (data?.completed_tours as CompletedTours) || {};
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Check if this feature tour should be shown
  useEffect(() => {
    if (!isLoading && completedTours !== undefined) {
      const hasCompletedTour = completedTours[featureName] === true;
      setShouldShowTour(!hasCompletedTour);
      setTourChecked(true);
    }
  }, [completedTours, featureName, isLoading]);

  // Mark tour as complete mutation
  const markTourCompleteMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      const updatedTours = {
        ...completedTours,
        [featureName]: true,
      };

      const { error } = await supabase
        .from("profiles")
        .update({ completed_tours: updatedTours })
        .eq("id", user.id);

      if (error) throw error;
      
      return updatedTours;
    },
    onSuccess: (updatedTours) => {
      queryClient.setQueryData(["completed-tours", user?.id], updatedTours);
      setShouldShowTour(false);
    },
    onError: (error) => {
      console.error("Error marking tour as complete:", error);
    },
  });

  const markTourComplete = useCallback(() => {
    markTourCompleteMutation.mutate();
  }, [markTourCompleteMutation]);

  // Reset a specific tour (for development/testing)
  const resetTour = useCallback(async () => {
    if (!user?.id) return;

    const updatedTours = {
      ...completedTours,
      [featureName]: false,
    };

    await supabase
      .from("profiles")
      .update({ completed_tours: updatedTours })
      .eq("id", user.id);

    queryClient.setQueryData(["completed-tours", user?.id], updatedTours);
    setShouldShowTour(true);
  }, [user?.id, completedTours, featureName, queryClient]);

  return {
    shouldShowTour,
    tourChecked,
    isLoading,
    markTourComplete,
    resetTour,
  };
};
