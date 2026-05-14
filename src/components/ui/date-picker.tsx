import { useState } from "react";
import { format as formatDate } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  format?: string;
  disabledDate?: (date: Date) => boolean;
  buttonDisabled?: boolean;
  className?: string;
  align?: "start" | "center" | "end";
  id?: string;
}

/**
 * Shared date picker. Tapping a date selects it AND closes the popover
 * immediately, on every viewport. Use this everywhere instead of composing
 * Popover + Calendar inline so behaviour stays consistent.
 */
export const DatePicker = ({
  value,
  onChange,
  placeholder = "Pick a date",
  format = "dd/MM/yyyy",
  disabledDate,
  buttonDisabled,
  className,
  align = "start",
  id,
}: DatePickerProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={buttonDisabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? formatDate(value, format) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => {
            onChange(d);
            if (d) setOpen(false);
          }}
          disabled={disabledDate}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
};