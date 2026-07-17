"use client";

import { Shield, Search, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: "shield" | "search" | "alert";
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const iconMap = {
  shield: Shield,
  search: Search,
  alert: AlertCircle,
};

export function EmptyState({
  title,
  description,
  icon = "shield",
  action,
  className,
}: EmptyStateProps) {
  const Icon = iconMap[icon];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-surface-3 border border-border-subtle flex items-center justify-center mb-4">
        <Icon size={20} className="text-text-muted" />
      </div>
      <h3 className="text-sm font-semibold text-text-primary mb-1.5">
        {title}
      </h3>
      <p className="text-xs text-text-tertiary max-w-sm leading-relaxed mb-5">
        {description}
      </p>
      {action && (
        <button onClick={action.onClick} className="btn-secondary text-xs">
          {action.label}
        </button>
      )}
    </div>
  );
}
