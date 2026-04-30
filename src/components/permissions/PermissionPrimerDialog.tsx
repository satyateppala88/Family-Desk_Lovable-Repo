import { Bell, Camera, ImageIcon, Mic, ShieldCheck } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { PermissionKind } from "@/lib/permissions";

interface PrimerCopy {
  title: string;
  body: string;
  bullets: string[];
  cta: string;
  Icon: typeof Mic;
}

const COPY: Record<PermissionKind, PrimerCopy> = {
  microphone: {
    title: "Use your voice on Family Desk",
    body: "We'd like to use your microphone so you can speak instead of type — perfect for adding tasks on the go or chatting with the assistant.",
    bullets: [
      "Your voice is converted to text on this device",
      "We never record or upload audio",
      "You can turn it off any time in settings",
    ],
    cta: "Enable microphone",
    Icon: Mic,
  },
  camera: {
    title: "Take a photo for your profile",
    body: "Family Desk can use your camera to capture a profile picture for you, your household, or a family member — making everyone easier to spot.",
    bullets: [
      "Photos are only saved when you tap Upload",
      "Stored privately for your household",
      "You can remove or change them anytime",
    ],
    cta: "Enable camera",
    Icon: Camera,
  },
  photos: {
    title: "Pick a photo from your library",
    body: "Choose an existing picture for your profile, household, or a family member. We only see the photo you select — never your full library.",
    bullets: [
      "Pick one photo at a time",
      "Stored privately for your household",
      "Remove or replace whenever you like",
    ],
    cta: "Choose photo",
    Icon: ImageIcon,
  },
  notifications: {
    title: "Stay on top of your day",
    body: "Get gentle reminders for tasks, habits, meal prep, and pantry alerts. We'll only notify you for things you've asked us to track.",
    bullets: [
      "No marketing — only your reminders",
      "Quiet hours respected (8 AM – 9 PM IST)",
      "Mute or fine-tune in Settings → Notifications",
    ],
    cta: "Turn on reminders",
    Icon: Bell,
  },
};

interface PermissionPrimerDialogProps {
  open: boolean;
  kind: PermissionKind;
  onAllow: () => void;
  onDecline: () => void;
}

export const PermissionPrimerDialog = ({
  open,
  kind,
  onAllow,
  onDecline,
}: PermissionPrimerDialogProps) => {
  const copy = COPY[kind];
  const Icon = copy.Icon;

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onDecline()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-7 w-7" />
          </div>
          <AlertDialogTitle className="text-center">{copy.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {copy.body}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ul className="space-y-2 rounded-lg bg-muted/40 p-3 text-sm">
          {copy.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="text-muted-foreground">{b}</span>
            </li>
          ))}
        </ul>

        <AlertDialogFooter className="sm:flex-col sm:gap-2 sm:space-x-0">
          <AlertDialogAction onClick={onAllow} className="w-full">
            {copy.cta}
          </AlertDialogAction>
          <AlertDialogCancel onClick={onDecline} className="mt-0 w-full">
            Not now
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};