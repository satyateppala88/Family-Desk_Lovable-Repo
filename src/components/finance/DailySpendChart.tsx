import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { useDailySpend } from "@/hooks/useFinanceTrends";
import { formatINRCompact, formatINR } from "@/lib/formatINR";

interface Props {
  householdId: string | null;
  month: string;
}

export const DailySpendChart = ({ householdId, month }: Props) => {
  const { data, isLoading } = useDailySpend(householdId, month);
  if (isLoading || !data) return null;
  const total = data.reduce((s, d) => s + d.amount, 0);
  if (total === 0) return null;

  const max = Math.max(...data.map((d) => d.amount));
  const peak = data.find((d) => d.amount === max);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          Daily spending pattern
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-32 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                interval={4}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatINRCompact(v)}
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--accent) / 0.4)" }}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [formatINR(v), "Spent"]}
                labelFormatter={(d) => `Day ${d}`}
              />
              <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.isWeekend ? "hsl(var(--module-finance) / 0.45)" : "hsl(var(--module-finance))"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {peak && peak.amount > 0 && (
          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            Highest spend on day {peak.day}: {formatINR(peak.amount)} · weekends shown lighter
          </p>
        )}
      </CardContent>
    </Card>
  );
};