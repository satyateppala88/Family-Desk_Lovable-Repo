import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { format, isSameDay, parseISO } from "date-fns";
import { Header } from "@/components/layout/Header";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { CalendarEventDialog } from "@/components/calendar/CalendarEventDialog";
import { ConnectCalendarDialog } from "@/components/calendar/ConnectCalendarDialog";
import { CreateEventDialog } from "@/components/calendar/CreateEventDialog";
import { ManageCalendarsSheet } from "@/components/calendar/ManageCalendarsSheet";
import { useCalendarEvents, type CalendarEvent } from "@/hooks/useCalendarEvents";
import { useCalendarConnections } from "@/hooks/useCalendarConnections";
import { useHousehold } from "@/hooks/useHousehold";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ModuleNudgeBanner } from "@/components/discovery/ModuleNudgeBanner";
import { CalendarDays, Plus } from "lucide-react";
import { DayDetailSheet } from "@/components/calendar/DayDetailSheet";

const Calendar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showManageSheet, setShowManageSheet] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);

  const openDayDetail = (date: Date) => {
    setSelectedDate(date);
    setDayDetailOpen(true);
  };

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
            onManageCalendars={() => setShowManageSheet(true)}
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
                selectedDate={selectedDate}
                events={events || []}
                onEventClick={(ev) => {
                  if (ev.calendarId === "system") return;
                  setSelectedEvent(ev);
                }}
                onDateClick={setCurrentDate}
                onSelectDate={setSelectedDate}
                onOpenDay={openDayDetail}
              />
            </div>
          )}

          {/* Selected date events list */}
          {!!householdId && !isLoading && (
            <div style={{ maxWidth: 'var(--content-max-width)', width: '100%', margin: '0 auto', paddingLeft: 'var(--page-padding-x)', paddingRight: 'var(--page-padding-x)' }} className="mt-4 pb-8">
              {(() => {
                const selectedDateEvents = (events || []).filter((ev) =>
                  isSameDay(parseISO(ev.start), selectedDate)
                );
                const isTodaySelected = isSameDay(selectedDate, new Date());
                const dayLabel = format(selectedDate, "EEE");
                const dateLabel = format(selectedDate, "d MMMM yyyy");

                return (
                  <div className="space-y-3">
                    <div className="flex items-baseline gap-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{dayLabel}</p>
                        <p className="text-sm font-semibold">{dateLabel}</p>
                      </div>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {selectedDateEvents.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        {isTodaySelected
                          ? "No events today — tap + to add one"
                          : `No events on ${format(selectedDate, "EEEE, d MMMM")}`}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selectedDateEvents.map((event) => (
                          <div
                            key={event.id}
                            onClick={() => {
                              if (event.calendarId === "system") return;
                              setSelectedEvent(event);
                            }}
                            className="p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity min-h-[48px] flex items-center"
                            style={{
                              backgroundColor: event.color + "15",
                              borderLeft: `4px solid ${event.color}`,
                            }}
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">{event.title}</p>
                              {!event.allDay && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {format(parseISO(event.start), "h:mm a")}
                                  {event.end && ` - ${format(parseISO(event.end), "h:mm a")}`}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
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

      <ManageCalendarsSheet
        open={showManageSheet}
        onOpenChange={setShowManageSheet}
        onConnectCalendar={() => {
          setShowManageSheet(false);
          setShowConnectDialog(true);
        }}
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

      <DayDetailSheet
        open={dayDetailOpen}
        onOpenChange={setDayDetailOpen}
        date={selectedDate}
        events={(events || []).filter((ev) =>
          format(parseISO(ev.start), "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
        )}
        onEventClick={(ev) => {
          if (ev.calendarId === "system") return;
          setDayDetailOpen(false);
          setSelectedEvent(ev);
        }}
      />
    </div>
  );
};

export default Calendar;
