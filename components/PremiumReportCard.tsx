"use client";

import {
  Target,
  History,
  Users,
  TrendingUp,
  ShieldAlert,
  Check,
  Loader2,
  Lock,
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
        "bg-surface-2 border rounded-xl p-4 transition-all duration-200",
        isPurchased
          ? "border-accent-green/20"
          : "border-border-subtle hover:border-border"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-3">
          <IconComponent className="h-4 w-4 text-accent-yellow" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-semibold text-text-primary">{title}</h3>
          <p className="mt-0.5 text-2xs text-text-tertiary leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-subtle">
        <div className="flex items-center gap-1.5">
          <Lock size={10} className="text-text-muted" />
          <span className="text-2xs font-mono font-medium text-text-secondary">{price}</span>
        </div>

        {isPurchased ? (
          <div className="flex items-center gap-1.5 text-xs font-medium text-accent-green">
            <Check className="h-3.5 w-3.5" />
            Unlocked
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onPurchase(type)}
            disabled={isLoading}
            className={cn(
              "btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-2xs",
              isLoading && "cursor-wait opacity-70"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                {priceUSDC} USDC
                <span className="opacity-60">Unlock</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
