import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import type { PantryItem } from "@/hooks/usePantryItems";

interface AIPantryImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemsExtracted: (items: Partial<PantryItem>[]) => void;
  householdId: string;
  userId: string;
}

export const AIPantryImportDialog = ({
  open,
  onOpenChange,
  onItemsExtracted,
  householdId,
  userId,
}: AIPantryImportDialogProps) => {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!input.trim()) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-pantry-import", {
        body: { userInput: input },
      });

      if (error) throw error;

      if (!data?.items || data.items.length === 0) {
        toast({
          title: "No items found",
          description: "Could not extract any items from your description. Try being more specific.",
          variant: "destructive",
        });
        return;
      }

      // Convert AI response to pantry items
      const pantryItems: Partial<PantryItem>[] = data.items.map((item: any) => {
        const expiryDate = item.expiry_days > 0
          ? new Date(Date.now() + item.expiry_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          : null;

        return {
          household_id: householdId,
          added_by: userId,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          expiry_date: expiryDate,
          is_staple: false,
          minimum_quantity: 0,
        };
      });

      onItemsExtracted(pantryItems);
      setInput("");
      onOpenChange(false);
      
      toast({
        title: "Items extracted",
        description: `${pantryItems.length} items extracted. Review and confirm to add them.`,
      });
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process your input. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Pantry Import
          </DialogTitle>
          <DialogDescription>
            Describe what's in your kitchen in your own words, and AI will extract the items for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Example: I have 2kg rice, 500g toor dal, some tomatoes, 1L milk, amul butter, haldi powder, and a few onions"
              rows={6}
              className="resize-none"
            />
          </div>

          <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
            <p className="font-medium">Tips for better results:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Include quantities and units (kg, g, L, ml, packets, etc.)</li>
              <li>Use common Indian ingredient names</li>
              <li>Separate items with commas or "and"</li>
              <li>You can use colloquial terms (e.g., "atta", "haldi")</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!input.trim() || isProcessing}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Extract Items
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
