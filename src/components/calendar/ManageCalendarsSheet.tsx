import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2, Plus, Trash2, CalendarDays } from "lucide-react";
import { useCalendarConnections, type CalendarConnection } from "@/hooks/useCalendarConnections";
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

interface ManageCalendarsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnectCalendar: () => void;
}

export const ManageCalendarsSheet = ({ open, onOpenChange, onConnectCalendar }: ManageCalendarsSheetProps) => {
  const { connections, updateConnection, disconnectCalendar } = useCalendarConnections();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [pendingDisconnect, setPendingDisconnect] = useState<CalendarConnection | null>(null);

  const handleToggle = async (c: CalendarConnection) => {
    setTogglingId(c.id);
    try {
      await updateConnection.mutateAsync({ connectionId: c.id, isVisible: !c.is_visible });
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmDisconnect = () => {
    if (!pendingDisconnect) return;
    disconnectCalendar.mutate(pendingDisconnect.id);
    setPendingDisconnect(null);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>Connected calendars</SheetTitle>
            <SheetDescription>
              Calendars connected to your household. Toggle visibility or disconnect any calendar.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-3">
            {connections.length === 0 ? (
              <div className="flex flex-col items-center text-center py-8 gap-3">
                <CalendarDays className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="font-medium">No calendars connected yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Connect a Google Calendar to bring family events into one view.
                  </p>
                </div>
                <Button onClick={onConnectCalendar}>
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Google Calendar
                </Button>
              </div>
            ) : (
              <>
                {connections.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${!c.is_visible ? "line-through text-muted-foreground" : ""}`}>
                        {c.display_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{c.google_account_email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggle(c)}
                      disabled={togglingId === c.id}
                      aria-label={c.is_visible ? "Hide calendar" : "Show calendar"}
                      className="h-10 w-10 shrink-0"
                    >
                      {togglingId === c.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : c.is_visible ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPendingDisconnect(c)}
                      aria-label={`Disconnect ${c.display_name}`}
                      className="h-10 w-10 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button variant="outline" className="w-full" onClick={onConnectCalendar}>
                  <Plus className="h-4 w-4 mr-2" />
                  Connect another calendar
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!pendingDisconnect} onOpenChange={(o) => !o && setPendingDisconnect(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect calendar?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDisconnect && (
                <>Disconnect "{pendingDisconnect.display_name}" ({pendingDisconnect.google_account_email}) from your household? You can reconnect it anytime.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDisconnect}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
