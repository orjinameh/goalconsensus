"use client";

import {
  Target,
  History,
  Users,
  TrendingUp,
  ShieldAlert,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PremiumReportCardProps {
  type: string;
  title: string;
  description: string;
  price: string;
  priceUSDC: number;
  icon: string;
  onPurchase: (type: string) => void;
  isPurchased?: boolean;
  isLoading?: boolean;
}

const iconMap: Record<string, typeof Target> = {
  target: Target,
  history: History,
  users: Users,
  "trending-up": TrendingUp,
  "shield-alert": ShieldAlert,
};

export function PremiumReportCard({
  type,
  title,
  description,
  price,
  priceUSDC,
  icon,
  onPurchase,
  isPurchased = false,
  isLoading = false,
}: PremiumReportCardProps) {
  const IconComponent = iconMap[icon] || Target;

  return (
    <div
      className={cn(
        "gradient-border rounded-2xl bg-surface-2 p-5 transition-all duration-250",
        "hover:scale-[1.02] hover:shadow-elevated-lg",
        isPurchased && "ring-1 ring-accent-green/30"
      )}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-green-dim">
          <IconComponent className="h-5 w-5 text-accent-green" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <p className="mt-1 text-xs text-text-tertiary leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs text-text-muted">Price</span>
          <span className="text-sm font-semibold text-text-primary">
            {price}
          </span>
        </div>

        {isPurchased ? (
          <div className="flex items-center gap-1.5 text-sm font-medium text-accent-green">
            <Check className="h-4 w-4 animate-check-pop" />
            Unlocked
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onPurchase(type)}
            disabled={isLoading}
            className={cn(
              "btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs",
              isLoading && "cursor-wait opacity-70"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {priceUSDC} USDC
                <span className="text-black/60">Unlock with x402</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
