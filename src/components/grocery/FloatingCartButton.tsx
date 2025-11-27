import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart } from "lucide-react";

interface FloatingCartButtonProps {
  itemCount: number;
  onClick: () => void;
}

export const FloatingCartButton = ({ itemCount, onClick }: FloatingCartButtonProps) => {
  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 animate-in slide-in-from-bottom-5">
      <Button
        onClick={onClick}
        size="lg"
        className="rounded-full h-16 w-16 shadow-lg relative"
      >
        <ShoppingCart className="h-6 w-6" />
        <Badge
          className="absolute -top-2 -right-2 h-7 w-7 flex items-center justify-center rounded-full p-0 bg-destructive"
        >
          {itemCount}
        </Badge>
      </Button>
    </div>
  );
};
