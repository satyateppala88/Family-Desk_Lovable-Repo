import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface HabitQuickAddProps {
  onAdd: (name: string) => void;
  isLoading?: boolean;
}

export const HabitQuickAdd = ({ onAdd, isLoading }: HabitQuickAddProps) => {
  const [value, setValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onAdd(value.trim());
      setValue("");
      setIsExpanded(false);
    }
  };

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        className="w-full justify-start text-muted-foreground border-dashed"
        onClick={() => setIsExpanded(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add a new habit
      </Button>
    );
  }

  return (
    <Card className="p-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          placeholder="e.g., Morning walk, Drink water, Read 20 mins..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          className="flex-1"
        />
        <Button type="submit" disabled={!value.trim() || isLoading}>
          Add
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setIsExpanded(false);
            setValue("");
          }}
        >
          Cancel
        </Button>
      </form>
    </Card>
  );
};
