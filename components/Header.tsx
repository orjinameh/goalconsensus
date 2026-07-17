"use client";

import { Shield, Code2, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  paymentCount?: number;
  activeView?: string;
  onNavigate?: (view: string) => void;
  className?: string;
}

export function Header({ paymentCount = 0, activeView, onNavigate, className }: HeaderProps) {
  return (
    <header
      className={cn(
        "border-b border-border-subtle px-5 py-3 sticky top-0 z-50",
        "bg-surface-1/80 backdrop-blur-xl",
        className
      )}
      role="banner"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <a
          href="/"
          className="flex items-center gap-2.5 group focus-ring rounded-lg"
          aria-label="GoalConsensus home"
        >
          <div className="w-8 h-8 bg-accent-green-dim rounded-lg flex items-center justify-center transition-colors group-hover:bg-accent-green/20">
            <Shield size={16} className="text-accent-green" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-text-primary">
              GoalConsensus
            </h1>
            <p className="text-2xs text-text-muted leading-none mt-0.5">
              Intelligence Terminal
            </p>
          </div>
        </a>

        <nav className="flex items-center gap-1" role="navigation" aria-label="Main navigation">
          <button
            onClick={() => onNavigate?.("terminal")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-2xs font-medium transition-colors",
              activeView === "terminal"
                ? "bg-accent-green-dim text-accent-green"
                : "text-text-muted hover:text-text-secondary hover:bg-surface-3"
            )}
            aria-current={activeView === "terminal" ? "page" : undefined}
          >
            <Shield size={12} />
            <span className="hidden sm:inline">Terminal</span>
          </button>
          <button
            onClick={() => onNavigate?.("developers")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-2xs font-medium transition-colors",
              activeView === "developers"
                ? "bg-accent-blue-dim text-accent-blue"
                : "text-text-muted hover:text-text-secondary hover:bg-surface-3"
            )}
            aria-current={activeView === "developers" ? "page" : undefined}
          >
            <Code2 size={12} />
            <span className="hidden sm:inline">Developers</span>
          </button>
          <button
            onClick={() => onNavigate?.("docs")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-2xs font-medium transition-colors",
              activeView === "docs"
                ? "bg-accent-purple-dim text-accent-purple"
                : "text-text-muted hover:text-text-secondary hover:bg-surface-3"
            )}
            aria-current={activeView === "docs" ? "page" : undefined}
          >
            <BookOpen size={12} />
            <span className="hidden sm:inline">Docs</span>
          </button>

          <div className="w-px h-4 bg-border-subtle mx-1" aria-hidden="true" />

          <div className="hidden sm:flex items-center gap-1.5 text-2xs text-text-muted" aria-label="System status: live">
            <span className="status-dot status-dot-green" />
            <span>Live</span>
          </div>
          {paymentCount > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 text-2xs text-text-muted ml-2" aria-label={`${paymentCount} x402 payments`}>
              <span>{paymentCount} x402</span>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
