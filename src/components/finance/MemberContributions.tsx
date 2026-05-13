import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useHouseholdMembers } from "@/hooks/useHouseholdMembers";
import { useMemberContributions } from "@/hooks/useMemberContributions";
import { formatINR } from "@/lib/formatINR";
import { Users } from "lucide-react";

interface Props {
  householdId: string | null;
  month: string;
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "M";

export const MemberContributions = ({ householdId, month }: Props) => {
  const { data: members, isLoading: membersLoading } =
    useHouseholdMembers(householdId);
  const { data: totals, isLoading: totalsLoading } = useMemberContributions(
    householdId,
    month,
  );

  // Single-member households: hide entirely.
  if (!membersLoading && (members?.length ?? 0) <= 1) return null;

  const grandTotal = Object.values(totals || {}).reduce((a, b) => a + b, 0);

  const rows = (members || [])
    .map((m) => ({
      ...m,
      total: totals?.[m.userId] ?? 0,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-sm font-semibold">Member contributions this month</h2>
        </div>

        {membersLoading || totalsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => {
              const pct =
                grandTotal > 0 ? Math.round((r.total / grandTotal) * 100) : 0;
              const noIncome = r.total === 0;
              return (
                <li key={r.userId} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      {r.avatarUrl && <AvatarImage src={r.avatarUrl} alt="" />}
                      <AvatarFallback className="text-[10px]">
                        {initialsOf(r.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate flex-1">
                      {r.displayName}
                    </span>
                    {noIncome ? (
                      <span className="text-xs text-muted-foreground">
                        ₹0 — No income added yet
                      </span>
                    ) : (
                      <span className="text-sm font-semibold tabular-nums">
                        {formatINR(r.total)}
                        <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                          {pct}%
                        </span>
                      </span>
                    )}
                  </div>
                  <div
                    className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {grandTotal > 0 && !membersLoading && !totalsLoading && (
          <p className="text-[11px] text-muted-foreground pt-1 border-t">
            Total household income: <span className="font-medium text-foreground">{formatINR(grandTotal)}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
};