import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Plus, Eye, EyeOff, Settings, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCalendarConnections, type CalendarConnection } from "@/hooks/useCalendarConnections";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CalendarSidebarProps {
  currentDate: Date;
  onDateSelect: (date: Date) => void;
  onConnectCalendar: () => void;
}

export const CalendarSidebar = ({
  currentDate,
  onDateSelect,
  onConnectCalendar,
}: CalendarSidebarProps) => {
  const { connections, updateConnection, disconnectCalendar } = useCalendarConnections();
  const [disconnectId, setDisconnectId] = useState<string | null>(null);

  const handleToggleVisibility = (connection: CalendarConnection) => {
    updateConnection.mutate({
      connectionId: connection.id,
      isVisible: !connection.is_visible,
    });
  };

  const handleDisconnect = () => {
    if (disconnectId) {
      disconnectCalendar.mutate(disconnectId);
      setDisconnectId(null);
    }
  };

  return (
    <div className="w-64 border-r bg-card p-4 flex flex-col gap-4">
      {/* Mini calendar */}
      <Calendar
        mode="single"
        selected={currentDate}
        onSelect={(date) => date && onDateSelect(date)}
        className="rounded-md border"
      />

      {/* Connected calendars */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Calendars</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onConnectCalendar}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {connections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No calendars connected yet.
          </p>
        ) : (
          <div className="space-y-2">
            {connections.map((connection) => (
              <div
                key={connection.id}
                className="flex items-center gap-2 group"
              >
                <button
                  onClick={() => handleToggleVisibility(connection)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  {connection.is_visible ? (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: connection.color }}
                />
                
                <span
                  className={cn(
                    "flex-1 text-sm truncate",
                    !connection.is_visible && "text-muted-foreground line-through"
                  )}
                >
                  {connection.display_name}
                </span>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDisconnectId(connection.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Disconnect
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disconnect confirmation */}
      <AlertDialog open={!!disconnectId} onOpenChange={() => setDisconnectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Calendar?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the calendar from your family view. You can reconnect it anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect}>
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
