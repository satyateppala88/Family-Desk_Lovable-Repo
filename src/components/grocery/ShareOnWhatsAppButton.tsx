import { useState } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useHousehold } from "@/hooks/useHousehold";
import { formatListForWhatsApp, shareViaWhatsApp } from "@/lib/whatsappShare";
import type { ShoppingList } from "@/hooks/useShoppingLists";

interface ShareOnWhatsAppButtonProps {
  list: ShoppingList | null | undefined;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "icon";
  className?: string;
  label?: string;
}

export const ShareOnWhatsAppButton = ({
  list,
  variant = "outline",
  size = "sm",
  className,
  label = "Share on WhatsApp",
}: ShareOnWhatsAppButtonProps) => {
  const { toast } = useToast();
  const { householdName } = useHousehold();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (!list) return;
    setBusy(true);
    try {
      const text = formatListForWhatsApp(list, householdName);
      const result = await shareViaWhatsApp(text);
      if (result === "copied") {
        toast({
          title: "List copied",
          description: "Paste it in WhatsApp to share.",
        });
      }
    } catch (e: any) {
      toast({
        title: "Couldn't share",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={!list || busy}
      className={className}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MessageCircle className="h-4 w-4" />
      )}
      {size !== "icon" && <span className="ml-2">{label}</span>}
    </Button>
  );
};