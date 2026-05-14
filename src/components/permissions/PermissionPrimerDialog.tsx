import { useEffect } from "react";
import { Bell, Camera, ImageIcon, Mic, ShieldCheck } from "lucide-react";
import { createPortal } from "react-dom";
import type { PermissionKind } from "@/lib/permissions";

interface PrimerCopy {
  title: string;
  body: string;
  trustSignals: string[];
  cta: string;
  secondary: string;
  Icon: typeof Mic;
}

const COPY: Record<PermissionKind, PrimerCopy> = {
  microphone: {
    title: "Speak instead of type",
    body: "Tap the mic in any input to dictate a task, grocery item, or message to the AI assistant. Your voice is converted to text on this device.",
    trustSignals: [
      "We never record or upload audio",
      "Only active while you're holding the button",
    ],
    cta: "Enable microphone",
    secondary: "Remind me in 7 days",
    Icon: Mic,
  },
  camera: {
    title: "Snap a profile photo",
    body: "Use your camera to add a profile picture for yourself, your household, or a family member — making everyone easier to spot at a glance.",
    trustSignals: [
      "Photos are saved only when you tap Upload",
      "Stored privately for your household",
    ],
    cta: "Enable camera",
    secondary: "Not now",
    Icon: Camera,
  },
  photos: {
    title: "Pick an existing photo",
    body: "Choose a photo you already have for a profile or household avatar. We only see the single image you select — never your full library.",
    trustSignals: [
      "One photo at a time",
      "Never accessed without your tap",
    ],
    cta: "Enable photo access",
    secondary: "Not now",
    Icon: ImageIcon,
  },
  notifications: {
    title: "Gentle, useful nudges",
    body: "Get reminders for tasks, habits, meal prep, and pantry alerts — only for things you've asked us to track. No marketing, ever.",
    trustSignals: [
      "Quiet hours respected (8 AM – 9 PM IST)",
      "You control every notification type in Settings",
      "No marketing or promotional alerts",
    ],
    cta: "Turn on reminders",
    secondary: "Remind me in 7 days",
    Icon: Bell,
  },
};

interface PermissionPrimerDialogProps {
  open: boolean;
  kind: PermissionKind;
  onAllow: () => void;
  /** Secondary action: "Remind me in 7 days" (mic, notifications) or "Not now" (camera, photos). */
  onSecondary: () => void;
  /** Backdrop / Esc dismiss. Treated like the secondary action. */
  onDismiss: () => void;
}

export const PermissionPrimerDialog = ({
  open,
  kind,
  onAllow,
  onSecondary,
  onDismiss,
}: PermissionPrimerDialogProps) => {
  // Lock background scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onDismiss]);

  if (!open) return null;

  const copy = COPY[kind];
  const Icon = copy.Icon;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="permission-sheet-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-white animate-slide-in-right"
        style={{
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: "12px 24px 40px",
          animation: "slideUp 220ms cubic-bezier(0.2, 0.9, 0.3, 1)",
        }}
      >
        {/* Handle bar */}
        <div
          aria-hidden
          style={{
            width: 36,
            height: 4,
            background: "#D3D1C7",
            borderRadius: 2,
            margin: "0 auto 20px",
          }}
        />

        {/* Icon */}
        <div
          style={{
            width: 56,
            height: 56,
            background: "#E1F5EE",
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <Icon size={28} color="#0F6E56" />
        </div>

        {/* Title */}
        <h2
          id="permission-sheet-title"
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 20,
            color: "#1A1A1A",
            letterSpacing: "-0.02em",
            textAlign: "center",
            marginBottom: 8,
            lineHeight: 1.2,
          }}
        >
          {copy.title}
        </h2>

        {/* Body */}
        <p
          style={{
            fontSize: 13,
            color: "#8A8A8A",
            lineHeight: 1.55,
            textAlign: "center",
            marginBottom: 20,
            maxWidth: 280,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {copy.body}
        </p>

        {/* Trust signals */}
        <ul
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 24,
            listStyle: "none",
            padding: 0,
          }}
        >
          {copy.trustSignals.map((t) => (
            <li
              key={t}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
              }}
            >
              <ShieldCheck
                size={14}
                color="#0F6E56"
                style={{ flexShrink: 0, marginTop: 1 }}
              />
              <span style={{ fontSize: 12, color: "#4A4A4A", lineHeight: 1.4 }}>
                {t}
              </span>
            </li>
          ))}
        </ul>

        {/* Primary */}
        <button
          type="button"
          onClick={onAllow}
          style={{
            width: "100%",
            height: 48,
            borderRadius: 12,
            background: "#0F6E56",
            color: "#FFFFFF",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 15,
            fontWeight: 500,
            border: "none",
            marginBottom: 10,
            cursor: "pointer",
            transition: "transform 100ms ease",
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onTouchStart={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
          onTouchEnd={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          {copy.cta}
        </button>

        {/* Secondary */}
        <button
          type="button"
          onClick={onSecondary}
          style={{
            width: "100%",
            height: 44,
            borderRadius: 12,
            background: "transparent",
            color: "#8A8A8A",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            border: "none",
            cursor: "pointer",
          }}
        >
          {copy.secondary}
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
};
