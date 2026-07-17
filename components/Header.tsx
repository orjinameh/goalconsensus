"use client";

import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  paymentCount?: number;
  className?: string;
}

export function Header({ paymentCount = 0, className }: HeaderProps) {
  return (
    <header
      className={cn(
        "border-b border-border-subtle px-5 py-3.5 sticky top-0 z-50",
        "bg-surface-1/80 backdrop-blur-xl",
        className
      )}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 group focus-ring rounded-lg">
          <div className="w-8 h-8 bg-accent-green-dim rounded-lg flex items-center justify-center transition-colors group-hover:bg-accent-green/20">
            <Shield size={16} className="text-accent-green" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-text-primary">
              GoalConsensus
            </h1>
            <p className="text-2xs text-text-muted leading-none mt-0.5">
              Settlement Verification
            </p>
          </div>
        </a>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1.5 text-2xs text-text-muted">
            <span className="status-dot status-dot-green" />
            <span>System operational</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-2xs text-text-muted">
            <span>{paymentCount} queries</span>
          </div>
        </div>
      </div>
    </header>
  );
}
