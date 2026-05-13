import { forwardRef } from "react";
import { formatINR } from "@/lib/formatINR";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import type { MonthlyReportData } from "@/hooks/useMonthlyReport";

interface ReportCardProps {
  report: MonthlyReportData;
  tagline: string;
}

const BRAND_GREEN = "#0F6E56";
const BRAND_CREAM = "#F1EFE8";
const INK = "#2C2C2A";
const MUTED = "#888780";

export const ReportCard = forwardRef<HTMLDivElement, ReportCardProps>(({ report, tagline }, ref) => {
  const chartData = report.topCategories.map((c) => ({ name: c.label, value: c.amount }));

  return (
    <section
      ref={ref}
      id="report-card"
      style={{ backgroundColor: BRAND_CREAM, color: INK, fontFamily: "Poppins, sans-serif" }}
      className="rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm"
    >
      {/* Header */}
      <div className="border-b pb-4" style={{ borderColor: "#D3D1C7" }}>
        <div className="text-xs font-medium tracking-wide uppercase" style={{ color: BRAND_GREEN }}>
          FamilyDesk · Monthly Report
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold mt-1" style={{ color: INK }}>
          {report.householdName || "Your household"}
        </h2>
        <p className="text-sm mt-0.5" style={{ color: MUTED }}>
          {report.monthLabel}
        </p>
      </div>

      {/* 4 headline stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total spent" value={formatINR(report.spent)} accent={BRAND_GREEN} />
        <StatCard label="Total saved" value={formatINR(report.saved)} accent={BRAND_GREEN} positive={report.saved >= 0} />
        <StatCard label="Habits done" value={`${report.habits.percent}%`} accent={BRAND_GREEN} />
        <StatCard label="Meals at home" value={`${report.mealsCooked} days`} accent={BRAND_GREEN} />
      </div>

      {/* Top categories */}
      <div>
        <h3 className="text-sm font-semibold mb-2" style={{ color: INK }}>Top spending categories</h3>
        {chartData.length === 0 ? (
          <p className="text-sm" style={{ color: MUTED }}>No expenses recorded this month.</p>
        ) : (
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: INK }} axisLine={false} tickLine={false} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} label={{ position: "right", formatter: (v: any) => formatINR(Number(v)), fill: INK, fontSize: 11 }}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={BRAND_GREEN} fillOpacity={1 - i * 0.2} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-3">
        <SectionLine
          title="Habits"
          body={
            report.habits.total === 0
              ? "No habits tracked this month."
              : `${report.habits.completed} of ${report.habits.total} check-ins completed${report.habits.bestStreak ? ` — best streak ${report.habits.bestStreak} days` : ""}`
          }
        />
        <SectionLine title="Meals" body={`Cooked at home ${report.mealsCooked} ${report.mealsCooked === 1 ? "day" : "days"} this month`} />
        <SectionLine title="Tasks" body={`${report.tasksCompleted} ${report.tasksCompleted === 1 ? "task" : "tasks"} completed together`} />
      </div>

      {/* Tagline */}
      <div className="pt-4 border-t" style={{ borderColor: "#D3D1C7" }}>
        <p className="text-sm italic leading-relaxed" style={{ color: BRAND_GREEN }}>
          “{tagline}”
        </p>
        <p className="text-[10px] mt-3" style={{ color: MUTED }}>familydesk.in</p>
      </div>
    </section>
  );
});
ReportCard.displayName = "ReportCard";

const StatCard = ({ label, value, accent, positive }: { label: string; value: string; accent: string; positive?: boolean }) => (
  <div
    className="rounded-xl p-3"
    style={{ backgroundColor: "#FFFFFF", border: `1px solid #D3D1C7` }}
  >
    <div className="text-[11px] font-medium uppercase tracking-wide" style={{ color: MUTED }}>{label}</div>
    <div className="text-lg sm:text-xl font-bold mt-1" style={{ color: positive === false ? "#B45454" : accent }}>{value}</div>
  </div>
);

const SectionLine = ({ title, body }: { title: string; body: string }) => (
  <div>
    <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: BRAND_GREEN }}>{title}</div>
    <div className="text-sm mt-0.5" style={{ color: INK }}>{body}</div>
  </div>
);