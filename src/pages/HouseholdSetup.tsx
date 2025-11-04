import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Home } from "lucide-react";

const HouseholdSetup = () => {
  const [householdName, setHouseholdName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      // Explicitly get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      if (!session || !session.user) {
        throw new Error("You must be logged in to create a household");
      }

      console.log("Session retrieved:", {
        userId: session.user.id,
        hasAccessToken: !!session.access_token,
        tokenPrefix: session.access_token?.substring(0, 10) + "...",
      });

      // CRITICAL: Wait to ensure auth headers are set in the Supabase client
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log("Creating household with user:", session.user.id);

      // Create household using session.user.id
      const { data: household, error: householdError } = await supabase
        .from("households")
        .insert({
          name: householdName,
          created_by: session.user.id,
        })
        .select()
        .single();

      if (householdError) {
        console.error("Household creation error:", householdError);
        throw householdError;
      }
      if (!household) throw new Error("Failed to create household");

      console.log("Household created:", household.id);

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from("household_members")
        .insert({
          household_id: household.id,
          user_id: session.user.id,
          role: "admin",
        });

      if (memberError) {
        console.error("Member creation error:", memberError);
        throw memberError;
      }

      console.log("Member added successfully");

      // Add admin role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: session.user.id,
          household_id: household.id,
          role: "household_admin",
        });

      if (roleError) {
        console.error("Role assignment error:", roleError);
        throw roleError;
      }

      console.log("Role assigned successfully");

      toast({
        title: "Household created!",
        description: `Welcome to ${householdName}. Let's set up your preferences.`,
      });

      navigate("/onboarding/preferences");
    } catch (error: any) {
      console.error("Complete error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Home className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Set Up Your Household</CardTitle>
          <CardDescription>
            Create your household to start managing tasks, meals, and more
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateHousehold} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="household-name">Household Name</Label>
              <Input
                id="household-name"
                type="text"
                placeholder="Smith Family, Apartment 4B, etc."
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Household"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default HouseholdSetup;
