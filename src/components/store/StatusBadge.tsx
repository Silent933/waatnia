import { getDictionary } from "@/lib/i18n/dictionaries";
import { ORDER_STATUSES, type Locale, type OrderStatus } from "@/lib/types";

const STYLES: Record<OrderStatus, string> = {
  new: "badge-accent",
  confirmed: "badge-warn",
  shipped: "badge-warn",
  delivered: "badge-ok",
  cancelled: "badge-danger",
};

export function StatusBadge({ status, lang }: { status: OrderStatus; lang: Locale }) {
  const d = getDictionary(lang);
  const safe = (ORDER_STATUSES as readonly string[]).includes(status) ? status : "new";
  return (
    <span className={`badge ${STYLES[safe as OrderStatus]}`}>
      {d.status[safe as keyof typeof d.status]}
    </span>
  );
}
