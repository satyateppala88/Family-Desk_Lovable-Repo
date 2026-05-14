import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { format, isSameDay, parseISO } from "date-fns";
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
import { ModuleNudgeBanner } from "@/components/discovery/ModuleNudgeBanner";
import { CalendarDays, Plus } from "lucide-react";

const Calendar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

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
          <ModuleNudgeBanner
            moduleKey="calendar"
            text="Add a shared event and every household member gets it on their view automatically."
          />
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
                title="Your family calendar is clear"
                description="Add events manually or connect Google Calendar. FamilyDesk will remind you before festivals, birthdays, and anything else that matters to your household."
                encouragement="Add a family event, sync your Google Calendar, or simply take it easy."
                action={{ label: "Add Event", onClick: () => setShowCreateDialog(true) }}
              />
            </div>
          ) : (
            <div data-tour="calendar-grid" style={{ maxWidth: 'var(--content-max-width)', width: '100%', margin: '0 auto', paddingLeft: 'var(--page-padding-x)', paddingRight: 'var(--page-padding-x)' }}>
              <CalendarGrid
                currentDate={currentDate}
                events={events || []}
                onEventClick={(ev) => {
                  if (ev.calendarId === "system") return;
                  setSelectedEvent(ev);
                }}
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
        onEdit={(ev) => {
          setSelectedEvent(null);
          setEditingEvent(ev);
        }}
      />

      <ConnectCalendarDialog
        open={showConnectDialog}
        onOpenChange={setShowConnectDialog}
      />

      <CreateEventDialog
        open={showCreateDialog || !!editingEvent}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingEvent(null);
          } else {
            setShowCreateDialog(true);
          }
        }}
        defaultDate={currentDate}
        eventToEdit={editingEvent}
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
