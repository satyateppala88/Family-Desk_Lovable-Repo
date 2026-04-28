import { useRef, useState } from "react";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { usePermissionPrimer } from "@/hooks/usePermissionPrimer";
import { PermissionPrimerDialog } from "@/components/permissions/PermissionPrimerDialog";

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

export const AvatarUploader = ({
  scope,
  currentUrl,
  fallbackInitials = "?",
  size = "lg",
  onChange,
  className,
}: AvatarUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { ensurePermission, primerProps } = usePermissionPrimer();
  const [busy, setBusy] = useState(false);

  const handlePick = async () => {
    // On web this is a no-op (file input needs no permission); on native
    // Capacitor it triggers the photo-library priming + OS prompt.
    const granted = await ensurePermission("photos", "avatar-uploader");
    if (!granted) return;
    inputRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED.includes(file.type)) {
      toast({ title: "Unsupported file", description: "Please choose a JPG, PNG, WEBP, or GIF image.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: "Image too large", description: "Please choose an image under 4 MB.", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = buildPath(scope, ext);

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      await onChange(pub.publicUrl);
      toast({ title: "Photo updated" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
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
    <div className={cn("flex items-center gap-4", className)}>
      <div className="relative group">
        <Avatar className={cn(SIZES[size], "ring-2 ring-border/60")}>
          {currentUrl ? <AvatarImage src={currentUrl} alt="" /> : null}
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {fallbackInitials.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={handlePick}
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
        <Button type="button" variant="outline" size="sm" onClick={handlePick} disabled={busy}>
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
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFile}
      />
      <PermissionPrimerDialog {...primerProps} />
    </div>
  );
};
