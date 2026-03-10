import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { CalendarEventDialog } from "@/components/calendar/CalendarEventDialog";
import { ConnectCalendarDialog } from "@/components/calendar/ConnectCalendarDialog";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { useCalendarEvents, type CalendarEvent } from "@/hooks/useCalendarEvents";
import { useCalendarConnections } from "@/hooks/useCalendarConnections";
import { useHousehold } from "@/hooks/useHousehold";
import { useFeatureTour } from "@/hooks/useFeatureTour";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarDays, Plus } from "lucide-react";
import type { Step } from "react-joyride";

const calendarTourSteps: Step[] = [
  {
    target: "body",
    content: "Welcome to Calendar! View and manage all your events in one place.",
    placement: "center",
    disableBeacon: true,
  },
  {
    target: "[data-tour='connect-calendar']",
    content: "Connect your Google Calendar to sync events automatically.",
    placement: "bottom",
  },
  {
    target: "[data-tour='calendar-nav']",
    content: "Navigate between months and return to today.",
    placement: "bottom",
  },
  {
    target: "[data-tour='calendar-grid']",
    content: "Click any event to see details. Tasks, meals, and external calendar events are color-coded.",
    placement: "center",
  },
  {
    target: ".user-menu",
    content: "Access settings and restart this tour anytime from the User Guide menu.",
    placement: "bottom",
  },
];

const Calendar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showConnectDialog, setShowConnectDialog] = useState(false);

  const { householdId } = useHousehold();
  const { data: events, isLoading } = useCalendarEvents(currentDate, "month");
  const { handleOAuthCallback } = useCalendarConnections();

  const { shouldShowTour, tourChecked, markTourComplete } = useFeatureTour("calendar");
  const [runOnboarding, setRunOnboarding] = useState(false);

  useEffect(() => {
    if (tourChecked && shouldShowTour && householdId) {
      setTimeout(() => setRunOnboarding(true), 500);
    }
  }, [tourChecked, shouldShowTour, householdId]);

  const handleStartOnboarding = () => setRunOnboarding(true);
  const handleOnboardingComplete = () => {
    setRunOnboarding(false);
    markTourComplete();
  };

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
      <Header onStartOnboarding={handleStartOnboarding} />
      
      <main className="flex-1 flex flex-col pb-20">
        <div data-tour="calendar-nav" style={{ maxWidth: 'var(--content-max-width)', width: '100%', margin: '0 auto', paddingLeft: 'var(--page-padding-x)', paddingRight: 'var(--page-padding-x)' }}>
          <CalendarHeader
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onConnectCalendar={() => setShowConnectDialog(true)}
          />
        </div>

        <div className="flex-1 flex flex-col overflow-x-auto">
          {isLoading ? (
            <div className="flex-1 p-4">
              <Skeleton className="h-full w-full rounded-xl" />
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

      <OnboardingTour
        run={runOnboarding}
        onComplete={handleOnboardingComplete}
        steps={calendarTourSteps}
        featureName="calendar"
      />
    </div>
  );
};

export default Calendar;
