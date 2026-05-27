import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHousehold } from "@/hooks/useHousehold";
import { useMonthlyReport } from "@/hooks/useMonthlyReport";
import { useReportTagline } from "@/hooks/useReportTagline";
import { ReportCard } from "@/components/finance/ReportCard";
import { ReportShareButton } from "@/components/finance/ReportShareButton";
import { MonthlyReportInsights } from "@/components/finance/MonthlyReportInsights";
import { format, addMonths, parse, startOfMonth } from "date-fns";

const FinanceReport = () => {
  const { householdId } = useHousehold();
  // Default to current month so the page opens on "this month" by default.
  // Users can navigate back via the < arrow if they want a closed prior month.
  const defaultMonth = format(startOfMonth(new Date()), "yyyy-MM");
  const [month, setMonth] = useState(defaultMonth);

  const { data: report, isLoading } = useMonthlyReport(month);
  const { data: tagline } = useReportTagline(householdId, month, report);

  const cardRef = useRef<HTMLDivElement>(null);

  const monthLabel = useMemo(() => format(parse(month + "-01", "yyyy-MM-dd", new Date()), "MMMM yyyy"), [month]);
  const isCurrentOrFuture = month >= format(new Date(), "yyyy-MM");

  const goPrev = () => setMonth(format(addMonths(parse(month + "-01", "yyyy-MM-dd", new Date()), -1), "yyyy-MM"));
  const goNext = () => setMonth(format(addMonths(parse(month + "-01", "yyyy-MM-dd", new Date()), 1), "yyyy-MM"));

  return (
    <div className="page-container">
      <Header />
      <main className="page-content space-y-4 animate-fade-in">
        <div className="flex items-center justify-between gap-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link to="/finance"><ArrowLeft className="h-4 w-4 mr-1" />Finance</Link>
          </Button>
          {report && tagline && <ReportShareButton cardRef={cardRef} report={report} tagline={tagline} />}
        </div>

        <div>
          <h1 className="page-heading">Monthly Report</h1>
          <p className="text-sm text-muted-foreground mt-0.5">A shareable recap of your household's month.</p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
          <Button variant="ghost" size="icon" onClick={goPrev} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium">{monthLabel}</div>
          <Button variant="ghost" size="icon" onClick={goNext} disabled={isCurrentOrFuture} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {isLoading || !report ? (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        ) : (
          <>
            <ReportCard ref={cardRef} report={report} tagline={tagline || ""} />
            <MonthlyReportInsights month={month} />
          </>
        )}
      </main>
    </div>
  );
};

export default FinanceReport;