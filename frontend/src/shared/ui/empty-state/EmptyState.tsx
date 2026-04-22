"use client";

import { Card, CardBody } from "@heroui/react";
import type { ReactNode } from "react";

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
    <Card className={`glass-card border-zinc-800/60 w-full animate-fade-in-up transition-all ${className}`}>
      <CardBody className="p-8 sm:p-12">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          {icon && (
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/40 border border-zinc-700/50 flex items-center justify-center text-zinc-400 mb-2">
              {icon}
            </div>
          )}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-zinc-200">
              {title}
            </h3>
            <p className="text-sm text-zinc-500 max-w-sm mx-auto leading-relaxed">
              {description}
            </p>
          </div>
          {action && (
            <div className="pt-4">
              {action}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};
