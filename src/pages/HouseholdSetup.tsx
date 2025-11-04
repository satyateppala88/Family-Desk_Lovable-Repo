import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("=== Starting household creation via edge function ===");
      
      // Call the edge function to create household
      const { data, error } = await supabase.functions.invoke('create-household', {
        body: { householdName },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      if (!data || !data.success) {
        console.error("Edge function returned unsuccessful:", data);
        throw new Error(data?.error || "Failed to create household");
      }

      console.log("Household created successfully via edge function:", data.household);

    toast({
      title: "Household created!",
      description: `Welcome to ${householdName}. Let's set up your preferences.`,
    });

    // Invalidate household query cache to ensure fresh data on next page
    queryClient.invalidateQueries({ queryKey: ["household"] });

    navigate("/onboarding/preferences");
    } catch (error: any) {
      console.error("Complete error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create household",
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
