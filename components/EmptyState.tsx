"use client";

import { Shield, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: "shield" | "search";
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon = "shield",
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-surface-3 border border-border-subtle flex items-center justify-center mb-4">
        {icon === "shield" ? (
          <Shield size={20} className="text-text-muted" />
        ) : (
          <Search size={20} className="text-text-muted" />
        )}
      </div>
      <h3 className="text-sm font-semibold text-text-primary mb-1">
        {title}
      </h3>
      <p className="text-xs text-text-tertiary max-w-sm leading-relaxed mb-4">
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
