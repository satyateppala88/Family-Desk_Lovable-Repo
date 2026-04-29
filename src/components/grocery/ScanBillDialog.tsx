import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, Upload, X, ScanLine } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const MAX_IMAGES = 5;
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB raw cap before compression
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

export interface ScannedBillItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiry_days: number;
  unit_price?: number;
  confidence: number;
}

export interface ScannedBill {
  store?: string;
  bill_date?: string;
  currency?: string;
  total?: number;
  items: ScannedBillItem[];
}

interface ScanBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanned: (bill: ScannedBill) => void;
  householdId: string;
}

async function compressImage(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export const ScanBillDialog = ({ open, onOpenChange, onScanned, householdId }: ScanBillDialogProps) => {
  const [images, setImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast({ title: "Limit reached", description: `Up to ${MAX_IMAGES} images per scan.`, variant: "destructive" });
      return;
    }
    const accepted: File[] = [];
    for (const file of Array.from(files).slice(0, remaining)) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Skipped", description: `${file.name} is not an image.`, variant: "destructive" });
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast({ title: "Too large", description: `${file.name} exceeds 8MB.`, variant: "destructive" });
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length === 0) return;

    setIsCompressing(true);
    try {
      const compressed = await Promise.all(accepted.map(compressImage));
      setImages(prev => [...prev, ...compressed]);
    } catch (e) {
      toast({ title: "Could not read image", description: "Please try a different photo.", variant: "destructive" });
    } finally {
      setIsCompressing(false);
    }
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const reset = () => {
    setImages([]);
    setIsProcessing(false);
  };

  const handleScan = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-scan-bill", {
        body: { images, householdId },
      });
      if (error) throw error;
      if (!data?.items || data.items.length === 0) {
        toast({
          title: "No items detected",
          description: "Try a clearer photo with the item lines fully in frame.",
          variant: "destructive",
        });
        return;
      }
      onScanned(data as ScannedBill);
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Scan failed",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            Scan grocery bill
          </DialogTitle>
          <DialogDescription>
            Snap or upload up to {MAX_IMAGES} photos of your bills. We'll extract the items so you can review before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              hidden
              onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
            />
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isProcessing || isCompressing || images.length >= MAX_IMAGES}
            >
              <Camera className="h-4 w-4" />
              Camera
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || isCompressing || images.length >= MAX_IMAGES}
            >
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {images.map((src, idx) => (
                <div key={idx} className="relative aspect-square rounded-md overflow-hidden border bg-muted">
                  <img src={src} alt={`Bill ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 rounded-full bg-background/90 p-1 shadow hover:bg-background"
                    aria-label="Remove image"
                    disabled={isProcessing}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {isCompressing && (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Preparing image…
            </div>
          )}

          <div className="bg-muted rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Tips for accurate scans</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Lay the bill flat with good lighting</li>
              <li>Include the full item list (crop tightly)</li>
              <li>Multiple pages? Add them all and we'll merge duplicates</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleScan} disabled={images.length === 0 || isProcessing || isCompressing}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isProcessing ? "Reading bill…" : `Extract ${images.length || ""} item${images.length === 1 ? "" : "s"}`.trim()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};