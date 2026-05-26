import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Eye, EyeOff, Loader2, Settings2 } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { useCalendarConnections } from "@/hooks/useCalendarConnections";
import { useState } from "react";

interface CalendarHeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onConnectCalendar: () => void;
  onAddEvent: () => void;
  onManageCalendars: () => void;
}

export const CalendarHeader = ({
  currentDate,
  onDateChange,
  onConnectCalendar,
  onAddEvent,
  onManageCalendars,
}: CalendarHeaderProps) => {
  const { connections, updateConnection } = useCalendarConnections();
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
          <Button
            size="sm"
            variant="outline"
            onClick={connections.length > 0 ? onManageCalendars : onConnectCalendar}
            data-tour="connect-calendar"
            className="shrink-0"
          >
            <Settings2 className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">
              {connections.length > 0 ? "Calendars" : "Connect"}
            </span>
          </Button>
        </div>
      </div>

      {/* Connected Calendars */}
      {connections.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          {connections.map((connection) => (
            <div
              key={connection.id}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/60 shrink-0 text-xs"
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
            </div>
          ))}
          <button
            onClick={onManageCalendars}
            className="shrink-0 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 px-1"
          >
            Manage
          </button>
        </div>
      )}
    </div>
  );
};
