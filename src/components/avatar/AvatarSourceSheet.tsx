import { Camera, ImageIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export type AvatarSource = "camera" | "gallery";

interface AvatarSourceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (source: AvatarSource) => void;
}

/**
 * Bottom sheet that lets the user choose between taking a new photo
 * with the camera or picking an existing one from the gallery.
 */
export const AvatarSourceSheet = ({
  open,
  onOpenChange,
  onPick,
}: AvatarSourceSheetProps) => {
  const handlePick = (source: AvatarSource) => {
    onOpenChange(false);
    // Defer slightly so the sheet can close before we trigger the
    // OS prompt — otherwise some browsers steal focus from the dialog.
    setTimeout(() => onPick(source), 50);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="text-center">
          <SheetTitle>Add a photo</SheetTitle>
          <SheetDescription>
            Choose how you'd like to add your picture.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 grid gap-3 pb-2">
          <button
            type="button"
            onClick={() => handlePick("camera")}
            className="flex items-center gap-4 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-accent/40"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Camera className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="font-medium">Take photo</div>
              <div className="text-sm text-muted-foreground">
                Use your camera to snap a new picture
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handlePick("gallery")}
            className="flex items-center gap-4 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-accent/40"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ImageIcon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="font-medium">Choose from gallery</div>
              <div className="text-sm text-muted-foreground">
                Pick an existing photo from your library
              </div>
            </div>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};