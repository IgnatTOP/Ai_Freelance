"use client";

import type { ReactNode } from "react";
import { FilkaCard } from "@/shared/ui/filka/FilkaPrimitives";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({
  title,
  description,
  icon,
  action,
  className = "",
}: EmptyStateProps) => {
  return (
    <FilkaCard glass className={`w-full animate-fade-in-up ${className}`}>
      <div className="p-8 sm:p-12">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          {icon && (
            <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--bg-3)] text-[var(--mint-300)]">
              {icon}
            </div>
          )}
          <div className="space-y-2">
            <h3 className="t-h3 text-[var(--fg-0)]">
              {title}
            </h3>
            <p className="mx-auto max-w-sm text-sm leading-relaxed text-[var(--fg-2)]">
              {description}
            </p>
          </div>
          {action && (
            <div className="pt-4">
              {action}
            </div>
          )}
        </div>
      </div>
    </FilkaCard>
  );
};
