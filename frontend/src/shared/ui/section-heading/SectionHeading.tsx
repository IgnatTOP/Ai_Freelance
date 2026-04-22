"use client";

import { Chip } from "@heroui/react";

interface SectionHeadingProps {
    readonly badge?: string;
    readonly title: string;
    readonly subtitle?: string;
    readonly align?: "left" | "center";
}

export const SectionHeading = ({
    badge,
    title,
    subtitle,
    align = "center",
}: SectionHeadingProps) => {
    const textAlign = align === "center" ? "text-center" : "text-left";
    const mx = align === "center" ? "mx-auto" : "";

    return (
        <div className={`mb-14 md:mb-20 ${textAlign}`}>
            {badge && (
                <Chip
                    variant="flat"
                    size="sm"
                    classNames={{
                        base: "mb-5 bg-emerald-500/10 border border-emerald-500/20",
                        content: "text-emerald-400 font-semibold text-xs tracking-widest uppercase",
                    }}
                >
                    {badge}
                </Chip>
            )}
            <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-5 ${mx} max-w-3xl text-zinc-100`}>
                {title}
            </h2>
            {subtitle && (
                <p className={`text-zinc-500 text-base md:text-lg max-w-2xl ${mx} leading-relaxed`}>
                    {subtitle}
                </p>
            )}
        </div>
    );
};
