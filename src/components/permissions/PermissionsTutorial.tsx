import { useEffect, useState } from "react";
import { Bell, Camera, ImageIcon, Mic, ShieldCheck, Sparkles } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { usePermissionPrimer } from "@/hooks/usePermissionPrimer";
import { PermissionPrimerDialog } from "./PermissionPrimerDialog";
import type { PermissionKind } from "@/lib/permissions";
import { setHasSeenPermissionsTutorial, snoozePermission } from "@/lib/launchStorage";
import { logPermissionEvent } from "@/lib/permissionAnalytics";
import { toast } from "sonner";
import {
  SystemPromptMock,
  detectMobilePlatform,
  type MobilePlatform,
} from "./SystemPromptMock";

/**
 * One-time onboarding tutorial that introduces the four sensitive
 * capabilities (microphone, camera, photos, notifications) BEFORE the
 * user encounters a feature that needs them.
 *
 * Implemented as a real swipeable carousel (Embla) — supports touch
 * swipe, dot-click navigation, and arrow-key navigation. The dialog
 * is constrained to the viewport so the footer actions remain
 * reachable on small screens.
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
    example: "Swipe or tap Continue to see what we ask for and why.",
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
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;
  const { ensurePermission, primerProps } = usePermissionPrimer();
  const [platform, setPlatform] = useState<MobilePlatform>(() =>
    detectMobilePlatform()
  );

  // Track active slide for dot indicators + footer button context.
  useEffect(() => {
    if (!api) return;
    const sync = () => setIndex(api.selectedScrollSnap());
    sync();
    api.on("select", sync);
    api.on("reInit", sync);
    return () => {
      api.off("select", sync);
      api.off("reInit", sync);
    };
  }, [api]);

  // Reset to first slide whenever the tour is reopened.
  useEffect(() => {
    if (open && api) api.scrollTo(0, true);
  }, [open, api]);

  const finish = () => {
    setHasSeenPermissionsTutorial();
    onClose();
  };

  const next = () => {
    if (isLast) {
      finish();
    } else {
      api?.scrollNext();
    }
  };

  const handleEnable = async () => {
    if (!slide.kind) return next();
    await ensurePermission(slide.kind, "onboarding-tutorial");
    next();
  };

  const handleRemindLater = () => {
    if (!slide.kind) return next();
    snoozePermission(slide.kind, 7);
    void logPermissionEvent(slide.kind, "dismissed", "onboarding-tutorial-snooze", {
      snooze_days: 7,
    });
    toast("We'll remind you in 7 days.", {
      description: "You can enable it sooner from Settings → Permissions.",
    });
    next();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && finish()}>
        <DialogContent
          className={[
            // Sizing — never larger than the viewport, scroll inside.
            "max-w-md p-0 gap-0 overflow-hidden",
            "max-h-[92vh] sm:max-h-[88vh] flex flex-col",
            // Hide the auto-injected close X — the tour has its own
            // Skip / Done actions and the X overlapped the hero icon.
            "[&>button.absolute]:hidden",
          ].join(" ")}
        >
          {/* Scrollable slide region (Embla carousel) */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <Carousel
              setApi={setApi}
              opts={{ align: "start", loop: false, duration: 22 }}
              className="w-full"
            >
              <CarouselContent className="-ml-0">
                {SLIDES.map((s, i) => {
                  const SlideIcon = s.Icon;
                  return (
                    <CarouselItem key={i} className="pl-0 basis-full">
                      <SlideBody
                        slide={s}
                        Icon={SlideIcon}
                        platform={platform}
                        onPlatformChange={setPlatform}
                      />
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
            </Carousel>
          </div>

          {/* Sticky footer — always reachable */}
          <div className="shrink-0 border-t border-border/60 bg-background/95 backdrop-blur-sm">
            {/* Dots */}
            <div className="flex justify-center gap-1.5 pt-3">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to step ${i + 1} of ${SLIDES.length}`}
                  aria-current={i === index ? "step" : undefined}
                  onClick={() => api?.scrollTo(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-5 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground/40"
                  }`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 px-6 pb-6 pt-3">
              <Button className="w-full" onClick={slide.kind ? handleEnable : next}>
                {slide.cta}
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={
                  isLast
                    ? finish
                    : slide.kind
                      ? handleRemindLater
                      : next
                }
              >
                {isLast
                  ? "Done"
                  : slide.kind
                    ? "Remind me in 7 days"
                    : "Skip tour"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inline primer that handles the OS prompt for the chosen capability */}
      <PermissionPrimerDialog {...primerProps} />
    </>
  );
};

/* ---------- Slide body (rendered inside each CarouselItem) ---------- */

interface SlideBodyProps {
  slide: Slide;
  Icon: typeof Mic;
  platform: MobilePlatform;
  onPlatformChange: (p: MobilePlatform) => void;
}

const SlideBody = ({ slide, Icon, platform, onPlatformChange }: SlideBodyProps) => (
  <div>
    {/* Header / hero */}
    <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-background px-6 pt-7 pb-5 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-background shadow-sm text-primary">
        <Icon className="h-7 w-7" />
      </div>
      <h2 className="text-lg sm:text-xl font-semibold text-foreground leading-tight">
        {slide.title}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        {slide.body}
      </p>
    </div>

    {/* System-prompt preview (or example card on the welcome slide) */}
    <div className="px-6 pt-4 space-y-2">
      {slide.kind ? (
        <>
          <div className="flex justify-center">
            <div
              role="tablist"
              aria-label="Preview platform"
              className="inline-flex rounded-full border border-border bg-muted/40 p-0.5 text-xs"
            >
              {(["ios", "android"] as MobilePlatform[]).map((p) => (
                <button
                  key={p}
                  role="tab"
                  aria-selected={platform === p}
                  onClick={() => onPlatformChange(p)}
                  className={`px-3 py-1 rounded-full transition-colors ${
                    platform === p
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p === "ios" ? "iOS" : "Android"}
                </button>
              ))}
            </div>
          </div>
          <SystemPromptMock kind={slide.kind} platform={platform} />
          <p className="text-center text-xs text-muted-foreground pt-1">
            {slide.example}
          </p>
        </>
      ) : (
        <div className="rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-foreground/80 italic">
          {slide.example}
        </div>
      )}
    </div>

    {/* Bullets */}
    <ul className="space-y-2 px-6 pt-4 pb-5 text-sm">
      {slide.bullets.map((b) => (
        <li key={b} className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span className="text-muted-foreground">{b}</span>
        </li>
      ))}
    </ul>
  </div>
);
