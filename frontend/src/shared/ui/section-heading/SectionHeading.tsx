"use client";

import { cn } from "@/shared/lib/cn";
import { FilkaChip } from "@/shared/ui/filka";

interface SectionHeadingProps {
    readonly badge?: string;
    readonly title: string;
    readonly subtitle?: string;
    readonly align?: "left" | "center";
}

export const SectionHeading = ({ badge, title, subtitle, align = "center" }: SectionHeadingProps) => {
    const alignClass = align === "center" ? "text-center mx-auto" : "text-left";
    return (
        <div className={cn("mb-12 md:mb-16", align === "center" ? "text-center" : "text-left")}>
            {badge ? (
                <div className={cn("mb-4 inline-flex", align === "center" && "justify-center")}>
                    <FilkaChip>
                        <span className="t-eyebrow">{badge}</span>
                    </FilkaChip>
                </div>
            ) : null}
            <h2 className={cn("t-h2 mb-4 max-w-3xl", alignClass)}>{title}</h2>
            {subtitle ? (
                <p className={cn("t-body max-w-2xl", alignClass)} style={{ color: "var(--fg-2)" }}>
                    {subtitle}
                </p>
            ) : null}
        </div>
    );
};
