import { useState } from "react";
import { Trophy } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CHALLENGE_CATALOG, type ChallengeTemplate } from "@/data/challengeCatalog";

interface Props {
  onStart: (template: ChallengeTemplate, durationDays: number) => void;
  isLoading?: boolean;
}

export const ChallengePickerSheet = ({ onStart, isLoading }: Props) => {
  const [open, setOpen] = useState(false);

  const handleStart = (t: ChallengeTemplate, days: number) => {
    onStart(t, days);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Trophy className="h-4 w-4 mr-2" /> Start a Challenge
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Pick a family challenge</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 mt-4 pb-8">
          {CHALLENGE_CATALOG.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden="true">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{t.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {t.durations.map((d) => (
                    <Button
                      key={d}
                      size="sm"
                      variant="outline"
                      disabled={isLoading}
                      onClick={() => handleStart(t, d)}
                    >
                      Start ({d} days)
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};