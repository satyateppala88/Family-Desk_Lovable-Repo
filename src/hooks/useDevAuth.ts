import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const TEST_USER_EMAIL = "testuser@familydesk.dev";
const TEST_USER_PASSWORD = "TestUser123!";

interface DevAuthState {
  isDevMode: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useDevAuth = () => {
  const [state, setState] = useState<DevAuthState>({
    isDevMode: false,
    isLoading: false,
    error: null,
  });

  const seedTestUser = useCallback(async () => {
    if (!import.meta.env.DEV) {
      console.warn("Dev auth is only available in development mode");
      return { success: false, error: "Not in dev mode" };
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke("dev-seed-test-user", {
        body: {},
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error: any) {
      const errorMessage = error.message || "Failed to seed test user";
      setState(prev => ({ ...prev, error: errorMessage }));
      return { success: false, error: errorMessage };
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const loginAsTestUser = useCallback(async () => {
    if (!import.meta.env.DEV) {
      console.warn("Dev auth is only available in development mode");
      return { success: false, error: "Not in dev mode" };
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // First try to sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
      });

      if (signInError) {
        // If user doesn't exist, seed first
        if (signInError.message.includes("Invalid login credentials")) {
          console.log("Test user not found, seeding...");
          const seedResult = await seedTestUser();
          
          if (!seedResult.success) {
            throw new Error(seedResult.error);
          }

          // Try signing in again
          const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
            email: TEST_USER_EMAIL,
            password: TEST_USER_PASSWORD,
          });

          if (retryError) throw retryError;

          setState(prev => ({ ...prev, isDevMode: true }));
          return { success: true, user: retryData.user };
        }

        throw signInError;
      }

      setState(prev => ({ ...prev, isDevMode: true }));
      return { success: true, user: signInData.user };
    } catch (error: any) {
      const errorMessage = error.message || "Failed to login as test user";
      setState(prev => ({ ...prev, error: errorMessage }));
      return { success: false, error: errorMessage };
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [seedTestUser]);

  const resetTestData = useCallback(async () => {
    if (!import.meta.env.DEV) {
      return { success: false, error: "Not in dev mode" };
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Not logged in");
      }

      const { error } = await supabase.functions.invoke("dev-reset-account", {
        body: { keepUser: true },
      });

      if (error) throw error;

      // Re-seed the test user data
      await seedTestUser();

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || "Failed to reset test data";
      setState(prev => ({ ...prev, error: errorMessage }));
      return { success: false, error: errorMessage };
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [seedTestUser]);

  const logoutTestUser = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ isDevMode: false, isLoading: false, error: null });
  }, []);

  return {
    ...state,
    loginAsTestUser,
    logoutTestUser,
    seedTestUser,
    resetTestData,
    isDevEnvironment: import.meta.env.DEV,
  };
};
