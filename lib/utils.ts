import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function settlementColor(
  decision: string
): { text: string; bg: string; border: string } {
  switch (decision) {
    case "SETTLE":
      return {
        text: "text-accent-green",
        bg: "bg-accent-green-dim",
        border: "border-accent-green/20",
      };
    case "DO_NOT_SETTLE":
      return {
        text: "text-accent-red",
        bg: "bg-accent-red-dim",
        border: "border-accent-red/20",
      };
    case "PENDING":
      return {
        text: "text-accent-yellow",
        bg: "bg-accent-yellow-dim",
        border: "border-accent-yellow/20",
      };
    default:
      return {
        text: "text-text-tertiary",
        bg: "bg-surface-3",
        border: "border-border-subtle",
      };
  }
}

export function confidenceLevel(value: number): "high" | "medium" | "low" {
  if (value >= 70) return "high";
  if (value >= 40) return "medium";
  return "low";
}

export function confidenceColor(level: "high" | "medium" | "low"): string {
  switch (level) {
    case "high":
      return "text-accent-green";
    case "medium":
      return "text-accent-yellow";
    case "low":
      return "text-accent-red";
  }
}
