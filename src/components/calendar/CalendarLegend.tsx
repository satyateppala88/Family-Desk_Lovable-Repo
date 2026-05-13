import { useCalendarConnections } from "@/hooks/useCalendarConnections";

export const CalendarLegend = () => {
  const { connections } = useCalendarConnections();

  const visibleConnections = connections.filter((c) => c.is_visible);

  return (
    <div className="flex items-center gap-4 px-4 py-2 border-t bg-muted/30">
      <span className="text-sm text-muted-foreground">Showing:</span>
      <div className="flex items-center gap-3 flex-wrap">
        {visibleConnections.map((connection) => (
          <div key={connection.id} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: connection.color }}
            />
            <span className="text-sm">{connection.display_name}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#F97316" }} />
          <span className="text-sm">Festivals</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#3B82F6" }} />
          <span className="text-sm">National holidays</span>
        </div>
      </div>
    </div>
  );
};
