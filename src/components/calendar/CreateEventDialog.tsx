import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
}

export const CreateEventDialog = ({ open, onOpenChange, defaultDate }: CreateEventDialogProps) => {
  const { toast } = useToast();
  const createEvent = useCreateManualEvent();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date | undefined>(defaultDate ?? new Date());
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [allDay, setAllDay] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDate(defaultDate ?? new Date());
      setTime("");
      setDescription("");
      setAllDay(false);
    }
  }, [open, defaultDate]);

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
      });
      toast({ title: "Event added", description: "Your event has been added to the calendar." });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Couldn't add event", description: err?.message || "Please try again.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
          <DialogDescription>Add a manual event to your family calendar.</DialogDescription>
        </DialogHeader>

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
            <Label htmlFor="event-description">Description (optional)</Label>
            <Textarea
              id="event-description"
              placeholder="Notes, location, who's coming…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <Button onClick={handleSubmit} disabled={createEvent.isPending} className="w-full">
            {createEvent.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding…</>
            ) : (
              "Add Event"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};