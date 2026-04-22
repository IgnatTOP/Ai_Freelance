"use client";

interface LogoProps {
    readonly size?: "sm" | "md" | "lg";
}

const sizeMap = {
    sm: { text: "text-lg", icon: 20 },
    md: { text: "text-xl", icon: 24 },
    lg: { text: "text-2xl", icon: 28 },
} as const;

export const Logo = ({ size = "md" }: LogoProps) => {
    const s = sizeMap[size];

    return (
        <div className="flex items-center gap-2">
            <svg
                width={s.icon}
                height={s.icon}
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
            >
                <defs>
                    <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="oklch(0.75 0.25 280)" />
                        <stop offset="50%" stopColor="oklch(0.7 0.2 230)" />
                        <stop offset="100%" stopColor="oklch(0.75 0.18 320)" />
                    </linearGradient>
                </defs>
                <circle cx="16" cy="16" r="14" stroke="url(#logo-grad)" strokeWidth="2.5" fill="none" />
                <circle cx="16" cy="16" r="5" fill="url(#logo-grad)" />
                <path
                    d="M16 2 C20 8, 24 12, 30 16 C24 20, 20 24, 16 30 C12 24, 8 20, 2 16 C8 12, 12 8, 16 2Z"
                    fill="url(#logo-grad)"
                    opacity="0.3"
                />
            </svg>
            <span className={`${s.text} font-bold tracking-tight gradient-text`}>
                НейроБиржа
            </span>
        </div>
    );
};
