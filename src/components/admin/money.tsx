import { convertFromSar, formatAmount } from "@/lib/money";
import type { Settings } from "@/lib/types";

/**
 * The dashboard is Arabic-only and shows base-currency (SAR) amounts, so it
 * formats directly instead of going through the storefront currency context.
 */
export function money(sarCents: number): string {
  const settings: Pick<Settings, "usdPerSar" | "sypPerSar"> = { usdPerSar: 3.75, sypPerSar: 40 };
  return `${formatAmount(convertFromSar(sarCents, "SAR", settings), "SAR", "ar")}`;
}
