"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { FilkaCard } from "@/shared/ui/filka";

interface StatCardProps {
    readonly value: string;
    readonly label: string;
    readonly icon: ReactNode;
    readonly accentColor?: string;
}

const parseTarget = (target: string) => {
    const match = target.match(/^([^\d]*)([\d.]+)(.*)$/);
    if (!match) return null;
    return {
        prefix: match[1] ?? "",
        number: parseFloat(match[2] ?? "0"),
        suffix: match[3] ?? "",
        hasDecimal: (match[2] ?? "").includes("."),
    };
};

const useCountUp = (target: string, duration = 1500) => {
    const parsed = parseTarget(target);
    const [display, setDisplay] = useState(parsed ? `${parsed.prefix}0${parsed.suffix}` : target);
    const ref = useRef<HTMLDivElement>(null);
    const hasAnimatedInitial = useRef(false);
    const prevValueRef = useRef<number>(0);

    useEffect(() => {
        const el = ref.current;
        if (!el || !parsed) {
            if (!parsed) setDisplay(target);
            return;
        }

        const animateValue = (startVal: number, endVal: number) => {
            const startTime = performance.now();
            let animationFrame: number;

            const animate = (now: number) => {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
                const current = startVal + (endVal - startVal) * eased;
                const rounded = parsed.hasDecimal ? current.toFixed(1) : Math.round(current).toString();
                const formatted = parsed.hasDecimal ? rounded : rounded.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
                setDisplay(`${parsed.prefix}${formatted}${parsed.suffix}`);
                if (progress < 1) {
                    animationFrame = requestAnimationFrame(animate);
                } else {
                    prevValueRef.current = endVal;
                }
            };
            animationFrame = requestAnimationFrame(animate);
            return () => cancelAnimationFrame(animationFrame);
        };

        if (!hasAnimatedInitial.current) {
            let cleanupAnim: (() => void) | undefined;
            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry?.isIntersecting && !hasAnimatedInitial.current) {
                        hasAnimatedInitial.current = true;
                        cleanupAnim = animateValue(0, parsed.number);
                    }
                },
                { threshold: 0.1 },
            );
            observer.observe(el);
            return () => {
                observer.disconnect();
                cleanupAnim?.();
            };
        } else if (prevValueRef.current !== parsed.number) {
            return animateValue(prevValueRef.current, parsed.number);
        }

        const formatted = parsed.hasDecimal
            ? parsed.number.toFixed(1)
            : Math.round(parsed.number).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        setDisplay(`${parsed.prefix}${formatted}${parsed.suffix}`);
    }, [target, duration, parsed?.number, parsed?.prefix, parsed?.suffix, parsed?.hasDecimal]);

    return { ref, display };
};

export const StatCard = ({ value, label, icon }: StatCardProps) => {
    const { ref, display } = useCountUp(value);
    return (
        <FilkaCard className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center md:p-7">
            <span
                className="grid h-11 w-11 place-items-center rounded-[var(--r-md)]"
                style={{
                    background: "rgba(52,211,153,0.1)",
                    border: "1px solid rgba(52,211,153,0.22)",
                    color: "var(--mint-300)",
                }}
            >
                {icon}
            </span>
            <div ref={ref} className="stat-value text-3xl md:text-4xl font-bold">
                {display}
            </div>
            <p className="t-body-sm flex min-h-[40px] items-center" style={{ color: "var(--fg-2)" }}>
                {label}
            </p>
        </FilkaCard>
    );
};
