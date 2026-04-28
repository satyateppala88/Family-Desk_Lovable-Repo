import { useMemo, useState } from "react";
import { Bell, Camera, ImageIcon, Mic, ShieldCheck, Sparkles } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePermissionPrimer } from "@/hooks/usePermissionPrimer";
import { PermissionPrimerDialog } from "./PermissionPrimerDialog";
import type { PermissionKind } from "@/lib/permissions";
import { setHasSeenPermissionsTutorial } from "@/lib/launchStorage";

/**
 * One-time onboarding tutorial that introduces the four sensitive
 * capabilities (microphone, camera, photos, notifications) BEFORE the
 * user encounters a feature that needs them. Each screen explains the
 * feature with a visual prompt + clear copy and offers an inline
 * "Enable" action that triggers the standard primer → OS prompt flow.
 *
 * Fully skippable. Shown only once (tracked in localStorage).
 */

type Slide = {
  kind: PermissionKind | null; // null = welcome screen
  Icon: typeof Mic;
  title: string;
  body: string;
  example: string;
  bullets: string[];
  cta: string;
};

const SLIDES: Slide[] = [
  {
    kind: null,
    Icon: Sparkles,
    title: "A quick tour of permissions",
    body: "Family Desk only asks for what each feature truly needs — and only when you use it. Here's a heads-up about four things you'll see prompts for.",
    example: "Tap Continue to see what we ask for and why.",
    bullets: [
      "Nothing is enabled without your tap",
      "Skip anything you don't want now",
      "Change your mind anytime in Settings",
    ],
    cta: "Continue",
  },
  {
    kind: "microphone",
    Icon: Mic,
    title: "Microphone — speak instead of type",
    body: "Tap the 🎤 in any input to dictate a task, grocery item, or message to the AI assistant. Your voice is converted to text on this device.",
    example: '“Add buy milk to tomorrow\'s list” → typed for you.',
    bullets: [
      "We never record or upload audio",
      "Only active while you're holding the button",
      "Powered by your device's speech engine",
    ],
    cta: "Enable microphone",
  },
  {
    kind: "camera",
    Icon: Camera,
    title: "Camera — snap a profile photo",
    body: "Use your camera to add a profile picture for yourself, your household, or a family member — making everyone easier to spot at a glance.",
    example: "Profile → Change photo → Take a photo",
    bullets: [
      "Photos are saved only when you tap Upload",
      "Stored privately for your household",
      "Remove or replace anytime",
    ],
    cta: "Enable camera",
  },
  {
    kind: "photos",
    Icon: ImageIcon,
    title: "Photo library — pick an existing picture",
    body: "Choose a photo you already have for a profile or household avatar. We only see the single image you select — never your full library.",
    example: "Profile → Change photo → Choose from library",
    bullets: [
      "One photo at a time",
      "Stored privately for your household",
      "Remove or replace anytime",
    ],
    cta: "Enable photo access",
  },
  {
    kind: "notifications",
    Icon: Bell,
    title: "Notifications — gentle, useful nudges",
    body: "Get reminders for tasks, habits, meal prep, and pantry alerts — only for things you've asked us to track. No marketing, ever.",
    example: "Today's plan • A habit you'd like to keep • Low pantry items",
    bullets: [
      "Quiet hours respected (8 AM – 9 PM IST)",
      "Mute or fine-tune by category in Settings",
      "You can disable everything in one tap",
    ],
    cta: "Turn on reminders",
  },
];

interface PermissionsTutorialProps {
  open: boolean;
  onClose: () => void;
}

export const PermissionsTutorial = ({ open, onClose }: PermissionsTutorialProps) => {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;
  const Icon = slide.Icon;
  const { ensurePermission, primerProps } = usePermissionPrimer();

  const dotCount = useMemo(() => SLIDES.length, []);

  const finish = () => {
    setHasSeenPermissionsTutorial();
    onClose();
  };

  const next = () => {
    if (isLast) finish();
    else setIndex((i) => i + 1);
  };

  const handleEnable = async () => {
    if (!slide.kind) return next();
    await ensurePermission(slide.kind);
    next();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && finish()}>
        <DialogContent className="max-w-md p-0 overflow-hidden gap-0">
          {/* Header / hero */}
          <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-background px-6 pt-8 pb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-background shadow-sm text-primary">
              <Icon className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold text-foreground leading-tight">
              {slide.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {slide.body}
            </p>
          </div>

          {/* Mock prompt / example card — the “screenshot prompt” */}
          <div className="px-6 pt-4">
            <div className="rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-foreground/80 italic">
              {slide.example}
            </div>
          </div>

          {/* Bullets */}
          <ul className="space-y-2 px-6 pt-4 text-sm">
            {slide.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">{b}</span>
              </li>
            ))}
          </ul>

          {/* Dots */}
          <div className="flex justify-center gap-1.5 pt-5">
            {Array.from({ length: dotCount }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-primary" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 px-6 pb-6 pt-4">
            {slide.kind ? (
              <Button className="w-full h-11" onClick={handleEnable}>
                {slide.cta}
              </Button>
            ) : (
              <Button className="w-full h-11" onClick={next}>
                {slide.cta}
              </Button>
            )}
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={isLast ? finish : next}
            >
              {isLast ? "Done" : slide.kind ? "Maybe later" : "Skip tour"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inline primer that handles the OS prompt for the chosen capability */}
      <PermissionPrimerDialog {...primerProps} />
    </>
  );
};