import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PriceBadgeProps {
  change: number | null;
  changePercent: number | null;
  size?: "sm" | "default";
}

export function PriceBadge({ change, changePercent, size = "default" }: PriceBadgeProps) {
  const isPositive = (change ?? 0) > 0;
  const isNegative = (change ?? 0) < 0;
  const isNeutral = !isPositive && !isNegative;

  const formattedChange = change != null ? (isPositive ? "+" : "") + change.toFixed(2) : "0.00";
  const formattedPercent = changePercent != null ? (isPositive ? "+" : "") + changePercent.toFixed(2) + "%" : "0.00%";

  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <div className="flex items-center gap-1.5">
      <span
        data-testid="text-price-change"
        className={`font-mono text-xs font-medium ${
          isPositive
            ? "text-emerald-600 dark:text-emerald-400"
            : isNegative
            ? "text-red-600 dark:text-red-400"
            : "text-muted-foreground"
        }`}
      >
        {formattedChange}
      </span>
      <Badge
        data-testid="badge-change-percent"
        variant="secondary"
        className={`font-mono text-xs ${
          isPositive
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
            : isNegative
            ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
            : ""
        }`}
      >
        <Icon className="w-3 h-3 mr-0.5" />
        {formattedPercent}
      </Badge>
    </div>
  );
}

export function formatPrice(price: number | null): string {
  if (price == null) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function formatVolume(volume: number | null): string {
  if (volume == null) return "--";
  if (volume >= 1e9) return (volume / 1e9).toFixed(2) + "B";
  if (volume >= 1e6) return (volume / 1e6).toFixed(2) + "M";
  if (volume >= 1e3) return (volume / 1e3).toFixed(1) + "K";
  return volume.toLocaleString();
}
