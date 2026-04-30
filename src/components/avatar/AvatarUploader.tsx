import { useRef, useState } from "react";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { usePermissionPrimer } from "@/hooks/usePermissionPrimer";
import { PermissionPrimerDialog } from "@/components/permissions/PermissionPrimerDialog";
import { PermissionRetryHint } from "@/components/permissions/PermissionRetryHint";
import { AvatarSourceSheet, type AvatarSource } from "./AvatarSourceSheet";

type AvatarScope =
  | { kind: "user"; userId: string }
  | { kind: "household"; householdId: string }
  | { kind: "family"; householdId: string; memberId: string };

interface AvatarUploaderProps {
  scope: AvatarScope;
  currentUrl?: string | null;
  fallbackInitials?: string;
  size?: "sm" | "md" | "lg" | "xl";
  onChange: (publicUrl: string | null) => Promise<void> | void;
  className?: string;
}

const SIZES = {
  sm: "h-10 w-10",
  md: "h-16 w-16",
  lg: "h-24 w-24",
  xl: "h-32 w-32",
};

const buildPath = (scope: AvatarScope, ext: string) => {
  const stamp = Date.now();
  if (scope.kind === "user") return `${scope.userId}/avatar-${stamp}.${ext}`;
  if (scope.kind === "household")
    return `household/${scope.householdId}/avatar-${stamp}.${ext}`;
  return `family/${scope.householdId}/${scope.memberId}-${stamp}.${ext}`;
};

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const isNativePlatform = (): boolean => {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
};

export const AvatarUploader = ({
  scope,
  currentUrl,
  fallbackInitials = "?",
  size = "lg",
  onChange,
  className,
}: AvatarUploaderProps) => {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { ensurePermission, primerProps } = usePermissionPrimer();
  const [busy, setBusy] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);

  const handleOpenChooser = () => {
    setChooserOpen(true);
  };

  const uploadFromBlob = async (blob: Blob, ext: string) => {
    if (blob.size > MAX_BYTES) {
      toast({
        title: "Image too large",
        description: "Please choose an image under 4 MB.",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      const path = buildPath(scope, ext);
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: blob.type || `image/${ext}`, upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      await onChange(pub.publicUrl);
      toast({ title: "Photo updated" });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const runNativeCapture = async (source: AvatarSource) => {
    try {
      const cam = await import("@capacitor/camera");
      const photo = await cam.Camera.getPhoto({
        source: source === "camera" ? cam.CameraSource.Camera : cam.CameraSource.Photos,
        resultType: cam.CameraResultType.Uri,
        quality: 85,
        allowEditing: false,
      });
      const uri = photo.webPath || photo.path;
      if (!uri) return;
      const res = await fetch(uri);
      const blob = await res.blob();
      const ext = (photo.format || "jpg").toLowerCase();
      await uploadFromBlob(blob, ext);
    } catch (err: any) {
      // User cancellation throws — only surface real errors.
      const msg = String(err?.message || err || "");
      if (/cancel/i.test(msg)) return;
      toast({
        title: "Couldn't open " + (source === "camera" ? "camera" : "gallery"),
        description: msg || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePickSource = async (source: AvatarSource) => {
    const kind = source === "camera" ? "camera" : "photos";
    const surface = source === "camera" ? "avatar-uploader-camera" : "avatar-uploader-gallery";
    const granted = await ensurePermission(kind, surface);
    if (!granted) return;

    if (isNativePlatform()) {
      await runNativeCapture(source);
      return;
    }

    // Web path: trigger the appropriate hidden input.
    if (source === "camera") {
      cameraInputRef.current?.click();
    } else {
      galleryInputRef.current?.click();
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED.includes(file.type)) {
      toast({ title: "Unsupported file", description: "Please choose a JPG, PNG, WEBP, or GIF image.", variant: "destructive" });
      return;
    }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    await uploadFromBlob(file, ext);
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      await onChange(null);
      toast({ title: "Photo removed" });
    } catch (err: any) {
      toast({ title: "Failed to remove", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-4">
      <div className="relative group">
        <Avatar className={cn(SIZES[size], "ring-2 ring-border/60")}>
          {currentUrl ? <AvatarImage src={currentUrl} alt="" /> : null}
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {fallbackInitials.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={handleOpenChooser}
          disabled={busy}
          className={cn(
            "absolute inset-0 rounded-full flex items-center justify-center",
            "bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity",
            busy && "opacity-100"
          )}
          aria-label="Change photo"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleOpenChooser} disabled={busy}>
          <Upload className="h-4 w-4 mr-2" />
          {currentUrl ? "Change photo" : "Upload photo"}
        </Button>
        {currentUrl && (
          <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={busy} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </div>

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFile}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFile}
      />
      <PermissionPrimerDialog {...primerProps} />
      </div>

      {/* Inline "Try again" hints when camera/photos access was blocked.
          Render nothing on web when irrelevant — surface mainly on native
          Capacitor builds where the OS gates these prompts. */}
      <PermissionRetryHint
        kind="camera"
        ensurePermission={ensurePermission}
        surface="avatar-uploader-camera"
        onGranted={() => handlePickSource("camera")}
      />
      <PermissionRetryHint
        kind="photos"
        ensurePermission={ensurePermission}
        surface="avatar-uploader-gallery"
        onGranted={() => handlePickSource("gallery")}
      />

      <AvatarSourceSheet
        open={chooserOpen}
        onOpenChange={setChooserOpen}
        onPick={handlePickSource}
      />
    </div>
  );
};
