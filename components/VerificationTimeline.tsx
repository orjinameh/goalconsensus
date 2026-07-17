"use client";

import { Check, Loader2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export type VerificationStep = {
  id: string;
  label: string;
  status: "pending" | "active" | "completed" | "error";
  detail?: string;
  latencyMs?: number;
};

interface VerificationTimelineProps {
  steps: VerificationStep[];
  className?: string;
}

export function VerificationTimeline({
  steps,
  className,
}: VerificationTimelineProps) {
  return (
    <div className={cn("space-y-0", className)}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <div key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200",
                  step.status === "completed" && "bg-accent-green/20",
                  step.status === "active" && "bg-accent-blue/20",
                  step.status === "error" && "bg-accent-red/20",
                  step.status === "pending" && "bg-surface-4"
                )}
              >
                {step.status === "completed" && (
                  <Check size={12} className="text-accent-green" />
                )}
                {step.status === "active" && (
                  <Loader2
                    size={12}
                    className="text-accent-blue animate-spin"
                  />
                )}
                {step.status === "error" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-red" />
                )}
                {step.status === "pending" && (
                  <Circle size={6} className="text-text-muted" />
                )}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "w-px flex-1 min-h-[1.5rem] transition-colors duration-300",
                    step.status === "completed"
                      ? "bg-accent-green/30"
                      : "bg-surface-4"
                  )}
                />
              )}
            </div>

            <div className={cn("pb-5 pt-0.5", isLast && "pb-0")}>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-sm font-medium transition-colors duration-200",
                    step.status === "completed" && "text-text-primary",
                    step.status === "active" && "text-text-primary",
                    step.status === "error" && "text-accent-red",
                    step.status === "pending" && "text-text-muted"
                  )}
                >
                  {step.label}
                </span>
                {step.latencyMs !== undefined &&
                  step.status === "completed" && (
                    <span className="text-2xs text-text-muted font-mono">
                      {step.latencyMs < 1000
                        ? `${step.latencyMs}ms`
                        : `${(step.latencyMs / 1000).toFixed(1)}s`}
                    </span>
                  )}
              </div>
              {step.detail && (
                <p
                  className={cn(
                    "text-2xs mt-0.5 leading-relaxed",
                    step.status === "error"
                      ? "text-accent-red/70"
                      : "text-text-muted"
                  )}
                >
                  {step.detail}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
