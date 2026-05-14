import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Card } from "@/components/ui/card";

const TIPS: readonly string[] = [
  "Ask the AI anything — 'What should we have for dinner?' or 'Where is our money going?' — tap the sparkle button.",
  "Every task can be assigned to a specific family member. They see it the moment you save it.",
  "Go to Meals → Today and tap 'Suggest dinner.' The AI picks something based on your pantry and preferences.",
  "FamilyDesk supports cash transactions too. Log any expense in under 10 seconds.",
  "When the whole household tracks habits together, the leaderboard keeps everyone accountable.",
  "Mark pantry items as running low — they appear on your shopping list automatically.",
  "Open Calendar to see upcoming Indian festivals pre-loaded. Tap any to create a preparation task list.",
  "Finance → Reports shows where your household spent money this month, by category and by person.",
  "Go to Habits → Challenges and pick a 7-day family challenge. Walk together. Save together.",
  "Open Grocery → Shopping List and tap Share — your list goes to WhatsApp in one tap.",
  "Tasks and habits can have reminders. Enable notifications in Settings to never miss a due date.",
  "Go to Finance → AI Advisor and ask 'Are we overspending on food?' Get a plain-language answer.",
  "FamilyDesk supports up to 12 members. Add grandparents, siblings — whoever's part of the home.",
  "On Android Chrome, tap 'Add to Home Screen' to install FamilyDesk — no app store needed.",
  "Meals → Plan the Week lets you set all meals for all 7 days at once.",
] as const;

const STORAGE_KEY = "fd_tip_index";

export const DidYouKnowCard = () => {
  const [tipIndex, setTipIndex] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let current = 0;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw === null ? 0 : parseInt(raw, 10);
      current = Number.isFinite(parsed) && parsed >= 0 ? parsed % TIPS.length : 0;
      const next = (current + 1) % TIPS.length;
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      current = 0;
    }
    setTipIndex(current);
  }, []);

  if (dismissed || tipIndex === null) return null;

  return (
    <Card
      className="mb-4 flex items-start gap-3 p-3 pr-10 relative bg-card animate-fade-in"
      style={{ borderLeft: "3px solid #0F6E56" }}
    >
      <div className="rounded-full p-1.5 shrink-0" style={{ backgroundColor: "#E8F5F1" }}>
        <Sparkles className="w-4 h-4" style={{ color: "#0F6E56" }} aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
          Did you know?
        </p>
        <p className="text-sm text-foreground/90 leading-snug mt-0.5">{TIPS[tipIndex]}</p>
      </div>
      <button
        type="button"
        aria-label="Dismiss tip"
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 rounded-md p-1 text-foreground/60 hover:text-foreground hover:bg-black/5 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </Card>
  );
};