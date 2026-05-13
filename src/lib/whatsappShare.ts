import type { ShoppingList, ShoppingListItem } from "@/hooks/useShoppingLists";

export function formatListForWhatsApp(
  list: ShoppingList,
  householdName?: string | null
): string {
  const items = list.items || [];
  const unchecked = items.filter((i) => !i.is_checked);

  const header = `🛒 *${list.name}${householdName ? ` — ${householdName}` : ""}*`;
  const lines = unchecked.map((item) => {
    const qty = formatQty(item);
    return `□ ${item.name}${qty ? ` — ${qty}` : ""}`;
  });
  const body = lines.length > 0 ? lines.join("\n") : "_(no items left to buy)_";
  return `${header}\n\n${body}\n\n_Shared from FamilyDesk_`;
}

function formatQty(item: ShoppingListItem): string {
  if (!item.quantity) return "";
  const unit = item.unit ? ` ${item.unit}` : "";
  return `${item.quantity}${unit}`;
}

function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Try to open WhatsApp with the formatted text. On desktop or if WhatsApp
 * isn't installed, copy to clipboard. Returns "shared" | "copied".
 */
export async function shareViaWhatsApp(text: string): Promise<"shared" | "copied"> {
  const encoded = encodeURIComponent(text);

  if (isMobile()) {
    try {
      window.location.href = `whatsapp://send?text=${encoded}`;
      return "shared";
    } catch {
      // fall through
    }
  }

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for very old browsers
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch {
      // ignore
    }
    document.body.removeChild(ta);
  }
  return "copied";
}