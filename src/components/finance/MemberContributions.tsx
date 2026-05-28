import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useHouseholdMembers } from "@/hooks/useHouseholdMembers";
import { useMemberContributions } from "@/hooks/useMemberContributions";
import { formatINR } from "@/lib/formatINR";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";
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
  const { data: totalsByMember, isLoading: totalsLoading } = useMemberContributions(
    householdId,
    month,
  );

  // Single-member households: hide entirely.
  if (!membersLoading && (members?.length ?? 0) <= 1) return null;

  const empty = { income: 0, spent: 0, saved: 0 };
  const rows = (members || [])
    .map((m) => ({
      ...m,
      ...(totalsByMember?.[m.userId] ?? empty),
    }))
    .sort((a, b) => b.spent + b.income - (a.spent + a.income));

  const { isPrivate } = usePrivacyMode();
  const fmt = (v: number) => (v > 0 ? (isPrivate ? "₹ ••••" : formatINR(v)) : "—");

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-sm font-semibold">Member summary this month</h2>
        </div>

        {membersLoading || totalsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <ul className="space-y-2.5">
            {rows.map((r) => (
              <li key={r.userId} className="flex items-center gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  {r.avatarUrl && <AvatarImage src={r.avatarUrl} alt="" />}
                  <AvatarFallback className="text-[10px]">
                    {initialsOf(r.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.displayName}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums flex flex-wrap gap-x-2">
                    <span>Income <span className="fd-mono">{fmt(r.income)}</span></span>
                    <span>·</span>
                    <span>Spent <span className="fd-mono">{fmt(r.spent)}</span></span>
                    <span>·</span>
                    <span>Saved <span className="fd-mono">{fmt(r.saved)}</span></span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};