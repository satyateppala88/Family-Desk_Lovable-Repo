import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUpcomingFestival } from "@/hooks/useUpcomingFestival";
import { matchFestivalChecklist } from "@/data/festivalChecklists";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { addDays, format } from "date-fns";

export const FestivalBanner = () => {
  const { data: festival } = useUpcomingFestival();
  const { householdId } = useHousehold();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  if (!festival) return null;

  const dismissKey = `festival-banner-dismissed-${festival.id}`;
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return !!localStorage.getItem(dismissKey); } catch { return false; }
  });
  if (dismissed) return null;

  const checklist = matchFestivalChecklist(festival.name);
  if (!checklist) return null;

  const dismiss = () => {
    try { localStorage.setItem(dismissKey, "1"); } catch {}
    setDismissed(true);
  };

  const handleAdd = async () => {
    if (!householdId || !user) return;
    setBusy(true);
    try {
      const dueDate = format(addDays(new Date(festival.event_date), -1), "yyyy-MM-dd");
      const rows = checklist.map((title) => ({
        household_id: householdId,
        created_by: user.id,
        title,
        status: "pending",
        due_date: dueDate,
      }));
      const { error } = await (supabase as any).from("tasks").insert(rows);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["tasks", householdId] });
      toast({
        title: `Added ${rows.length} tasks`,
        description: `Open Taskmaster to see your ${festival.name} prep list.`,
      });
      dismiss();
    } catch (err: any) {
      toast({ title: "Couldn't add checklist", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const dayWord = festival.daysAway === 1 ? "day" : "days";
  const inText = festival.daysAway === 0
    ? "is today"
    : `is in ${festival.daysAway} ${dayWord}`;

  return (
    <Card className="mb-4 border-orange-200 bg-orange-50/50">
      <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-start gap-3 flex-1">
          <div className="rounded-full bg-orange-100 p-2 mt-0.5">
            <Sparkles className="h-4 w-4 text-orange-600" />
          </div>
          <p className="text-sm flex-1">
            <span className="font-medium">{festival.name}</span> {inText} — want to add a preparation checklist to Tasks?
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button size="sm" onClick={handleAdd} disabled={busy} className="flex-1 sm:flex-initial">
            {busy ? "Adding…" : "Add checklist"}
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};