"use client";

import { useEffect, useState } from "react";
import { cn, confidenceLevel, confidenceColor } from "@/lib/utils";

interface ConfidenceGaugeProps {
  value: number;
  size?: number;
  showLabel?: boolean;
  className?: string;
}

export function ConfidenceGauge({
  value,
  size = 120,
  showLabel = true,
  className,
}: ConfidenceGaugeProps) {
  const [animated, setAnimated] = useState(false);
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const level = confidenceLevel(value);
  const colorClass = confidenceColor(level);

  const strokeColor =
    level === "high"
      ? "#22c55e"
      : level === "medium"
        ? "#eab308"
        : "#ef4444";

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
          role="img"
          aria-label={`Consensus confidence: ${Math.round(value)}%`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animated ? offset : circumference}
            className="gauge-ring"
            style={{
              filter: `drop-shadow(0 0 6px ${strokeColor}40)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-2xl font-bold tabular-nums", colorClass)}>
            {Math.round(value)}
          </span>
          <span className="text-2xs text-text-muted -mt-0.5">%</span>
        </div>
      </div>
      {showLabel && (
        <div className="text-center">
          <div className={cn("text-xs font-medium", colorClass)}>
            {level === "high"
              ? "Strong Consensus"
              : level === "medium"
                ? "Moderate Consensus"
                : "Weak Consensus"}
          </div>
          <div className="text-2xs text-text-muted mt-0.5">
            {Math.round(value)}% confidence
          </div>
        </div>
      )}
    </div>
  );
}
