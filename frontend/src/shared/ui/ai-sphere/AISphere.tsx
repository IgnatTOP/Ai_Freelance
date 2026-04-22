"use client";

import { useId } from "react";

interface AISphereProps {
    readonly size?: number;
    readonly speaking?: boolean;
    readonly className?: string;
}

export const AISphere = ({ size = 180, speaking = true, className }: AISphereProps) => {
    const rawId = useId();
    const id = `sph-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;

    return (
        <div
            style={{ position: "relative", width: size, height: size }}
            className={`${speaking ? "ai-breathe" : ""} ${className ?? ""}`.trim()}
        >
            <svg width={size} height={size} viewBox="0 0 200 200" style={{ overflow: "visible" }}>
                <defs>
                    <radialGradient id={`${id}-core`} cx="35%" cy="30%" r="75%">
                        <stop offset="0%" stopColor="#ECFDF4" />
                        <stop offset="25%" stopColor="#A7F3D0" />
                        <stop offset="60%" stopColor="#34D399" />
                        <stop offset="100%" stopColor="#047857" />
                    </radialGradient>
                    <radialGradient id={`${id}-halo`} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#34D399" stopOpacity="0.45" />
                        <stop offset="60%" stopColor="#34D399" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#34D399" stopOpacity="0" />
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
                    stroke="rgba(167,243,208,0.22)"
                    strokeWidth="1"
                    fill="none"
                    transform="rotate(-18 100 100)"
                />
                <ellipse
                    cx="100"
                    cy="100"
                    rx="78"
                    ry="26"
                    stroke="rgba(167,243,208,0.14)"
                    strokeWidth="1"
                    fill="none"
                    transform="rotate(22 100 100)"
                />
                <circle cx="100" cy="100" r="56" fill={`url(#${id}-core)`} filter={`url(#${id}-blur)`} opacity="0.9" />
                <circle cx="100" cy="100" r="52" fill={`url(#${id}-core)`} />
                <ellipse cx="82" cy="82" rx="18" ry="10" fill="rgba(255,255,255,0.55)" transform="rotate(-30 82 82)" />
                <circle r="3" fill="#A7F3D0">
                    <animateMotion
                        dur="7s"
                        repeatCount="indefinite"
                        path="M100,100 m-86,0 a86,30 -18 1,0 172,0 a86,30 -18 1,0 -172,0"
                    />
                </circle>
                <circle r="2" fill="#6EE7B7" opacity="0.8">
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
