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
    if (!user) return;

    setLoading(true);

    try {
      // Create household
      const { data: household, error: householdError } = await (supabase as any)
        .from("households")
        .insert({
          name: householdName,
          created_by: user.id,
        })
        .select()
        .single();

      if (householdError) throw householdError;
      if (!household) throw new Error("Failed to create household");

      // Add creator as admin member
      const { error: memberError } = await (supabase as any)
        .from("household_members")
        .insert({
          household_id: household.id,
          user_id: user.id,
          role: "admin",
        });

      if (memberError) throw memberError;

      // Add admin role
      const { error: roleError } = await (supabase as any)
        .from("user_roles")
        .insert({
          user_id: user.id,
          household_id: household.id,
          role: "household_admin",
        });

      if (roleError) throw roleError;

      toast({
        title: "Household created!",
        description: `Welcome to ${householdName}`,
      });

      navigate("/");
    } catch (error: any) {
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
