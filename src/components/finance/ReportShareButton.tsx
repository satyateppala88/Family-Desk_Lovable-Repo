import { useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import { formatINR } from "@/lib/formatINR";
import type { MonthlyReportData } from "@/hooks/useMonthlyReport";

interface Props {
  cardRef: React.RefObject<HTMLDivElement>;
  report: MonthlyReportData;
  tagline: string;
}

const buildTextSummary = (r: MonthlyReportData, tagline: string) => {
  const lines = [
    `${r.householdName || "Our household"} — ${r.monthLabel}`,
    "",
    `💸 Spent: ${formatINR(r.spent)}`,
    `💰 Saved: ${formatINR(r.saved)}`,
    `✅ Habits: ${r.habits.percent}% (${r.habits.completed}/${r.habits.total})${r.habits.bestStreak ? `, best streak ${r.habits.bestStreak}d` : ""}`,
    `🍳 Meals at home: ${r.mealsCooked} days`,
    `📋 Tasks done: ${r.tasksCompleted}`,
  ];
  if (r.topCategories.length) {
    lines.push("", "Top categories:");
    r.topCategories.forEach((c) => lines.push(`• ${c.label} — ${formatINR(c.amount)}`));
  }
  lines.push("", `"${tagline}"`, "", "Made with FamilyDesk · https://familydesk.in");
  return lines.join("\n");
};

export const ReportShareButton = ({ cardRef, report, tagline }: Props) => {
  const [busy, setBusy] = useState(false);

  const handleShare = async () => {
    setBusy(true);
    const text = buildTextSummary(report, tagline);
    const title = `${report.householdName || "Our household"} — ${report.monthLabel}`;
    try {
      // Try image share first (mobile)
      if (cardRef.current && typeof navigator !== "undefined" && navigator.share) {
        try {
          const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: "#F1EFE8" });
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], `familydesk-${report.month}.png`, { type: "image/png" });
          const navAny = navigator as any;
          if (navAny.canShare && navAny.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title, text } as any);
            setBusy(false);
            return;
          }
        } catch {
          // fall through to text share
        }
        try {
          await navigator.share({ title, text, url: "https://familydesk.in" });
          setBusy(false);
          return;
        } catch {
          // fall through
        }
      }
      // Clipboard fallback
      await navigator.clipboard.writeText(text);
      toast.success("Copied!", { description: "Report summary copied to clipboard." });
    } catch (e) {
      toast.error("Couldn't share", { description: "Try again in a moment." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={handleShare} size="sm" disabled={busy} className="gap-1.5">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
      Share
    </Button>
  );
};