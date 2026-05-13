import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useDashboardSnapshot, type SnapshotItem } from "@/hooks/useDashboardSnapshot";
import { useEnabledProducts, isProductEnabled, ProductName } from "@/hooks/useEnabledProducts";

interface Props {
  householdId: string;
}

const ORDER: { key: SnapshotItem["key"]; product: ProductName }[] = [
  { key: "tasks", product: "tasks" },
  { key: "meals", product: "meals" },
  { key: "finance", product: "finance" },
  { key: "habits", product: "habits" },
  { key: "grocery", product: "grocery" },
  { key: "calendar", product: "calendar" },
];

export const TodaySnapshot = ({ householdId }: Props) => {
  const navigate = useNavigate();
  const { items } = useDashboardSnapshot(householdId);
  const { data: enabled } = useEnabledProducts(householdId);

  const visible = ORDER.filter(({ product }) => isProductEnabled(enabled, product)).map(
    ({ key }) => items[key]
  );

  if (visible.length === 0) return null;

  return (
    <div className="mb-5 -mx-4 sm:mx-0">
      <div className="flex gap-3 overflow-x-auto px-4 sm:px-0 pb-2 snap-x snap-mandatory scrollbar-hide">
        {visible.map((item) => (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            className="snap-start flex-shrink-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
            style={{ width: 168 }}
          >
            <Card
              className={cn(
                "h-[84px] px-3 py-2 flex flex-col justify-between transition-colors",
                item.urgent
                  ? "border-amber-400/60 bg-amber-50"
                  : "hover:border-primary/30"
              )}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <span aria-hidden>{item.emoji}</span>
                <span className="truncate">{item.label}</span>
              </div>
              <div
                className={cn(
                  "text-[13px] font-medium leading-tight line-clamp-2",
                  item.urgent ? "text-amber-900" : "text-foreground"
                )}
              >
                {item.subtitle}
              </div>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
};