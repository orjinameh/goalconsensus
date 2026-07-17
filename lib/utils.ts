import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatConfidence(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return formatDate(iso);
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "…";
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
