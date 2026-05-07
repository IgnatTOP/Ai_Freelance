"use client";

interface LogoProps {
    readonly size?: "sm" | "md" | "lg";
}

const sizeMap = {
    sm: { text: "text-lg", icon: 20, label: "text-[18px]" },
    md: { text: "text-xl", icon: 24, label: "text-[20px]" },
    lg: { text: "text-2xl", icon: 30, label: "text-[24px]" },
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
                        <stop offset="0%" stopColor="#D1E4FA" />
                        <stop offset="50%" stopColor="#663AF3" />
                        <stop offset="100%" stopColor="#1a0e4a" />
                    </linearGradient>
                </defs>
                <circle cx="16" cy="16" r="14" stroke="url(#logo-grad)" strokeWidth="2.5" fill="rgba(6,34,25,0.08)" />
                <circle cx="16" cy="16" r="5" fill="url(#logo-grad)" />
                <path
                    d="M16 2 C20 8, 24 12, 30 16 C24 20, 20 24, 16 30 C12 24, 8 20, 2 16 C8 12, 12 8, 16 2Z"
                    fill="url(#logo-grad)"
                    opacity="0.22"
                />
            </svg>
            <span className={`${s.label} font-bold tracking-[-0.03em] text-[var(--fg-0)]`}>
                Филка
            </span>
        </div>
    );
};
