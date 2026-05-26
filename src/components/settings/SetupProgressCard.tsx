import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, ArrowRight, ListChecks } from "lucide-react";
import { useHousehold } from "@/hooks/useHousehold";
import { useEnabledProducts, type ProductName } from "@/hooks/useEnabledProducts";
import { useHouseholdPreferences } from "@/hooks/useHouseholdPreferences";
import {
  MODULE_SETUP_KEYS,
  isModuleSetupComplete,
  type ModuleSetupKey,
} from "@/lib/moduleSetup";

const MODULE_LABELS: Record<ProductName, string> = {
  meals: "Meals",
  grocery: "Grocery",
  finance: "Finance",
  habits: "Habits",
  calendar: "Calendar",
  tasks: "Tasks",
};

const ORDER: ProductName[] = ["meals", "grocery", "finance", "habits", "calendar", "tasks"];

export const SetupProgressCard = () => {
  const { householdId } = useHousehold();
  const navigate = useNavigate();
  const { data: enabledProducts } = useEnabledProducts(householdId);
  const { preferences } = useHouseholdPreferences(householdId);

  const items = useMemo(() => {
    if (!enabledProducts || !preferences) return [];
    return ORDER.filter((p) => enabledProducts.includes(p))
      .map((p) => {
        const key = MODULE_SETUP_KEYS[p];
        if (!key) return null; // products without their own setup (e.g. tasks)
      const complete = isModuleSetupComplete(preferences, key);
      return { product: p, key, label: MODULE_LABELS[p], complete };
      })
      .filter((x): x is { product: ProductName; key: ModuleSetupKey; label: string; complete: boolean } => x !== null);
  }, [enabledProducts, preferences]);

  if (items.length === 0) return null;

  const completedCount = items.filter((i) => i.complete).length;
  const total = items.length;
  const pct = Math.round((completedCount / total) * 100);
  const allDone = completedCount === total;

  return (
    <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <ListChecks className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Setup progress</CardTitle>
                <CardDescription className="mt-1">
                  {allDone
                    ? "You're all set — every enabled module is configured."
                    : "Finish setting up each module to get the best experience."}
                </CardDescription>
              </div>
            </div>
            <Badge variant={allDone ? "secondary" : "outline"} className="text-xs whitespace-nowrap">
              {completedCount}/{total} done
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={pct} className="h-2" />

          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  {item.complete ? (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className={`text-sm truncate ${item.complete ? "text-muted-foreground" : "font-medium"}`}>
                    {item.label}
                  </span>
                </div>
                {item.complete ? (
                  <span className="text-xs text-muted-foreground">Complete</span>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => navigate("/onboarding/preferences")}
                  >
                    Finish setup
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
    </Card>
  );
};
