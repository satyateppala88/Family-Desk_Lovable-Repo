import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Share, Smartphone, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
            <h2 className="text-2xl font-bold">Already Installed!</h2>
            <p className="text-muted-foreground">Family Desk is installed on your device. Open it from your home screen.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <img src="/pwa-icon-512.png" alt="Family Desk" className="w-20 h-20 mx-auto rounded-2xl mb-4" />
          <CardTitle className="text-2xl">Install Family Desk</CardTitle>
          <p className="text-muted-foreground text-sm">Add to your home screen for the best experience</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Smartphone className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">Works offline and loads instantly</p>
            </div>
            <div className="flex items-start gap-3">
              <Download className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">No app store needed — install directly</p>
            </div>
            <div className="flex items-start gap-3">
              <Share className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">Full-screen app experience on your phone</p>
            </div>
          </div>

          {deferredPrompt ? (
            <Button onClick={handleInstall} className="w-full" size="lg">
              <Download className="mr-2 h-5 w-5" />
              Install App
            </Button>
          ) : isIOS ? (
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Install on iPhone / iPad:</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal pl-4">
                <li>Tap the <strong>Share</strong> button (box with arrow) in Safari</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                <li>Tap <strong>"Add"</strong> to confirm</li>
              </ol>
            </div>
          ) : (
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Install on Android:</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal pl-4">
                <li>Tap the <strong>⋮ menu</strong> in your browser</li>
                <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong></li>
                <li>Tap <strong>"Install"</strong> to confirm</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
