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
      className="mb-4 flex items-start gap-2.5 p-3 pr-10 relative bg-fd-green-light animate-fade-in"
      style={{
        border: "0.5px solid rgba(15,110,86,0.30)",
        borderRadius: 12,
      }}
    >
      <Sparkles className="w-4 h-4 text-fd-green shrink-0 mt-[2px]" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-[0.12em] text-fd-green font-semibold">
          Did you know?
        </p>
        <p className="text-[12px] text-fd-green-dark leading-[1.5] mt-1">{TIPS[tipIndex]}</p>
      </div>
      <button
        type="button"
        aria-label="Dismiss tip"
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 rounded-md p-1 text-fd-green opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </Card>
  );
};