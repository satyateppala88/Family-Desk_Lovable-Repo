import { Check, UserPlus, Flag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { challengeDayInfo } from "@/hooks/useChallenges";
import type { ChallengeWithDetails } from "@/types/habits";

interface Member {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

interface Props {
  challenge: ChallengeWithDetails;
  members: Member[];
  currentUserId: string | null;
  compact?: boolean;
  onMarkDone: (challengeId: string) => void;
  onJoin?: (challengeId: string) => void;
  onInvite?: (challengeId: string) => void;
  onAbandon?: (challengeId: string) => void;
  isMutating?: boolean;
}

const initials = (name: string) =>
  name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

export const ChallengeCard = ({
  challenge,
  members,
  currentUserId,
  compact,
  onMarkDone,
  onJoin,
  onInvite,
  onAbandon,
  isMutating,
}: Props) => {
  const { dayNumber, daysRemaining } = challengeDayInfo(challenge);
  const participantIds = new Set(challenge.participants.map((p) => p.user_id));
  const completedIds = new Set(challenge.todayLogs.map((l) => l.user_id));

  const participantMembers = members.filter((m) => participantIds.has(m.userId));
  const totalParticipants = participantMembers.length;
  const completedToday = participantMembers.filter((m) => completedIds.has(m.userId)).length;
  const pct = totalParticipants > 0 ? Math.round((completedToday / totalParticipants) * 100) : 0;

  const isParticipant = currentUserId ? participantIds.has(currentUserId) : false;
  const userDoneToday = currentUserId ? completedIds.has(currentUserId) : false;

  const nonParticipants = members.filter((m) => !participantIds.has(m.userId));

  // Progress ring
  const size = compact ? 44 : 64;
  const stroke = compact ? 5 : 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;

  return (
    <Card className="border-primary/20">
      <CardContent className={cn("p-4 space-y-3", compact && "p-3 space-y-2")}>
        <div className="flex items-start gap-3">
          <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
              <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(var(--muted))" strokeWidth={stroke} fill="none" />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="hsl(var(--primary))"
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
              {pct}%
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn("text-xl", compact && "text-lg")} aria-hidden="true">{challenge.emoji}</span>
              <h3 className={cn("font-semibold truncate", compact ? "text-sm" : "text-base")}>{challenge.name}</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Day {dayNumber} of {challenge.duration_days} · {daysRemaining} day{daysRemaining === 1 ? "" : "s"} left
            </p>
          </div>
        </div>

        {!compact && challenge.description && (
          <p className="text-xs text-muted-foreground">{challenge.description}</p>
        )}

        {/* Member status row */}
        {participantMembers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {participantMembers.map((m) => {
              const done = completedIds.has(m.userId);
              return (
                <div key={m.userId} className="flex items-center gap-1.5 rounded-full border bg-background px-2 py-1">
                  <Avatar className="h-5 w-5">
                    {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt="" />}
                    <AvatarFallback className="text-[10px]">{initials(m.displayName)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{m.displayName.split(" ")[0]}</span>
                  <span className={cn("text-xs", done ? "text-[hsl(var(--success,142_70%_40%))]" : "text-muted-foreground")}>
                    {done ? "✓" : "○"}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {isParticipant ? (
            <Button
              size="sm"
              onClick={() => onMarkDone(challenge.id)}
              disabled={userDoneToday || isMutating}
              variant={userDoneToday ? "outline" : "default"}
            >
              {userDoneToday ? (<><Check className="h-4 w-4 mr-1" /> Done today</>) : "Mark today done"}
            </Button>
          ) : onJoin ? (
            <Button size="sm" onClick={() => onJoin(challenge.id)} disabled={isMutating}>
              Join challenge
            </Button>
          ) : null}

          {onInvite && nonParticipants.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => onInvite(challenge.id)} disabled={isMutating}>
              <UserPlus className="h-4 w-4 mr-1" /> Invite family
            </Button>
          )}

          {!compact && onAbandon && (
            <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground" onClick={() => onAbandon(challenge.id)}>
              <Flag className="h-4 w-4 mr-1" /> End
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};