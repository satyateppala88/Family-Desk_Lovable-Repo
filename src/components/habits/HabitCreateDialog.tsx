import { useState, useEffect } from "react";
import { Plus, Users, User, Home, Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { HabitAssignmentType, HabitFrequencyType } from "@/types/habits";
import { RecurrencePicker } from "@/components/shared/RecurrencePicker";
import { formatRecurrenceSummary } from "@/utils/recurrenceUtils";
import {
  type RecurrenceSpec,
  RECURRENCE_DAYS,
  dayToDateIndex,
} from "@/types/recurrence";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const habitSchema = z.object({
  name: z.string().min(1, "Habit name is required").max(100),
  assignmentType: z.enum(["personal", "multiple", "household"]),
  assignedMembers: z.array(z.string()).optional(),
  frequencyType: z.enum(["daily", "weekly", "specific_days"]),
  frequencyDays: z.array(z.number()).optional(),
  targetValue: z.number().optional(),
  targetUnit: z.string().optional(),
  reminderTime: z.string().optional(),
});

type HabitFormData = z.infer<typeof habitSchema>;

interface HabitCreateDialogProps {
  onCreateHabit: (data: {
    name: string;
    assignment_type: HabitAssignmentType;
    assigned_members?: string[];
    frequency_type: HabitFrequencyType;
    frequency_days: number[];
    target_value?: number;
    target_unit?: string;
    reminder_time?: string;
    recurrence?: RecurrenceSpec | null;
  }) => void;
  isLoading?: boolean;
  householdMembers?: Array<{ userId: string; displayName: string; avatarUrl?: string | null }>;
  defaultName?: string;
  controlledOpen?: boolean;
  onControlledOpenChange?: (open: boolean) => void;
}

export const HabitCreateDialog = ({
  onCreateHabit,
  isLoading,
  householdMembers = [],
  defaultName,
  controlledOpen,
  onControlledOpenChange,
}: HabitCreateDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (isControlled) onControlledOpenChange?.(v);
    else setInternalOpen(v);
  };
  const [showTarget, setShowTarget] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceSpec | null>({
    frequency: "daily",
    interval: 1,
    days: [...RECURRENCE_DAYS],
    end: { type: "never" },
  });

  const form = useForm<HabitFormData>({
    resolver: zodResolver(habitSchema),
    defaultValues: {
      name: defaultName || "",
      assignmentType: "personal",
      assignedMembers: [],
      frequencyType: "daily",
      frequencyDays: [],
      targetValue: undefined,
      targetUnit: "",
      reminderTime: "",
    },
  });

  useEffect(() => {
    if (open && defaultName) {
      form.setValue("name", defaultName);
    }
  }, [open, defaultName, form]);

  const assignmentType = form.watch("assignmentType");
  const frequencyType = form.watch("frequencyType");

  const handleSubmit = (data: HabitFormData) => {
    // Derive legacy frequency_type/frequency_days from the recurrence spec.
    let legacyType: HabitFrequencyType = "daily";
    let legacyDays: number[] = [];
    if (recurrence) {
      if (recurrence.frequency === "daily") {
        const days = recurrence.days ?? [];
        if (days.length === 7 || days.length === 0) {
          legacyType = "daily";
        } else {
          legacyType = "specific_days";
          legacyDays = days.map(dayToDateIndex);
        }
      } else if (recurrence.frequency === "weekly") {
        legacyType = "specific_days";
        legacyDays = (recurrence.days ?? []).map(dayToDateIndex);
      } else {
        legacyType = "weekly";
      }
    }
    onCreateHabit({
      name: data.name,
      assignment_type: data.assignmentType as HabitAssignmentType,
      assigned_members: data.assignmentType === "multiple" ? data.assignedMembers : undefined,
      frequency_type: legacyType,
      frequency_days: legacyDays,
      target_value: showTarget ? data.targetValue : undefined,
      target_unit: showTarget ? data.targetUnit : undefined,
      reminder_time: data.reminderTime || undefined,
      recurrence,
    });
    form.reset();
    setShowTarget(false);
    setRecurrence({
      frequency: "daily",
      interval: 1,
      days: [...RECURRENCE_DAYS],
      end: { type: "never" },
    });
    setOpen(false);
  };

  return (
    <>
      {!isControlled && (
        <Button className="w-full gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Create New Habit
        </Button>
      )}
      <BottomSheet
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Create New Habit"
        footer={
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={isLoading} onClick={form.handleSubmit(handleSubmit)}>
              {isLoading ? "Creating..." : "Create Habit"}
            </Button>
          </div>
        }
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Habit Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Habit Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Morning walk, Drink 8 glasses water..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Assignment Type */}
            <FormField
              control={form.control}
              name="assignmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Who is this for? *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-3 gap-2"
                    >
                      <div>
                        <RadioGroupItem
                          value="personal"
                          id="personal"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="personal"
                          className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <User className="h-5 w-5 mb-1" />
                          <span className="text-sm">Me</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem
                          value="multiple"
                          id="multiple"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="multiple"
                          className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <Users className="h-5 w-5 mb-1" />
                          <span className="text-sm">Specific</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem
                          value="household"
                          id="household"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="household"
                          className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <Home className="h-5 w-5 mb-1" />
                          <span className="text-sm">Household</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Member Selection (for multiple) */}
            {assignmentType === "multiple" && householdMembers.length > 0 && (
              <FormField
                control={form.control}
                name="assignedMembers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Members</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {householdMembers.map((member) => (
                        <div
                          key={member.userId}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`member-${member.userId}`}
                            checked={field.value?.includes(member.userId)}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              if (checked) {
                                field.onChange([...current, member.userId]);
                              } else {
                                field.onChange(
                                  current.filter((id) => id !== member.userId)
                                );
                              }
                            }}
                          />
                          <Label
                            htmlFor={`member-${member.userId}`}
                            className="text-sm cursor-pointer"
                          >
                            {member.displayName}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Frequency via shared RecurrencePicker */}
            <div className="space-y-1.5">
              <RecurrencePicker
                value={recurrence}
                onChange={(next) =>
                  setRecurrence(
                    next ?? {
                      frequency: "daily",
                      interval: 1,
                      days: [...RECURRENCE_DAYS],
                      end: { type: "never" },
                    },
                  )
                }
                baseDate={new Date()}
                context="habit"
              />
              {recurrence && (
                <p className="text-[12px] text-muted-foreground">
                  {formatRecurrenceSummary(recurrence)}
                </p>
              )}
            </div>

            {/* Target Value Toggle */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showTarget"
                  checked={showTarget}
                  onCheckedChange={(checked) => setShowTarget(!!checked)}
                />
                <Label htmlFor="showTarget" className="cursor-pointer">
                  Track a target value (optional)
                </Label>
              </div>

              {showTarget && (
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="targetValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 8"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? Number(e.target.value) : undefined
                              )
                            }
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="targetUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., glasses" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Reminder Time */}
            <FormField
              control={form.control}
              name="reminderTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Reminder Time (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Hidden submit for Enter key support */}
            <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
          </form>
        </Form>
      </BottomSheet>
    </>
  );
};
