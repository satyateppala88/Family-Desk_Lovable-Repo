import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/hooks/useHousehold";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { ProductSelectionStep } from "./ProductSelectionStep";
import { ProductName } from "@/hooks/useEnabledProducts";
import { useQueryClient } from "@tanstack/react-query";
import { ModuleSetupQueue } from "./ModuleSetupQueue";

interface BasicsData {
  display_name: string;
  family_size_adults: number;
  family_size_children: number;
  children_ages: number[];
  family_size_seniors: number;
  household_type: "nuclear" | "joint" | "single";
}

const TOTAL_STEPS = 2;

export const UserPreferencesOnboarding = () => {
  const { user } = useAuth();
  const { householdId, isLoading: householdLoading } = useHousehold();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [basics, setBasics] = useState<BasicsData>({
    display_name: "",
    family_size_adults: 2,
    family_size_children: 0,
    children_ages: [],
    family_size_seniors: 0,
    household_type: "nuclear",
  });
  const [selectedProducts, setSelectedProducts] = useState<ProductName[]>([
    "tasks",
    "meals",
    "calendar",
    "grocery",
    "habits",
    "finance",
  ]);
  const [previouslyEnabled, setPreviouslyEnabled] = useState<ProductName[]>([]);
  const [setupQueue, setSetupQueue] = useState<ProductName[] | null>(null);

  // Prefill from existing data
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.display_name) {
        setBasics((b) => ({ ...b, display_name: profile.display_name as string }));
      }
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!householdId) return;
    (async () => {
      const { data } = await supabase
        .from("household_preferences")
        .select("family_size_adults, family_size_children, children_ages, family_size_seniors, household_type")
        .eq("household_id", householdId)
        .maybeSingle();
      if (data) {
        setBasics((b) => ({
          ...b,
          family_size_adults: data.family_size_adults ?? b.family_size_adults,
          family_size_children: data.family_size_children ?? b.family_size_children,
          children_ages: (data.children_ages as number[]) ?? [],
          family_size_seniors: data.family_size_seniors ?? b.family_size_seniors,
          household_type: (data.household_type as BasicsData["household_type"]) ?? b.household_type,
        }));
      }

      const { data: enabled } = await supabase
        .from("household_enabled_products")
        .select("product_name")
        .eq("household_id", householdId);
      if (enabled && enabled.length > 0) {
        const list = enabled.map((p) => p.product_name as ProductName);
        setSelectedProducts(list);
        setPreviouslyEnabled(list);
      }
    })();
  }, [householdId]);

  useEffect(() => {
    if (!householdLoading && !householdId) navigate("/household-setup");
  }, [householdId, householdLoading, navigate]);

  if (householdLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading your household...</p>
      </div>
    );
  }

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const handleProductToggle = (product: ProductName) => {
    setSelectedProducts((prev) =>
      prev.includes(product) ? prev.filter((p) => p !== product) : [...prev, product]
    );
  };

  const canAdvance = () => {
    if (step === 0) return basics.display_name.trim().length > 0 && basics.family_size_adults > 0;
    if (step === 1) return selectedProducts.length > 0;
    return true;
  };

  const handleNext = () => {
    if (!canAdvance()) {
      toast.error(step === 0 ? "Please enter a display name" : "Pick at least one module");
      return;
    }
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
    else handleComplete();
  };

  const handleComplete = async () => {
    if (!householdId || !user) return;
    setSubmitting(true);
    try {
      // 1. profile display name
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ display_name: basics.display_name.trim() })
        .eq("id", user.id);
      if (profileError) throw profileError;

      // 2. household basics only — module-specific fields stay null
      const { error: prefsError } = await supabase
        .from("household_preferences")
        .upsert(
          {
            household_id: householdId,
            family_size_adults: basics.family_size_adults,
            family_size_children: basics.family_size_children,
            children_ages: basics.children_ages,
            family_size_seniors: basics.family_size_seniors,
            household_type: basics.household_type,
          },
          { onConflict: "household_id" }
        );
      if (prefsError) throw prefsError;

      // 3. enabled products — replace the full set so deselections take effect.
      const deselected = previouslyEnabled.filter((p) => !selectedProducts.includes(p));
      if (deselected.length > 0) {
        const { error: deleteError } = await supabase
          .from("household_enabled_products")
          .delete()
          .eq("household_id", householdId)
          .in("product_name", deselected);
        if (deleteError) throw deleteError;
      }
      if (selectedProducts.length > 0) {
        const productInserts = selectedProducts.map((p) => ({
          household_id: householdId,
          product_name: p,
          enabled_by: user.id,
        }));
        const { error: productsError } = await supabase
          .from("household_enabled_products")
          .upsert(productInserts, { onConflict: "household_id,product_name" });
        if (productsError) throw productsError;
      }

      // 4. mark household onboarding complete
      const { error: householdError } = await supabase
        .from("households")
        .update({
          onboarding_completed: true,
          onboarding_completed_by: user.id,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq("id", householdId);
      if (householdError) throw householdError;

      // 5. user onboarding progress
      const { error: progressError } = await supabase.from("user_onboarding_progress").upsert(
        {
          user_id: user.id,
          current_step: TOTAL_STEPS,
          completed_steps: ["0", "1"],
          preferences_completed: true,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (progressError) throw progressError;

      // Wait for refetches so downstream pages see fresh data immediately.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["household"] }),
        queryClient.invalidateQueries({ queryKey: ["enabled-products"] }),
        queryClient.invalidateQueries({ queryKey: ["household-preferences"] }),
        queryClient.invalidateQueries({ queryKey: ["user-onboarding-progress"] }),
      ]);

      toast.success("Welcome to Family Desk!");

      // Queue per-module first-enable setup for any *newly* enabled module.
      const newlyEnabled = selectedProducts.filter((p) => !previouslyEnabled.includes(p));
      if (newlyEnabled.length > 0) {
        setSetupQueue(newlyEnabled);
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.error("[Onboarding] Setup failed:", err);
      toast.error("Setup failed: " + (err?.message ?? "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      {setupQueue && (
        <ModuleSetupQueue
          products={setupQueue}
          onAllDone={() => {
            setSetupQueue(null);
            navigate("/dashboard");
          }}
        />
      )}
      <div className="max-w-2xl mx-auto space-y-4">
        <Progress value={progress} className="h-2" />
        <Card>
          <CardHeader>
            <CardTitle>
              {step === 0 ? "Tell us about your household" : "Choose what to enable"}
            </CardTitle>
            <CardDescription>
              {step === 0
                ? "Just the basics — we'll ask the rest only when you open each module."
                : "You can change this anytime from Settings."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <Label>Your display name</Label>
                  <Input
                    value={basics.display_name}
                    onChange={(e) => setBasics({ ...basics, display_name: e.target.value })}
                    placeholder="e.g. Priya"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Number of adults</Label>
                  <Input
                    type="number"
                    min={1}
                    value={basics.family_size_adults}
                    onChange={(e) => setBasics({ ...basics, family_size_adults: parseInt(e.target.value) || 0 })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Number of children</Label>
                  <Input
                    type="number"
                    min={0}
                    value={basics.family_size_children}
                    onChange={(e) => {
                      const count = parseInt(e.target.value) || 0;
                      setBasics({
                        ...basics,
                        family_size_children: count,
                        children_ages:
                          count > 0
                            ? Array(count).fill(0).map((_, i) => basics.children_ages[i] || 0)
                            : [],
                      });
                    }}
                    className="mt-2"
                  />
                </div>
                {basics.family_size_children > 0 && (
                  <div className="space-y-2 pl-3 border-l-2 border-primary/30">
                    <Label className="text-sm text-muted-foreground">Children ages (optional)</Label>
                    {Array.from({ length: basics.family_size_children }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Label className="text-sm min-w-20">Child {i + 1}:</Label>
                        <Input
                          type="number"
                          min={0}
                          max={25}
                          className="w-24"
                          value={basics.children_ages[i] || ""}
                          onChange={(e) => {
                            const newAges = [...basics.children_ages];
                            newAges[i] = parseInt(e.target.value) || 0;
                            setBasics({ ...basics, children_ages: newAges });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <Label>Senior citizens (60+)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={basics.family_size_seniors}
                    onChange={(e) => setBasics({ ...basics, family_size_seniors: parseInt(e.target.value) || 0 })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Household type</Label>
                  <RadioGroup
                    value={basics.household_type}
                    onValueChange={(v) => setBasics({ ...basics, household_type: v as BasicsData["household_type"] })}
                    className="mt-2"
                  >
                    {[
                      { v: "nuclear", l: "Nuclear family" },
                      { v: "joint", l: "Joint family" },
                      { v: "single", l: "Single" },
                    ].map((o) => (
                      <div key={o.v} className="flex items-center space-x-2">
                        <RadioGroupItem value={o.v} id={`ht-${o.v}`} />
                        <Label htmlFor={`ht-${o.v}`}>{o.l}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            )}

            {step === 1 && (
              <ProductSelectionStep
                selectedProducts={selectedProducts}
                onProductToggle={handleProductToggle}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => {
              if (step === 0) {
                navigate("/household-setup");
              } else {
                setStep((s) => Math.max(0, s - 1));
              }
            }}
            disabled={submitting}
          >
            <ChevronLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Button onClick={handleNext} disabled={submitting}>
            {step < TOTAL_STEPS - 1 ? (
              <>Next <ChevronRight className="h-4 w-4 ml-2" /></>
            ) : (
              <>Finish <Check className="h-4 w-4 ml-2" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
