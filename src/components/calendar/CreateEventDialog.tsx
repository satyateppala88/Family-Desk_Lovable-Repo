import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import {
  useCreateManualEvent,
  useUpdateManualEvent,
  useUpdateRecurringEvent,
  type RecurringEditScope,
} from "@/hooks/useManualCalendarEvents";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { useHousehold } from "@/hooks/useHousehold";
import { useHouseholdMembers } from "@/hooks/useHouseholdMembers";
import { RecurrencePicker } from "@/components/shared/RecurrencePicker";
import type { RecurrenceSpec } from "@/types/recurrence";
import type { CalendarEvent } from "@/hooks/useCalendarEvents";

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
  eventToEdit?: CalendarEvent | null;
  recurrenceScope?: RecurringEditScope;
}

export const CreateEventDialog = ({ open, onOpenChange, defaultDate, eventToEdit, recurrenceScope }: CreateEventDialogProps) => {
  const { toast } = useToast();
  const createEvent = useCreateManualEvent();
  const updateEvent = useUpdateManualEvent();
  const updateRecurringEvent = useUpdateRecurringEvent();
  const { householdId } = useHousehold();
  const { data: members = [] } = useHouseholdMembers(householdId);
  const isEdit = !!eventToEdit?.manualEventId;

  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date | undefined>(defaultDate ?? new Date());
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceSpec | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  // Inline validation error for the time field. Shown when the user submits
  // with an empty time and All-day is OFF — instead of silently converting
  // the event to all-day (which surprised users in BUG-FIX-06).
  const [timeError, setTimeError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (eventToEdit) {
      const start = parseISO(eventToEdit.start);
      setTitle(eventToEdit.title || "");
      setDate(start);
      setTime(eventToEdit.allDay ? "" : format(start, "HH:mm"));
      setDescription(eventToEdit.description || "");
      setAllDay(eventToEdit.allDay);
      setRecurrence(eventToEdit.recurrence ?? null);
      setSelectedMembers(
        eventToEdit.memberIds && eventToEdit.memberIds.length > 0
          ? eventToEdit.memberIds
          : members.map((m) => m.userId),
      );
    } else {
      setTitle("");
      setDate(defaultDate ?? new Date());
      setTime("");
      setDescription("");
      setAllDay(false);
      setRecurrence(null);
      setSelectedMembers(members.map((m) => m.userId));
    }
    setTimeError(null);
  }, [open, defaultDate, members, eventToEdit]);

  // Clearing the All-day toggle should clear any stale time-required error
  // the moment the user toggles it on (since time is no longer needed).
  useEffect(() => {
    if (allDay) setTimeError(null);
  }, [allDay]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: "Title required", description: "Please enter a title for the event.", variant: "destructive" });
      return;
    }
    if (!date) {
      toast({ title: "Date required", description: "Please pick a date for the event.", variant: "destructive" });
      return;
    }
    if (!allDay && !time) {
      setTimeError("Please enter a time, or toggle All day above.");
      // Move focus to the time input so the user can act on the error.
      const el = document.getElementById("event-time") as HTMLInputElement | null;
      el?.focus();
      return;
    }
    setTimeError(null);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        date,
        time: allDay ? null : (time || null),
        allDay,
        recurrence,
        memberIds: selectedMembers,
      };
      if (isEdit && eventToEdit?.manualEventId) {
        if (recurrenceScope && eventToEdit.recurrence) {
          const occurrenceDate =
            eventToEdit.occurrenceDate ?? format(parseISO(eventToEdit.start), "yyyy-MM-dd");
          await updateRecurringEvent.mutateAsync({
            id: eventToEdit.manualEventId,
            scope: recurrenceScope,
            occurrenceDate,
            ...payload,
          });
        } else {
          await updateEvent.mutateAsync({ id: eventToEdit.manualEventId, ...payload });
        }
        toast({ title: "Event updated", description: "Your changes have been saved." });
      } else {
        await createEvent.mutateAsync(payload);
        toast({ title: "Event added", description: "Your event has been added to the calendar." });
      }
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: isEdit ? "Couldn't update event" : "Couldn't add event", description: "Please try again.", variant: "destructive" });
    }
  };

  const pending = createEvent.isPending || updateEvent.isPending || updateRecurringEvent.isPending;

  return (
    <BottomSheet
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={isEdit ? "Edit Event" : "Create Event"}
      description={isEdit ? "Update this event on your family calendar." : "Add a manual event to your family calendar."}
      footer={
        <Button onClick={handleSubmit} disabled={pending} className="w-full">
          {pending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{isEdit ? "Saving…" : "Adding…"}</>
          ) : (
            isEdit ? "Update Event" : "Save Event"
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
            <DatePicker value={date} onChange={setDate} />
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
              <Label htmlFor="event-time">Time</Label>
              <Input
                id="event-time"
                type="time"
                value={time}
                onChange={(e) => {
                  setTime(e.target.value);
                  if (e.target.value) setTimeError(null);
                }}
                aria-invalid={!!timeError}
                aria-describedby={timeError ? "event-time-error" : undefined}
              />
              {timeError && (
                <p id="event-time-error" className="text-xs text-destructive">
                  {timeError}
                </p>
              )}
            </div>
          )}

          <RecurrencePicker
            value={recurrence}
            onChange={setRecurrence}
            baseDate={date ?? new Date()}
            context="event"
          />

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