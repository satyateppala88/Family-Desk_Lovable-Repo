import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { CalendarEventDialog } from "@/components/calendar/CalendarEventDialog";
import { ConnectCalendarDialog } from "@/components/calendar/ConnectCalendarDialog";
import { CreateEventDialog } from "@/components/calendar/CreateEventDialog";
import { useCalendarEvents, type CalendarEvent } from "@/hooks/useCalendarEvents";
import { useCalendarConnections } from "@/hooks/useCalendarConnections";
import { useHousehold } from "@/hooks/useHousehold";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarDays, Plus } from "lucide-react";

const Calendar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { householdId } = useHousehold();
  const { data: events, isLoading } = useCalendarEvents(currentDate, "month");
  const { handleOAuthCallback } = useCalendarConnections();

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (code && state) {
      handleOAuthCallback.mutate({ code, state });
      setSearchParams({});
    }
  }, [searchParams, handleOAuthCallback, setSearchParams]);

  return (
    <div className="page-container">
      <Header />
      
      <main className="flex-1 flex flex-col pb-20">
        <div data-tour="calendar-nav" style={{ maxWidth: 'var(--content-max-width)', width: '100%', margin: '0 auto', paddingLeft: 'var(--page-padding-x)', paddingRight: 'var(--page-padding-x)' }}>
          <CalendarHeader
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onConnectCalendar={() => setShowConnectDialog(true)}
            onAddEvent={() => setShowCreateDialog(true)}
          />
        </div>

        <div className="flex-1 flex flex-col overflow-x-auto">
          {isLoading ? (
            <div className="flex-1 p-4">
              <Skeleton className="h-full w-full rounded-xl" />
            </div>
          ) : (events || []).length === 0 ? (
            <div style={{ maxWidth: 'var(--content-max-width)', width: '100%', margin: '0 auto', paddingLeft: 'var(--page-padding-x)', paddingRight: 'var(--page-padding-x)' }}>
              <EmptyState
                icon={CalendarDays}
                title="No events this week"
                description="Your calendar is wide open — a perfect chance to plan something fun or just enjoy the quiet."
                encouragement="Add a family event, sync your Google Calendar, or simply take it easy."
                action={{ label: "Add Event", onClick: () => setShowCreateDialog(true) }}
              />
            </div>
          ) : (
            <div data-tour="calendar-grid" style={{ maxWidth: 'var(--content-max-width)', width: '100%', margin: '0 auto', paddingLeft: 'var(--page-padding-x)', paddingRight: 'var(--page-padding-x)' }}>
              <CalendarGrid
                currentDate={currentDate}
                events={events || []}
                onEventClick={setSelectedEvent}
                onDateClick={setCurrentDate}
              />
            </div>
          )}
        </div>
      </main>

      <CalendarEventDialog
        event={selectedEvent}
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      />

      <ConnectCalendarDialog
        open={showConnectDialog}
        onOpenChange={setShowConnectDialog}
      />

      <CreateEventDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        defaultDate={currentDate}
      />
    </div>
  );
};

import { ModuleSetupGate } from "@/components/onboarding/ModuleSetupGate";
const CalendarWithGate = () => (
  <ModuleSetupGate module="calendar_setup">
    <Calendar />
  </ModuleSetupGate>
);
export default CalendarWithGate;
