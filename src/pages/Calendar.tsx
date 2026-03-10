import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";

import { Footer } from "@/components/layout/Footer";
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

  // Feature-specific tour
  const { shouldShowTour, tourChecked, markTourComplete } = useFeatureTour("calendar");
  const [runOnboarding, setRunOnboarding] = useState(false);

  // Start tour automatically if user hasn't seen it
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

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (code && state) {
      handleOAuthCallback.mutate({ code, state });
      // Clear URL params
      setSearchParams({});
    }
  }, [searchParams, handleOAuthCallback, setSearchParams]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header onStartOnboarding={handleStartOnboarding} />
      
      <main className="flex-1 flex flex-col pb-20">
        <div data-tour="calendar-nav">
          <CalendarHeader
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onConnectCalendar={() => setShowConnectDialog(true)}
          />
        </div>

        {/* Main calendar area - now full width */}
        <div className="flex-1 flex flex-col">
          {isLoading ? (
            <div className="flex-1 p-4">
              <Skeleton className="h-full w-full" />
            </div>
          ) : (
            <div data-tour="calendar-grid">
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

      <Footer />
      

      {/* Event detail dialog */}
      <CalendarEventDialog
        event={selectedEvent}
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      />

      {/* Connect calendar dialog */}
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
