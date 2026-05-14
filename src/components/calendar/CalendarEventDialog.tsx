import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { MapPin, Clock, Calendar as CalendarIcon, User, Pencil, Trash2 } from "lucide-react";
import type { CalendarEvent } from "@/hooks/useCalendarEvents";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useDeleteManualEvent } from "@/hooks/useManualCalendarEvents";
import { useToast } from "@/hooks/use-toast";

interface CalendarEventDialogProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (event: CalendarEvent) => void;
}

export const CalendarEventDialog = ({
  event,
  open,
  onOpenChange,
  onEdit,
}: CalendarEventDialogProps) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteEvent = useDeleteManualEvent();
  const { toast } = useToast();

  if (!event) return null;

  const startDate = parseISO(event.start);
  const endDate = parseISO(event.end);
  const isManual = event.calendarId === "manual" && !!event.manualEventId;

  const handleDelete = async () => {
    if (!event.manualEventId) return;
    try {
      await deleteEvent.mutateAsync(event.manualEventId);
      toast({ title: "Event deleted" });
      setConfirmOpen(false);
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Couldn't delete event", description: "Please try again.", variant: "destructive" });
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-8">
            <div
              className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
              style={{ backgroundColor: event.color }}
            />
            <DialogTitle className="text-left flex-1">{event.title}</DialogTitle>
            {isManual && (
              <div className="flex items-center gap-1 -mt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Edit event"
                  onClick={() => {
                    onEdit?.(event);
                    onOpenChange(false);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  aria-label="Delete event"
                  onClick={() => setConfirmOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              {event.allDay ? (
                <p>{format(startDate, "EEEE, MMMM d, yyyy")}</p>
              ) : (
                <>
                  <p>{format(startDate, "EEEE, MMMM d, yyyy")}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p>{event.location}</p>
            </div>
          )}

          {/* Calendar owner */}
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p>{event.calendarName}</p>
              <p className="text-sm text-muted-foreground">{event.calendarOwner}</p>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="flex items-start gap-3">
              <CalendarIcon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-sm whitespace-pre-wrap">{event.description}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title="Delete this event?"
      description="This will remove the event from your family calendar. This action cannot be undone."
      confirmLabel="Delete"
      variant="destructive"
      onConfirm={handleDelete}
    />
    </>
  );
};
