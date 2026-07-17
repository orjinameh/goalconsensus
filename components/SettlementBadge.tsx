"use client";

import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { cn, settlementColor } from "@/lib/utils";

type Decision = "SETTLE" | "DO_NOT_SETTLE" | "PENDING" | "INSUFFICIENT_DATA" | "UNSUPPORTED_SPORT";

interface SettlementBadgeProps {
  decision: Decision;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const config: Record<
  Decision,
  {
    label: string;
    description: string;
    icon: typeof CheckCircle2;
  }
> = {
  SETTLE: {
    label: "VERIFIED",
    description: "Multi-agent consensus reached. Safe to settle.",
    icon: CheckCircle2,
  },
  DO_NOT_SETTLE: {
    label: "DISPUTED",
    description: "Agents disagree. Do not settle.",
    icon: XCircle,
  },
  PENDING: {
    label: "PENDING",
    description: "Match in progress. Settlement pending.",
    icon: Clock,
  },
  INSUFFICIENT_DATA: {
    label: "INSUFFICIENT DATA",
    description: "Not enough provider data for consensus.",
    icon: AlertTriangle,
  },
  UNSUPPORTED_SPORT: {
    label: "UNSUPPORTED",
    description: "Sport not supported by verification engine.",
    icon: ShieldAlert,
  },
};

export function SettlementBadge({
  decision,
  size = "md",
  className,
}: SettlementBadgeProps) {
  const c = config[decision];
  const colors = settlementColor(decision);
  const Icon = c.icon;

  const sizeClasses = {
    sm: "text-xs px-2.5 py-1 gap-1.5",
    md: "text-sm px-3.5 py-1.5 gap-2",
    lg: "text-base px-5 py-2.5 gap-2.5",
  };

  const iconSizes = { sm: 12, md: 14, lg: 18 };

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex items-center font-semibold rounded-full border",
          sizeClasses[size],
          colors.text,
          colors.bg,
          colors.border
        )}
      >
        <Icon size={iconSizes[size]} />
        {c.label}
      </span>
      {size === "lg" && (
        <span className="text-sm text-text-tertiary">{c.description}</span>
      )}
    </div>
  );
}
