import { useMemo } from 'react';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';
import {
  DAY_LABELS,
  RECURRENCE_DAYS,
  RecurrenceDay,
  RecurrenceFrequency,
  RecurrenceSpec,
  dayFromDateIndex,
} from '@/types/recurrence';

export type RecurrenceContext = 'event' | 'habit' | 'subscription';

interface RecurrencePickerProps {
  value: RecurrenceSpec | null;
  onChange: (spec: RecurrenceSpec | null) => void;
  baseDate: Date;
  context?: RecurrenceContext;
}

type FreqOption = 'none' | RecurrenceFrequency;

const ALL_DAYS: RecurrenceDay[] = [...RECURRENCE_DAYS];
const WEEKDAYS: RecurrenceDay[] = ['mon', 'tue', 'wed', 'thu', 'fri'];
const WEEKENDS: RecurrenceDay[] = ['sat', 'sun'];

const sameSet = (a: RecurrenceDay[] = [], b: RecurrenceDay[] = []) => {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((d) => sb.has(d));
};

const ord = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const Chip = ({
  active,
  onClick,
  children,
  className,
  type = 'button',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  type?: 'button';
}) => (
  <button
    type={type}
    onClick={onClick}
    className={cn(
      'h-9 px-3 rounded-full text-[13px] font-medium border transition-colors',
      active
        ? 'bg-[#0F6E56] text-white border-[#0F6E56]'
        : 'bg-white text-[#2C2C2A] border-[#D3D1C7] hover:bg-[#F1EFE8]',
      className,
    )}
  >
    {children}
  </button>
);

