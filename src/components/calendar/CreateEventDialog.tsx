import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useCreateManualEvent } from "@/hooks/useManualCalendarEvents";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useHousehold } from "@/hooks/useHousehold";
import { useHouseholdMembers } from "@/hooks/useHouseholdMembers";

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
}

export const CreateEventDialog = ({ open, onOpenChange, defaultDate }: CreateEventDialogProps) => {
  const { toast } = useToast();
  const createEvent = useCreateManualEvent();
  const { householdId } = useHousehold();
  const { data: members = [] } = useHouseholdMembers(householdId);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date | undefined>(defaultDate ?? new Date());
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [repeatType, setRepeatType] = useState<'none'|'daily'|'weekly'|'monthly'|'yearly'>('none');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDate(defaultDate ?? new Date());
      setTime("");
      setDescription("");
      setAllDay(false);
      setRepeatType('none');
      setSelectedMembers(members.map((m) => m.userId));
    }
  }, [open, defaultDate, members]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: "Title required", description: "Please enter a title for the event.", variant: "destructive" });
      return;
    }
    if (!date) {
      toast({ title: "Date required", description: "Please pick a date for the event.", variant: "destructive" });
      return;
    }

    try {
      await createEvent.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        date,
        time: allDay ? null : (time || null),
        allDay,
        repeatType,
        memberIds: selectedMembers,
      });
      toast({ title: "Event added", description: "Your event has been added to the calendar." });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Couldn't add event", description: err?.message || "Please try again.", variant: "destructive" });
    }
  };

  return (
    <BottomSheet
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="Create Event"
      description="Add a manual event to your family calendar."
      footer={
        <Button onClick={handleSubmit} disabled={createEvent.isPending} className="w-full">
          {createEvent.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding…</>
          ) : (
            "Save Event"
          )}
        </Button>
      }
    >
      <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              placeholder="e.g., Dentist appointment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd/MM/yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="all-day">All day</Label>
              <p className="text-xs text-muted-foreground">Hides the time field below.</p>
            </div>
            <Switch id="all-day" checked={allDay} onCheckedChange={setAllDay} />
          </div>

          {!allDay && (
            <div className="space-y-2">
              <Label htmlFor="event-time">Time (optional)</Label>
              <Input
                id="event-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Repeat</Label>
            <Select value={repeatType} onValueChange={(v) => setRepeatType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Does not repeat</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {members.length > 0 && (
            <div className="space-y-2">
              <Label>Who</Label>
              <div className="rounded-md border p-3 space-y-2 max-h-40 overflow-y-auto">
                {members.map((m) => {
                  const checked = selectedMembers.includes(m.userId);
                  return (
                    <label key={m.userId} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          setSelectedMembers((prev) =>
                            v ? [...prev, m.userId] : prev.filter((x) => x !== m.userId)
                          );
                        }}
                      />
                      <span>{m.displayName}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="event-description">Notes (optional)</Label>
            <Textarea
              id="event-description"
              placeholder="Notes, location, who's coming…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

      </div>
    </BottomSheet>
  );
};