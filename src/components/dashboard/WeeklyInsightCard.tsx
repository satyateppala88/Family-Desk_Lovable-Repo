import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface WeeklyInsightCardProps {
  householdId: string;
}

export function WeeklyInsightCard({ householdId }: WeeklyInsightCardProps) {
  const { data: insight } = useQuery({
    queryKey: ["weekly-insight", householdId],
    queryFn: async () => {
      const { data } = await supabase
        .from("household_ai_insights")
        .select("insight_text, generated_at")
        .eq("household_id", householdId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!householdId,
    staleTime: 60 * 60 * 1000,
  });

  if (!insight) return null;

  return (
    <Card className="mb-4 border-primary/20 bg-primary/5">
      <CardContent className="p-4 flex gap-3 items-start">
        <div className="rounded-xl p-2 bg-primary/10 text-primary shrink-0">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Weekly AI Insight
          </h3>
          <p className="text-sm text-muted-foreground leading-snug">
            {insight.insight_text}
          </p>
          <Button
            variant="link"
            className="px-0 h-auto mt-2 text-primary"
            onClick={() =>
              window.dispatchEvent(new Event("familydesk:open-ai"))
            }
          >
            Ask me more →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}