import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import {
  CategoryScope,
  useCustomCategories,
  useAddCustomCategory,
} from "@/hooks/useCustomCategories";

interface CategorySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  /** Built-in category keys, in order */
  builtIn: readonly string[];
  /** Map of built-in key → friendly label */
  builtInLabels: Record<string, string>;
  /** Where this select is being used (so we filter custom cats accordingly) */
  scope: CategoryScope;
  /** Optional list of built-in keys to hide (e.g. exclude income on a budget select) */
  excludeBuiltIn?: string[];
  placeholder?: string;
}

export const CategorySelect = ({
  value,
  onValueChange,
  builtIn,
  builtInLabels,
  scope,
  excludeBuiltIn = [],
  placeholder,
}: CategorySelectProps) => {
  const { categories: custom } = useCustomCategories(scope);
  const addCategory = useAddCustomCategory();
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const visibleBuiltIn = builtIn.filter((k) => !excludeBuiltIn.includes(k));

  const handleCreate = async () => {
    if (!newLabel.trim()) return;
    try {
      const created = await addCategory.mutateAsync({ label: newLabel, scope });
      onValueChange(created.key);
      setNewLabel("");
      setAdding(false);
    } catch {
      // toast handled in hook
    }
  };

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[60vh]">
        <SelectGroup>
          <SelectLabel className="text-[10px] uppercase tracking-wide">Built-in</SelectLabel>
          {visibleBuiltIn.map((c) => (
            <SelectItem key={c} value={c}>
              {builtInLabels[c] || c}
            </SelectItem>
          ))}
        </SelectGroup>

        {custom.length > 0 && (
          <>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel className="text-[10px] uppercase tracking-wide">Your categories</SelectLabel>
              {custom.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </>
        )}

        <SelectSeparator />
        <div className="p-2">
          {adding ? (
            <div className="flex gap-1.5">
              <Input
                autoFocus
                placeholder="New category name"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreate();
                  }
                  if (e.key === "Escape") {
                    setAdding(false);
                    setNewLabel("");
                  }
                }}
                className="h-8 text-sm"
              />
              <Button
                size="sm"
                className="h-8"
                onClick={handleCreate}
                disabled={addCategory.isPending || !newLabel.trim()}
              >
                {addCategory.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setAdding(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Create new category
            </Button>
          )}
        </div>
      </SelectContent>
    </Select>
  );
};

/** Helper: resolve a category key to a label using built-ins + an array of custom categories */
export const resolveCategoryLabel = (
  key: string,
  builtInLabels: Record<string, string>,
  customCategories: Array<{ key: string; label: string }> = []
): string => {
  if (builtInLabels[key]) return builtInLabels[key];
  const c = customCategories.find((c) => c.key === key);
  if (c) return c.label;
  // Fallback: prettify the slug
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};