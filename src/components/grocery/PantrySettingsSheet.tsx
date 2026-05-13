import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";

interface PantrySettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PantrySettingsSheet = ({ open, onOpenChange }: PantrySettingsSheetProps) => {
  const { preferences, setChannel, isUpdating } = useNotificationPreferences();
  const dailyReminder = (preferences as any)?.pantry_daily_reminder ?? false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>Grocery settings</SheetTitle>
          <SheetDescription>
            Tune your pantry reminders.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="flex-1">
              <Label htmlFor="pantry-daily-reminder" className="text-sm font-medium">
                Daily pantry reminder
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                We'll send a gentle nudge at 6 PM if any item is below your minimum quantity.
              </p>
            </div>
            <Switch
              id="pantry-daily-reminder"
              checked={dailyReminder}
              disabled={isUpdating}
              onCheckedChange={(v) =>
                setChannel("pantry_daily_reminder" as any, v)
              }
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};