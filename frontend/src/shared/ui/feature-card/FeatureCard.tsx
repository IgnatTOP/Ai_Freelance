"use client";

import type { ReactNode } from "react";
import { FilkaCard } from "@/shared/ui/filka";

interface FeatureCardProps {
    readonly icon: ReactNode;
    readonly title: string;
    readonly description: string;
    readonly number?: number;
}

export const FeatureCard = ({ icon, title, description, number }: FeatureCardProps) => (
    <FilkaCard className="group p-6 md:p-7">
        <div className="mb-5 flex items-start justify-between">
            <span
                className="grid h-12 w-12 place-items-center rounded-[var(--r-md)] transition-all group-hover:scale-110"
                style={{
                    background: "rgba(52,211,153,0.1)",
                    border: "1px solid rgba(52,211,153,0.22)",
                    color: "var(--mint-300)",
                }}
            >
                {icon}
            </span>
            {number !== undefined ? (
                <span className="t-mono tabular-nums" style={{ color: "var(--fg-3)", fontSize: 14, fontWeight: 700 }}>
                    {String(number).padStart(2, "0")}
                </span>
            ) : null}
        </div>
        <h3 className="t-h4 mb-2">{title}</h3>
        <p className="t-body-sm" style={{ color: "var(--fg-2)" }}>
            {description}
        </p>
    </FilkaCard>
);
