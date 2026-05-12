import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

/**
 * Category dropdown that supports creating new custom categories on the fly.
 *
 * The "Create new category" flow opens a separate Dialog rather than a nested
 * Input inside the Select popover — Radix `<Select>` intercepts keystrokes
 * for typeahead and steals focus, which made the inline input unusable.
 */
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
  const [selectOpen, setSelectOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const visibleBuiltIn = builtIn.filter((k) => !excludeBuiltIn.includes(k));

  const handleCreate = async () => {
    const label = newLabel.trim();
    if (!label) return;
    try {
      const created = await addCategory.mutateAsync({
        label,
        scope,
        reservedKeys: builtIn,
        reservedLabels: builtInLabels,
      });
      onValueChange(created.key);
      setNewLabel("");
      setCreateOpen(false);
    } catch {
      // toast handled in hook
    }
  };

  return (
    <>
      <Select
        value={value}
        onValueChange={onValueChange}
        open={selectOpen}
        onOpenChange={setSelectOpen}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-[60vh]">
          <SelectGroup>
            <SelectLabel className="text-[10px] uppercase tracking-wide">
              Built-in
            </SelectLabel>
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
                <SelectLabel className="text-[10px] uppercase tracking-wide">
                  Your categories
                </SelectLabel>
                {custom.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </>
          )}

          <SelectSeparator />
          <div className="p-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs text-muted-foreground hover:text-foreground"
              // Stop the click from being treated as a SelectItem activation,
              // close the Select popover, then open the dialog.
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectOpen(false);
                setCreateOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Create new category
            </Button>
          </div>
        </SelectContent>
      </Select>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New category</DialogTitle>
            <DialogDescription>
              Add a custom category your household can use across transactions
              and budgets.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Input
              autoFocus
              placeholder="e.g. Pet care"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              maxLength={40}
            />
            <p className="text-[11px] text-muted-foreground">
              Up to 40 characters. Letters and numbers work best.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setCreateOpen(false);
                setNewLabel("");
              }}
              disabled={addCategory.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={addCategory.isPending || !newLabel.trim()}
            >
              {addCategory.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Adding…
                </>
              ) : (
                "Add category"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

/** Helper: resolve a category key to a label using built-ins + an array of custom categories */
export const resolveCategoryLabel = (
  key: string,
  builtInLabels: Record<string, string>,
  customCategories: Array<{ key: string; label: string }> = [],
): string => {
  if (builtInLabels[key]) return builtInLabels[key];
  const c = customCategories.find((c) => c.key === key);
  if (c) return c.label;
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};
