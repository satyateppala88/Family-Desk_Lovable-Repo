import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { CalendarEventDialog } from "@/components/calendar/CalendarEventDialog";
import { ConnectCalendarDialog } from "@/components/calendar/ConnectCalendarDialog";
import { useCalendarEvents, type CalendarEvent } from "@/hooks/useCalendarEvents";
import { useCalendarConnections } from "@/hooks/useCalendarConnections";
import { Skeleton } from "@/components/ui/skeleton";

const Calendar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showConnectDialog, setShowConnectDialog] = useState(false);

  const { data: events, isLoading } = useCalendarEvents(currentDate, "month");
  const { handleOAuthCallback } = useCalendarConnections();

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
      <Header />
      
      <main className="flex-1 flex flex-col pb-20">
        <CalendarHeader
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onConnectCalendar={() => setShowConnectDialog(true)}
        />

        {/* Main calendar area - now full width */}
        <div className="flex-1 flex flex-col">
          {isLoading ? (
            <div className="flex-1 p-4">
              <Skeleton className="h-full w-full" />
            </div>
          ) : (
            <CalendarGrid
              currentDate={currentDate}
              events={events || []}
              onEventClick={setSelectedEvent}
              onDateClick={setCurrentDate}
            />
          )}
        </div>
      </main>

      <Footer />
      <MobileNav />

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
    </div>
  );
};

export default Calendar;
