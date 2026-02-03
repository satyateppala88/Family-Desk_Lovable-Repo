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
}

export const CalendarHeader = ({
  currentDate,
  onDateChange,
  onConnectCalendar,
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
    <div className="border-b bg-card">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">
            {format(currentDate, "MMMM yyyy")}
          </h1>
          
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button onClick={onConnectCalendar} data-tour="connect-calendar">
          <Plus className="h-4 w-4 mr-2" />
          Connect Calendar
        </Button>
      </div>

      {/* Connected Calendars Row */}
      {connections.length > 0 && (
        <div className="flex items-center gap-4 px-4 pb-3 flex-wrap">
          <span className="text-sm text-muted-foreground">Calendars:</span>
          {connections.map((connection) => (
            <div
              key={connection.id}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 group"
            >
              <button
                onClick={() => handleToggleVisibility(connection)}
                disabled={togglingId === connection.id}
                className="flex items-center gap-2 hover:bg-muted rounded px-1 py-0.5 transition-colors disabled:opacity-50"
              >
                {togglingId === connection.id ? (
                  <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                ) : connection.is_visible ? (
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: connection.color }}
                />
                <span
                  className={`text-sm ${
                    !connection.is_visible ? "text-muted-foreground line-through" : ""
                  }`}
                >
                  {connection.display_name}
                </span>
              </button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="ml-1 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    aria-label={`Remove ${connection.display_name} calendar`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Calendar</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to disconnect "{connection.display_name}" ({connection.google_account_email})? 
                      You can reconnect it later if needed.
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
