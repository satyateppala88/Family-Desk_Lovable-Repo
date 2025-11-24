import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

export const DashboardCalendarWidget = () => {
  const today = format(new Date(), "EEEE, MMMM d");

  return (
    <Link to="/calendar" className="block hover:scale-[1.02] transition-transform">
      <Card className="h-full border-l-4 border-l-[hsl(215,75%,55%)]">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-6 w-6" style={{ color: "hsl(215, 75%, 55%)" }} />
              <span>Calendar</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Today</p>
            <p className="text-lg font-semibold mt-1">{today}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            No events scheduled for today
          </p>
          <div className="flex items-center justify-end gap-1 text-sm font-medium mt-4" style={{ color: "hsl(215, 75%, 55%)" }}>
            View calendar <ArrowRight className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
