import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Link to="/calendar" className="block">
      <Card className="h-full hover:shadow-sm transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span>Calendar</span>
            {hasConnections && events && events.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                {events.length} today
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm font-medium">{today}</p>

          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : !hasConnections ? (
            <p className="text-xs text-muted-foreground">Connect Google Calendar to see events</p>
          ) : events && events.length > 0 ? (
            <div className="space-y-1.5">
              {events.slice(0, 3).map((event) => (
                <div key={event.id} className="flex items-center gap-2 text-sm">
                  <span className="text-xs text-muted-foreground w-14 flex-shrink-0">
                    {event.allDay ? "All day" : format(parseISO(event.start), "h:mm a")}
                  </span>
                  <span className="truncate text-sm">{event.title}</span>
                </div>
              ))}
              {events.length > 3 && (
                <p className="text-xs text-muted-foreground">+{events.length - 3} more</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No events today</p>
          )}

          <p className="text-xs text-muted-foreground pt-1">View calendar →</p>
        </CardContent>
      </Card>
    </Link>
  );
};
