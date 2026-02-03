import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { useTodayEvents } from "@/hooks/useCalendarEvents";
import { useCalendarConnections } from "@/hooks/useCalendarConnections";
import { Skeleton } from "@/components/ui/skeleton";

export const DashboardCalendarWidget = () => {
  const today = format(new Date(), "EEEE, MMMM d");
  const { data: events, isLoading } = useTodayEvents();
  const { connections } = useCalendarConnections();

  const hasConnections = connections.length > 0;

  return (
    <Link to="/calendar" className="block hover:scale-[1.02] transition-transform">
      <Card className="h-full border-l-4 border-l-[hsl(215,75%,55%)]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" style={{ color: "hsl(215, 75%, 55%)" }} />
              <span>Calendar</span>
            </div>
            {hasConnections && events && events.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                {events.length} event{events.length !== 1 ? "s" : ""} today
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <p className="text-xs text-muted-foreground">Today</p>
            <p className="text-base font-semibold">{today}</p>
          </div>

          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : !hasConnections ? (
            <p className="text-xs text-muted-foreground">
              Connect your Google Calendar to see events
            </p>
          ) : events && events.length > 0 ? (
            <div className="space-y-1.5">
              {events.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-1.5 text-sm"
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: event.color }}
                  />
                  <span className="font-medium text-xs">
                    {event.allDay
                      ? "All day"
                      : format(parseISO(event.start), "h:mm a")}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {event.title}
                  </span>
                </div>
              ))}
              {events.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{events.length - 3} more events
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No events scheduled for today
            </p>
          )}

          <div className="flex items-center justify-end gap-1 text-sm font-medium mt-2" style={{ color: "hsl(215, 75%, 55%)" }}>
            View calendar <ArrowRight className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
