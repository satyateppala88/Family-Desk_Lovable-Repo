import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { MapPin, Clock, Calendar as CalendarIcon, User } from "lucide-react";
import type { CalendarEvent } from "@/hooks/useCalendarEvents";

interface CalendarEventDialogProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CalendarEventDialog = ({
  event,
  open,
  onOpenChange,
}: CalendarEventDialogProps) => {
  if (!event) return null;

  const startDate = parseISO(event.start);
  const endDate = parseISO(event.end);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div
              className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
              style={{ backgroundColor: event.color }}
            />
            <DialogTitle className="text-left">{event.title}</DialogTitle>
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
  );
};
