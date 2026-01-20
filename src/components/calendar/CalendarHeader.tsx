import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Eye, EyeOff } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { useCalendarConnections } from "@/hooks/useCalendarConnections";

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
  const { connections, updateConnection } = useCalendarConnections();
  
  const goToPreviousMonth = () => onDateChange(subMonths(currentDate, 1));
  const goToNextMonth = () => onDateChange(addMonths(currentDate, 1));
  const goToToday = () => onDateChange(new Date());

  const handleToggleVisibility = (connection: typeof connections[0]) => {
    updateConnection.mutate({
      connectionId: connection.id,
      isVisible: !connection.is_visible,
    });
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

        <Button onClick={onConnectCalendar}>
          <Plus className="h-4 w-4 mr-2" />
          Connect Calendar
        </Button>
      </div>

      {/* Connected Calendars Row */}
      {connections.length > 0 && (
        <div className="flex items-center gap-4 px-4 pb-3 flex-wrap">
          <span className="text-sm text-muted-foreground">Calendars:</span>
          {connections.map((connection) => (
            <button
              key={connection.id}
              onClick={() => handleToggleVisibility(connection)}
              className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted transition-colors"
            >
              {connection.is_visible ? (
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
          ))}
        </div>
      )}
    </div>
  );
};
