import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Clock, AlertTriangle, RefreshCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { assignRecipeToSlot, persistAiRecipe } from "@/lib/meals/assignRecipeToSlot";
import { navigateToShoppingListWithIngredients } from "@/lib/meals/shoppingListBridge";

export type SlotMealType = "breakfast" | "lunch" | "dinner" | "snack";

interface AiSuggestSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  householdId: string;
  weekStartDate: string; // yyyy-MM-dd
  dayOfWeek: number;
  mealType: SlotMealType;
  onAssigned?: () => void;
}

interface Suggestion {
  title: string;
  description?: string;
  prep_time?: number;
  cook_time?: number;
  servings?: number;
  difficulty?: "easy" | "medium" | "hard";
  cuisine_type?: string;
  ingredients?: Array<{ name: string; quantity?: string; unit?: string }>;
  instructions?: any[];
  nutritional_info?: any;
}

const TIMEOUT_MS = 30_000;

export const AiSuggestSheet = ({
  open, onOpenChange, householdId, weekStartDate, dayOfWeek, mealType, onAssigned,
}: AiSuggestSheetProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [confirmFor, setConfirmFor] = useState<{ recipeTitle: string; ingredients: any[] } | null>(null);

  const fetchSuggestions = async () => {
    if (!householdId) return;
    setLoading(true);
    setError(null);
    setSuggestions([]);
    setConfirmFor(null);

    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/suggest-meals-for-slot`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ householdId, mealType, count: 3 }),
        signal: controller.signal,
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || "Couldn't connect right now.");
      }
      const json = await resp.json();
      setSuggestions(json.suggestions || []);
    } catch (e: any) {
      if (e.name === "AbortError") {
        setError("Couldn't connect right now. Try again?");
      } else {
        setError(e.message || "Couldn't connect right now. Try again?");
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchSuggestions();
    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mealType, householdId]);

  const handleUse = async (s: Suggestion) => {
    if (!user || !householdId) return;
    try {
      const recipe = await persistAiRecipe({
        householdId, userId: user.id,
        recipe: s as any,
      });
      await assignRecipeToSlot({
        householdId, userId: user.id,
        weekStartDate, dayOfWeek, mealType,
        recipeId: recipe.id,
      });
      queryClient.invalidateQueries({ queryKey: ["meal-plans", householdId] });
      queryClient.invalidateQueries({ queryKey: ["recipes", householdId] });
      onAssigned?.();
      setConfirmFor({ recipeTitle: s.title, ingredients: s.ingredients || [] });
    } catch (e: any) {
      toast({ title: "Couldn't add", description: e.message || "Try again.", variant: "destructive" });
    }
  };

  const handleSendToShopping = () => {
    if (!confirmFor) return;
    navigateToShoppingListWithIngredients(
      navigate,
      `${confirmFor.recipeTitle} ingredients`,
      confirmFor.ingredients,
    );
    onOpenChange(false);
  };

  const handleSkipShopping = () => {
    toast({ title: "Added to your plan ✨", description: confirmFor?.recipeTitle });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" />
            AI suggestions for {mealType}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          {loading && (
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-sm font-medium">Checking your pantry and preferences...</p>
              <p className="text-xs text-muted-foreground mt-0.5">This usually takes a few seconds.</p>
              <div className="mt-3 space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
              <AlertTriangle className="w-6 h-6 mx-auto text-destructive mb-2" />
              <p className="text-sm font-medium">{error}</p>
              <Button size="sm" className="mt-3" onClick={fetchSuggestions}>
                <RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> Retry
              </Button>
            </div>
          )}

          {!loading && !error && !confirmFor && suggestions.map((s, i) => {
            const total = (s.prep_time || 0) + (s.cook_time || 0);
            const keyIngredients = (s.ingredients || []).slice(0, 5).map((ing) => ing.name).filter(Boolean);
            return (
              <div key={i} className="rounded-xl border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{s.title}</p>
                    {total > 0 && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Clock className="w-3 h-3" /> {total} min
                        {s.cuisine_type && <span className="ml-1">· {s.cuisine_type}</span>}
                      </p>
                    )}
                    {keyIngredients.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {keyIngredients.join(", ")}
                      </p>
                    )}
                  </div>
                  <Button size="sm" onClick={() => handleUse(s)} className="shrink-0">
                    Use this
                  </Button>
                </div>
              </div>
            );
          })}

          {confirmFor && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
              <p className="text-sm font-medium">Added! Want to add missing ingredients to your shopping list?</p>
              <div className="flex gap-2 mt-3 justify-center">
                <Button variant="outline" size="sm" onClick={handleSkipShopping}>No, thanks</Button>
                <Button size="sm" onClick={handleSendToShopping}>Yes, add them</Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};