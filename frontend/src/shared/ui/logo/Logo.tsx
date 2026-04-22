"use client";

interface LogoProps {
    readonly size?: "sm" | "md" | "lg";
}

const sizeMap = {
    sm: { text: "text-lg", icon: 22 },
    md: { text: "text-xl", icon: 26 },
    lg: { text: "text-2xl", icon: 30 },
} as const;

export const Logo = ({ size = "md" }: LogoProps) => {
    const s = sizeMap[size];

    return (
        <div className="flex items-center gap-2">
            <svg
                width={s.icon}
                height={s.icon}
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
            >
                <defs>
                    <linearGradient id="filka-logo-grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#6EE7B7" />
                        <stop offset="1" stopColor="#10B981" />
                    </linearGradient>
                </defs>
                <path
                    d="M6 4v20M6 11c0-3 2.5-5 5.5-5h3M6 16c0-2.5 2-4.5 4.5-4.5h2"
                    stroke="url(#filka-logo-grad)"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                />
                <circle cx="18.5" cy="7" r="2.2" fill="url(#filka-logo-grad)" />
            </svg>
            <span className={`${s.text} font-bold tracking-tight gradient-text`}>Филка</span>
        </div>
    );
};
