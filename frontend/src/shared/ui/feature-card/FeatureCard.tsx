"use client";

import { Card, CardBody } from "@heroui/react";
import type { ReactNode } from "react";

interface FeatureCardProps {
    readonly icon: ReactNode;
    readonly title: string;
    readonly description: string;
    readonly number?: number;
}

export const FeatureCard = ({ icon, title, description, number }: FeatureCardProps) => (
    <Card className="glass-card card-hover-glow group transition-all duration-300">
        <CardBody className="p-6 md:p-8">
            <div className="mb-5 flex items-start justify-between">
                <div
                    className="grid h-12 w-12 place-items-center rounded-xl transition-all duration-300 group-hover:scale-110"
                    style={{
                        background: "rgba(52,211,153,0.1)",
                        border: "1px solid rgba(52,211,153,0.22)",
                        color: "var(--mint-300)",
                    }}
                >
                    {icon}
                </div>
                {number !== undefined && (
                    <span
                        className="font-mono text-xs font-bold tabular-nums"
                        style={{ color: "var(--fg-3)" }}
                    >
                        {String(number).padStart(2, "0")}
                    </span>
                )}
            </div>
            <h3 className="mb-2 text-lg font-semibold" style={{ color: "var(--fg-0)" }}>
                {title}
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--fg-2)" }}>
                {description}
            </p>
        </CardBody>
    </Card>
);