export const RecurrencePicker = ({
  value,
  onChange,
  baseDate,
  context = 'event',
}: RecurrencePickerProps) => {
  const baseDayIdx = baseDate.getDay();
  const baseDay = dayFromDateIndex(baseDayIdx);
  const baseDom = baseDate.getDate();
  const baseWeekOfMonth = Math.min(5, Math.ceil(baseDom / 7));

  const freq: FreqOption = value?.frequency ?? 'none';

  const freqOptions: { value: FreqOption; label: string }[] = useMemo(() => {
    if (context === 'subscription') {
      return [
        { value: 'none', label: 'Does not repeat' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'yearly', label: 'Yearly' },
      ];
    }
    return [
      { value: 'none', label: "Doesn't repeat" },
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'yearly', label: 'Yearly' },
    ];
  }, [context]);

  const setFrequency = (next: FreqOption) => {
    if (next === 'none') return onChange(null);
    const base: RecurrenceSpec = {
      frequency: next,
      interval: 1,
      end: { type: 'never' },
    };
    if (next === 'daily') base.days = ALL_DAYS;
    if (next === 'weekly') base.days = [baseDay];
    if (next === 'monthly') base.day_of_month = baseDom;
    onChange(base);
  };

  const update = (patch: Partial<RecurrenceSpec>) => {
    if (!value) return;
    onChange({ ...value, ...patch });
  };

  const updateEnd = (patch: Partial<RecurrenceSpec['end']>) => {
    if (!value) return;
    onChange({ ...value, end: { ...value.end, ...patch } });
  };

  const toggleDay = (d: RecurrenceDay) => {
    if (!value) return;
    const current = value.days ?? [];
    const next = current.includes(d) ? current.filter((x) => x !== d) : [...current, d];
    update({ days: next });
  };

  // ─────── Daily preset detection ───────
  const dailyPreset: 'every' | 'weekdays' | 'weekends' | 'custom' = useMemo(() => {
    if (freq !== 'daily' || !value) return 'every';
    const d = value.days ?? [];
    if (sameSet(d, ALL_DAYS)) return 'every';
    if (sameSet(d, WEEKDAYS)) return 'weekdays';
    if (sameSet(d, WEEKENDS)) return 'weekends';
    return 'custom';
  }, [freq, value]);

  const monthlyVariant: 'dom' | 'nth' =
    value?.frequency === 'monthly' && value?.week_of_month && !value?.day_of_month
      ? 'nth'
      : 'dom';

  return (
    <div className="space-y-3">
      {/* Frequency selector */}
      <div className="space-y-2">
        <Label>Repeat</Label>
        <div className="flex flex-wrap gap-2">
          {freqOptions.map((opt) => (
            <Chip key={opt.value} active={freq === opt.value} onClick={() => setFrequency(opt.value)}>
              {opt.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* DAILY sub-options */}
      {value?.frequency === 'daily' && context !== 'subscription' && (
        <div className="space-y-2">
          <Label className="text-[13px] text-[#6B6965]">Repeat on</Label>
          <div className="flex flex-wrap gap-2">
            <Chip active={dailyPreset === 'every'} onClick={() => update({ days: ALL_DAYS })}>
              Every day
            </Chip>
            <Chip active={dailyPreset === 'weekdays'} onClick={() => update({ days: WEEKDAYS })}>
              Weekdays
            </Chip>
            <Chip active={dailyPreset === 'weekends'} onClick={() => update({ days: WEEKENDS })}>
              Weekends
            </Chip>
            <Chip
              active={dailyPreset === 'custom'}
              onClick={() => update({ days: value.days?.length ? value.days : [baseDay] })}
            >
              Custom
            </Chip>
          </div>
          {dailyPreset === 'custom' && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {ALL_DAYS.map((d) => (
                <Chip
                  key={d}
                  active={(value.days ?? []).includes(d)}
                  onClick={() => toggleDay(d)}
                  className="h-9 w-9 px-0 justify-center"
                >
                  {DAY_LABELS[d]}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WEEKLY sub-options */}
      {value?.frequency === 'weekly' && context !== 'subscription' && (
        <div className="space-y-2">
          <Label className="text-[13px] text-[#6B6965]">Repeat on</Label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_DAYS.map((d) => (
              <Chip
                key={d}
                active={(value.days ?? []).includes(d)}
                onClick={() => toggleDay(d)}
                className="h-9 w-9 px-0 justify-center"
              >
                {DAY_LABELS[d]}
              </Chip>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[13px] text-[#6B6965]">Every</span>
            <Input
              type="number"
              min={1}
              max={52}
              value={value.interval}
              onChange={(e) =>
                update({ interval: Math.max(1, Math.min(52, Number(e.target.value) || 1)) })
              }
              className="w-20 h-9"
            />
            <span className="text-[13px] text-[#6B6965]">week(s)</span>
          </div>
        </div>
      )}

      {/* MONTHLY sub-options */}
      {value?.frequency === 'monthly' && (
        <div className="space-y-2">
          <Label className="text-[13px] text-[#6B6965]">Repeat on</Label>
          <div className="flex flex-wrap gap-2">
            <Chip
              active={monthlyVariant === 'dom'}
              onClick={() => update({ day_of_month: baseDom, week_of_month: undefined })}
            >
              On day {baseDom}
            </Chip>
            <Chip
              active={monthlyVariant === 'nth'}
              onClick={() => update({ week_of_month: baseWeekOfMonth, day_of_month: undefined })}
            >
              On the {ord(baseWeekOfMonth)} {format(baseDate, 'EEEE')}
            </Chip>
          </div>
        </div>
      )}

      {/* YEARLY read-only */}
      {value?.frequency === 'yearly' && (
        <p className="text-[13px] text-[#6B6965]">
          Repeats every year on {format(baseDate, 'd MMMM')}
        </p>
      )}

      {/* End condition */}
      {value && context !== 'habit' && (
        <div className="space-y-2 pt-2 border-t border-[#E8E4D9]">
          <Label className="text-[13px] text-[#6B6965]">Ends</Label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="rec-end"
                checked={value.end.type === 'never'}
                onChange={() => updateEnd({ type: 'never', occurrences: undefined, date: undefined })}
                className="accent-[#0F6E56]"
              />
              <span className="text-[14px] text-[#2C2C2A]">Never</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="rec-end"
                checked={value.end.type === 'after'}
                onChange={() => updateEnd({ type: 'after', occurrences: value.end.occurrences ?? 10, date: undefined })}
                className="accent-[#0F6E56]"
              />
              <span className="text-[14px] text-[#2C2C2A]">After</span>
              <Input
                type="number"
                min={1}
                max={365}
                value={value.end.occurrences ?? 10}
                disabled={value.end.type !== 'after'}
                onChange={(e) =>
                  updateEnd({
                    type: 'after',
                    occurrences: Math.max(1, Math.min(365, Number(e.target.value) || 1)),
                    date: undefined,
                  })
                }
                className="w-20 h-9"
              />
              <span className="text-[14px] text-[#6B6965]">occurrences</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="rec-end"
                checked={value.end.type === 'on_date'}
                onChange={() => updateEnd({ type: 'on_date', date: value.end.date ?? format(baseDate, 'yyyy-MM-dd'), occurrences: undefined })}
                className="mt-2.5 accent-[#0F6E56]"
              />
              <div className="flex-1 space-y-1">
                <span className="text-[14px] text-[#2C2C2A]">On date</span>
                <DatePicker
                  value={value.end.date ? new Date(value.end.date) : undefined}
                  onChange={(d) =>
                    updateEnd({
                      type: 'on_date',
                      date: d ? format(d, 'yyyy-MM-dd') : undefined,
                      occurrences: undefined,
                    })
                  }
                  buttonDisabled={value.end.type !== 'on_date'}
                  disabledDate={(d) => d < baseDate}
                  placeholder="Pick end date"
                />
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};