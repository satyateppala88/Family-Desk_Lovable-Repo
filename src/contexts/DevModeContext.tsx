import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const TEST_USER_EMAIL = "testuser@familydesk.dev";
const TEST_USER_PASSWORD = "TestUser123!";

interface DevModeContextType {
  isDevMode: boolean;
  isDevEnvironment: boolean;
  testUserId: string | null;
  testHouseholdId: string | null;
  isLoading: boolean;
  error: string | null;
  enableDevMode: () => Promise<void>;
  disableDevMode: () => Promise<void>;
  resetTestData: () => Promise<void>;
}

const DevModeContext = createContext<DevModeContextType | undefined>(undefined);

export const DevModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDevMode, setIsDevMode] = useState(false);
  const [testUserId, setTestUserId] = useState<string | null>(null);
  const [testHouseholdId, setTestHouseholdId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDevEnvironment = import.meta.env.DEV;

  // Check if current user is the test user
  useEffect(() => {
    const checkTestUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email === TEST_USER_EMAIL) {
        setIsDevMode(true);
        setTestUserId(user.id);
        
        // Get household ID
        const { data: membership } = await supabase
          .from("household_members")
          .select("household_id")
          .eq("user_id", user.id)
          .single();
        
        if (membership) {
          setTestHouseholdId(membership.household_id);
        }
      }
    };

    if (isDevEnvironment) {
      checkTestUser();
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.email === TEST_USER_EMAIL) {
        setIsDevMode(true);
        setTestUserId(session.user.id);
      } else {
        setIsDevMode(false);
        setTestUserId(null);
        setTestHouseholdId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [isDevEnvironment]);

  const enableDevMode = useCallback(async () => {
    if (!isDevEnvironment) {
      setError("Dev mode is only available in development environment");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Try to sign in as test user
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
      });

      if (signInError) {
        // If user doesn't exist, seed first
        if (signInError.message.includes("Invalid login credentials")) {
          console.log("Test user not found, seeding...");
          
          const { data, error } = await supabase.functions.invoke("dev-seed-test-user", {
            body: {},
          });

          if (error) throw error;

          // Try signing in again
          const { error: retryError } = await supabase.auth.signInWithPassword({
            email: TEST_USER_EMAIL,
            password: TEST_USER_PASSWORD,
          });

          if (retryError) throw retryError;

          setTestUserId(data.userId);
          setTestHouseholdId(data.householdId);
        } else {
          throw signInError;
        }
      } else if (signInData.user) {
        setTestUserId(signInData.user.id);
        
        // Get household ID
        const { data: membership } = await supabase
          .from("household_members")
          .select("household_id")
          .eq("user_id", signInData.user.id)
          .single();
        
        if (membership) {
          setTestHouseholdId(membership.household_id);
        }
      }

      setIsDevMode(true);
    } catch (err: any) {
      setError(err.message || "Failed to enable dev mode");
      console.error("Dev mode error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isDevEnvironment]);

  const disableDevMode = useCallback(async () => {
    await supabase.auth.signOut();
    setIsDevMode(false);
    setTestUserId(null);
    setTestHouseholdId(null);
  }, []);

  const resetTestData = useCallback(async () => {
    if (!isDevMode || !testUserId) {
      setError("Not in dev mode or no test user");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use the existing dev-reset-account function with keepUser flag
      const { error: resetError } = await supabase.functions.invoke("dev-reset-account", {
        body: { keepUser: true },
      });

      if (resetError) throw resetError;

      // Re-seed the test data
      const { data, error: seedError } = await supabase.functions.invoke("dev-seed-test-user", {
        body: {},
      });

      if (seedError) throw seedError;

      setTestHouseholdId(data.householdId);
    } catch (err: any) {
      setError(err.message || "Failed to reset test data");
      console.error("Reset test data error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isDevMode, testUserId]);

  const value: DevModeContextType = {
    isDevMode,
    isDevEnvironment,
    testUserId,
    testHouseholdId,
    isLoading,
    error,
    enableDevMode,
    disableDevMode,
    resetTestData,
  };

  return (
    <DevModeContext.Provider value={value}>
      {children}
    </DevModeContext.Provider>
  );
};

export const useDevMode = () => {
  const context = useContext(DevModeContext);
  if (context === undefined) {
    throw new Error("useDevMode must be used within a DevModeProvider");
  }
  return context;
};
