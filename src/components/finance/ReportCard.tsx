import { forwardRef } from "react";
import { formatINR } from "@/lib/formatINR";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";
import type { MonthlyReportData } from "@/hooks/useMonthlyReport";

interface ReportCardProps {
  report: MonthlyReportData;
  tagline: string;
}

const BRAND_GREEN = "#0F6E56";
const BRAND_CREAM = "#F1EFE8";
const INK = "#2C2C2A";
const MUTED = "#888780";
const CAT_NAME = "#6B6965";
const TRACK_BG = "#E8E4D9";
const BAR_COLORS = ["#0F6E56", "#4A9B7F", "#8FBFB0"];

const formatAmount = (amount: number): string =>
  amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

const formatAmountCompact = (amount: number): string => {
  if (amount >= 100000) {
    const lakhs = amount / 100000;
    return `₹${lakhs.toFixed(1)}L`;
  }
  return formatAmount(amount);
};

export const ReportCard = forwardRef<HTMLDivElement, ReportCardProps>(({ report, tagline }, ref) => {
  const maxValue = Math.max(...report.topCategories.map((c) => c.amount), 0);
  if (import.meta.env.DEV) {
    // B3 diagnostic: confirm bar widths align with category amounts
    console.log("[ReportCard bars]", { maxValue, categories: report.topCategories });
  }
  const { isPrivate } = usePrivacyMode();
  const money = (n: number) => (isPrivate ? "₹ ••••" : formatINR(n));
  const moneyAmount = (n: number) => (isPrivate ? "₹ ••••" : formatAmount(n));
  const moneyCompact = (n: number) => (isPrivate ? "₹ ••••" : formatAmountCompact(n));

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
        <StatCard label="Total spent" value={money(report.spent)} accent={BRAND_GREEN} />
        <StatCard label="Total saved" value={money(report.saved)} accent={BRAND_GREEN} positive={report.saved >= 0} />
        <StatCard label="Habits done" value={`${report.habits.percent}%`} accent={BRAND_GREEN} />
        <StatCard label="Meals at home" value={`${report.mealsCooked} days`} accent={BRAND_GREEN} />
      </div>

      {/* Top categories */}
      <div>
        <h3 className="text-sm font-semibold mb-2" style={{ color: INK }}>Top spending categories</h3>
        {report.topCategories.length === 0 ? (
          <p className="text-sm" style={{ color: MUTED }}>No expenses recorded this month.</p>
        ) : (
          <div className="space-y-2">
            {report.topCategories.map((cat, i) => {
              const widthPercent = maxValue > 0 ? (cat.amount / maxValue) * 100 : 0;
              return (
                <div key={cat.key} className="flex items-center gap-2 min-h-[48px]">
                  <div
                    className="text-right text-[13px] leading-tight line-clamp-2 shrink-0"
                    style={{ width: 110, color: CAT_NAME }}
                  >
                    {cat.label}
                  </div>
                  <div
                    className="flex-1 overflow-hidden rounded-full"
                    style={{ backgroundColor: TRACK_BG, height: 10 }}
                  >
                    <div
                      className="rounded-full transition-all"
                      style={{
                        width: `${widthPercent}%`,
                        height: 10,
                        backgroundColor: BAR_COLORS[i] || BAR_COLORS[BAR_COLORS.length - 1],
                      }}
                    />
                  </div>
                  <div
                    className="text-left text-[13px] font-bold shrink-0 truncate"
                    style={{ width: 90, color: INK }}
                  >
                    <span className="hidden min-[360px]:inline">{moneyAmount(cat.amount)}</span>
                    <span className="inline min-[360px]:hidden">{moneyCompact(cat.amount)}</span>
                  </div>
                </div>
              );
            })}
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