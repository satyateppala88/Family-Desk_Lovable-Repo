import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RecurrencePattern, RecurrenceType } from "@/lib/recurrence";

interface Props {
  value: RecurrencePattern | null;
  onChange: (pattern: RecurrencePattern | null) => void;
}

const WEEKDAYS = [
  ["0", "Sunday"],
  ["1", "Monday"],
  ["2", "Tuesday"],
  ["3", "Wednesday"],
  ["4", "Thursday"],
  ["5", "Friday"],
  ["6", "Saturday"],
] as const;

const MONTH_DAYS = [
  "1",
  "5",
  "10",
  "15",
  "20",
  "25",
  "last",
] as const;

export const RecurrenceSelector = ({ value, onChange }: Props) => {
  const type: RecurrenceType | "none" = value?.type ?? "none";

  const setType = (t: string) => {
    if (t === "none") return onChange(null);
    const next: RecurrencePattern = { type: t as RecurrenceType };
    if (next.type === "weekly")
      next.config = { weekday: new Date().getDay() };
    if (next.type === "monthly" || next.type === "quarterly")
      next.config = { day: 1 };
    onChange(next);
  };

  return (
    <div className="grid gap-2">
      <Label>Repeat</Label>
      <div className="grid grid-cols-2 gap-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Doesn't repeat</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>

        {value?.type === "weekly" && (
          <Select
            value={String(value.config?.weekday ?? new Date().getDay())}
            onValueChange={(v) =>
              onChange({ type: "weekly", config: { weekday: parseInt(v) } })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEKDAYS.map(([v, label]) => (
                <SelectItem key={v} value={v}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {(value?.type === "monthly" || value?.type === "quarterly") && (
          <Select
            value={String(value.config?.day ?? 1)}
            onValueChange={(v) =>
              onChange({
                type: value.type,
                config: { day: v === "last" ? "last" : parseInt(v) },
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_DAYS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d === "last" ? "Last day of month" : `Day ${d}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
};