"use client";

import type { CSSProperties, HTMLAttributes } from "react";
import { useId } from "react";
import { cn } from "@/shared/lib/cn";

interface AISphereProps {
  readonly size?: number;
  readonly speaking?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
}

export const FilkaAISphere = ({ size = 180, speaking = true, className, style }: AISphereProps) => {
  const rawId = useId();
  const id = `sph-${rawId.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <div
      className={cn(speaking && "ai-breathe", className)}
      style={{ position: "relative", width: size, height: size, ...style }}
    >
      <svg width={size} height={size} viewBox="0 0 200 200" style={{ overflow: "visible" }}>
        <defs>
          <radialGradient id={`${id}-core`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="25%" stopColor="#D1E4FA" />
            <stop offset="55%" stopColor="#8A66F6" />
            <stop offset="100%" stopColor="#1A0E4A" />
          </radialGradient>
          <radialGradient id={`${id}-halo`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#663AF3" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#663AF3" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#663AF3" stopOpacity="0" />
          </radialGradient>
          <filter id={`${id}-blur`}>
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <circle cx="100" cy="100" r="95" fill={`url(#${id}-halo)`} />
        <ellipse
          cx="100"
          cy="100"
          rx="86"
          ry="30"
          stroke="rgba(186,215,247,0.30)"
          strokeWidth="1"
          fill="none"
          transform="rotate(-18 100 100)"
        />
        <ellipse
          cx="100"
          cy="100"
          rx="78"
          ry="26"
          stroke="rgba(186,215,247,0.16)"
          strokeWidth="1"
          fill="none"
          transform="rotate(22 100 100)"
        />
        <circle cx="100" cy="100" r="56" fill={`url(#${id}-core)`} filter={`url(#${id}-blur)`} opacity="0.9" />
        <circle cx="100" cy="100" r="52" fill={`url(#${id}-core)`} />
        <ellipse cx="82" cy="82" rx="18" ry="10" fill="rgba(255,255,255,0.55)" transform="rotate(-30 82 82)" />
        <circle r="3" fill="#D1E4FA">
          <animateMotion
            dur="7s"
            repeatCount="indefinite"
            path="M100,100 m-86,0 a86,30 -18 1,0 172,0 a86,30 -18 1,0 -172,0"
          />
        </circle>
        <circle r="2" fill="#B6D9FC" opacity="0.85">
          <animateMotion
            dur="9s"
            repeatCount="indefinite"
            begin="-3s"
            path="M100,100 m-78,0 a78,26 22 1,0 156,0 a78,26 22 1,0 -156,0"
          />
        </circle>
      </svg>
    </div>
  );
};

interface DotProps extends HTMLAttributes<HTMLSpanElement> {
  readonly size?: number;
}

export const FilkaLiveDot = ({ size = 8, className, style, ...rest }: DotProps) => (
  <span
    className={cn("dot-live", className)}
    style={{ width: size, height: size, ...style }}
    aria-hidden="true"
    {...rest}
  />
);

export const FilkaTypingDots = ({ className, style, ...rest }: HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn("inline-flex items-center gap-1", className)}
    style={style}
    aria-label="Печатает"
    {...rest}
  >
    <span className="typing-dot" />
    <span className="typing-dot" />
    <span className="typing-dot" />
  </span>
);

interface SignalBarsProps {
  readonly count?: number;
  readonly height?: number;
  readonly className?: string;
}

export const FilkaSignalBars = ({ count = 18, height = 40, className }: SignalBarsProps) => (
  <div
    className={cn("inline-flex items-center", className)}
    style={{ gap: 3, height }}
    aria-hidden="true"
  >
    {Array.from({ length: count }).map((_, i) => (
      <span
        key={i}
        className="filka-sig-bar"
        style={{
          width: 3,
          borderRadius: 1.5,
          background: "var(--mint-400)",
          animationDelay: `${i * 0.06}s`,
          display: "inline-block",
          opacity: 0.75,
        }}
      />
    ))}
  </div>
);

interface SpinnerProps {
  readonly size?: number;
  readonly className?: string;
}

export const FilkaSpinner = ({ size = 16, className }: SpinnerProps) => (
  <span
    className={cn("inline-block animate-spin rounded-full border-2 border-current border-t-transparent", className)}
    style={{ width: size, height: size }}
    aria-hidden="true"
  />
);

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  readonly width?: number | string;
  readonly height?: number | string;
  readonly rounded?: number | string;
}

export const FilkaSkeleton = ({ width = "100%", height = 12, rounded = 6, className, style, ...rest }: SkeletonProps) => (
  <div
    className={cn("relative overflow-hidden", className)}
    style={{
      width,
      height,
      borderRadius: rounded,
      background: "rgba(167,243,208,0.06)",
      ...style,
    }}
    aria-hidden="true"
    {...rest}
  >
    <span className="shimmer absolute inset-0" />
  </div>
);

export const FilkaShimmerRow = ({ className, style, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("shimmer-row", className)} style={style} aria-hidden="true" {...rest} />
);
