import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Eye, EyeOff, X, Loader2 } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { useCalendarConnections } from "@/hooks/useCalendarConnections";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface CalendarHeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onConnectCalendar: () => void;
  onAddEvent: () => void;
}

export const CalendarHeader = ({
  currentDate,
  onDateChange,
  onConnectCalendar,
  onAddEvent,
}: CalendarHeaderProps) => {
  const { connections, updateConnection, disconnectCalendar } = useCalendarConnections();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  
  const goToPreviousMonth = () => onDateChange(subMonths(currentDate, 1));
  const goToNextMonth = () => onDateChange(addMonths(currentDate, 1));
  const goToToday = () => onDateChange(new Date());

  const handleToggleVisibility = async (connection: typeof connections[0]) => {
    setTogglingId(connection.id);
    try {
      await updateConnection.mutateAsync({
        connectionId: connection.id,
        isVisible: !connection.is_visible,
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleRemoveCalendar = (connectionId: string) => {
    disconnectCalendar.mutate(connectionId);
  };

  return (
    <div className="pb-3 space-y-3">
      {/* Top row: month + nav */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-lg font-semibold tracking-tight truncate">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" onClick={goToPreviousMonth} className="h-8 w-8" style={{ minHeight: "32px" }}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToToday} className="h-8 px-2.5 text-xs">
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={goToNextMonth} className="h-8 w-8" style={{ minHeight: "32px" }}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" onClick={onAddEvent} className="shrink-0">
            <Plus className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Add Event</span>
          </Button>
          <Button size="sm" variant="outline" onClick={onConnectCalendar} data-tour="connect-calendar" className="shrink-0">
            <span>Connect</span>
          </Button>
        </div>
      </div>

      {/* Connected Calendars */}
      {connections.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          {connections.map((connection) => (
            <div
              key={connection.id}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/60 shrink-0 group text-xs"
            >
              <button
                onClick={() => handleToggleVisibility(connection)}
                disabled={togglingId === connection.id}
                className="flex items-center gap-1.5 hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                {togglingId === connection.id ? (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                ) : connection.is_visible ? (
                  <Eye className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <EyeOff className="h-3 w-3 text-muted-foreground" />
                )}
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: connection.color }}
                />
                <span className={!connection.is_visible ? "text-muted-foreground line-through" : ""}>
                  {connection.display_name}
                </span>
              </button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="ml-0.5 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    aria-label={`Remove ${connection.display_name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Calendar</AlertDialogTitle>
                    <AlertDialogDescription>
                      Disconnect "{connection.display_name}" ({connection.google_account_email})?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleRemoveCalendar(connection.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
