import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, CalendarSearch, Info, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "@/hooks/useHousehold";
import { useCalendarConnections } from "@/hooks/useCalendarConnections";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { addDays, startOfWeek, endOfWeek, format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface TaskSuggestion {
  title: string;
  priority_level: number;
  task_category: string;
  reasoning: string;
  source_calendar_event_id: string;
  event_date: string;
  selected: boolean;
}

type DateRange = "today" | "this_week" | "next_7_days";

interface CalendarTaskScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CalendarTaskScanDialog = ({ open, onOpenChange }: CalendarTaskScanDialogProps) => {
  const { householdId } = useHousehold();
  const { connections } = useCalendarConnections();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [dateRange, setDateRange] = useState<DateRange>("next_7_days");
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const [alreadyImported, setAlreadyImported] = useState<{ eventId: string; title: string }[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  const hasConnections = connections && connections.length > 0;

  const getDateRange = (range: DateRange) => {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    switch (range) {
      case "today":
        return { startDate: todayStr, endDate: todayStr };
      case "this_week":
        return { startDate: todayStr, endDate: format(endOfWeek(today), "yyyy-MM-dd") };
      case "next_7_days":
        return { startDate: todayStr, endDate: format(addDays(today, 7), "yyyy-MM-dd") };
    }
  };

  const handleScan = async () => {
    if (!householdId) return;
    setIsScanning(true);
    setHasScanned(false);
    setSuggestions([]);
    setAlreadyImported([]);

    try {
      const { startDate, endDate } = getDateRange(dateRange);
      const { data, error } = await supabase.functions.invoke("extract-calendar-tasks-preview", {
        body: { householdId, startDate, endDate },
      });

      if (error) throw error;

      setSuggestions(
        (data.suggestions || []).map((s: any) => ({ ...s, selected: true }))
      );
      setAlreadyImported(data.alreadyImported || []);
      setHasScanned(true);
    } catch (err: any) {
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
    } finally {
      setIsScanning(false);
    }
  };

  const handleCreate = async () => {
    const selected = suggestions.filter((s) => s.selected);
    if (selected.length === 0 || !householdId || !user) return;

    setIsCreating(true);
    try {
      const tasksToInsert = selected.map((s) => ({
        household_id: householdId,
        title: s.title,
        priority_level: s.priority_level,
        task_category: s.task_category,
        task_status: "backlog" as const,
        due_date: s.event_date,
        source_calendar_event_id: s.source_calendar_event_id,
        created_by: user.id,
        description: s.reasoning,
      }));

      const { error } = await supabase.from("tasks").insert(tasksToInsert as any);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["taskmaster-tasks", householdId] });
      toast({ title: "Tasks created", description: `${selected.length} tasks added from calendar.` });
      onOpenChange(false);
      setSuggestions([]);
      setHasScanned(false);
    } catch (err: any) {
      toast({ title: "Error creating tasks", description: err.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const updateSuggestion = (index: number, updates: Partial<TaskSuggestion>) => {
    setSuggestions((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const selectedCount = suggestions.filter((s) => s.selected).length;

  const priorityOptions = [
    { value: "1", label: "P1 - Urgent" },
    { value: "2", label: "P2 - High" },
    { value: "3", label: "P3 - Medium" },
    { value: "4", label: "P4 - Low" },
  ];

  const categoryOptions = [
    { value: "home", label: "Home" },
    { value: "work", label: "Work" },
    { value: "kid", label: "Kid" },
    { value: "other", label: "Other" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarSearch className="w-5 h-5" />
            Scan Calendar for Tasks
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
        {!hasConnections ? (
          <div className="text-center py-8 space-y-3">
            <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No calendar connected yet.</p>
            <Button variant="outline" onClick={() => { onOpenChange(false); navigate("/calendar"); }}>
              Connect Google Calendar
            </Button>
          </div>
        ) : (
          <>
            {/* Date Range + Scan */}
            <div className="flex items-center gap-3">
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="next_7_days">Next 7 Days</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleScan} disabled={isScanning}>
                {isScanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CalendarSearch className="w-4 h-4 mr-2" />}
                {isScanning ? "Scanning..." : "Scan"}
              </Button>
            </div>

            {/* Already imported notice */}
            {alreadyImported.length > 0 && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
                <span className="font-medium">{alreadyImported.length} event(s)</span> already imported as tasks.
              </div>
            )}

            {/* Suggestions list */}
            {hasScanned && suggestions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No actionable tasks found in your calendar for this period.
              </p>
            )}

            {suggestions.length > 0 && (
              <TooltipProvider>
                <div className="space-y-3">
                  {suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                      <Checkbox
                        checked={s.selected}
                        onCheckedChange={(checked) => updateSuggestion(i, { selected: !!checked })}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2 min-w-0">
                        <Input
                          value={s.title}
                          onChange={(e) => updateSuggestion(i, { title: e.target.value })}
                          className="h-8 text-sm"
                        />
                        <div className="flex items-center gap-2 flex-wrap">
                          <Select
                            value={String(s.priority_level)}
                            onValueChange={(v) => updateSuggestion(i, { priority_level: Number(v) })}
                          >
                            <SelectTrigger className="w-28 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {priorityOptions.map((o) => (
                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={s.task_category}
                            onValueChange={(v) => updateSuggestion(i, { task_category: v })}
                          >
                            <SelectTrigger className="w-24 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {categoryOptions.map((o) => (
                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Badge variant="outline" className="text-xs">{s.event_date}</Badge>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs">
                              {s.reasoning}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TooltipProvider>
            )}
          </>
        )}
        </DialogBody>

        {suggestions.length > 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={selectedCount === 0 || isCreating}>
              {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create {selectedCount} Task{selectedCount !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
