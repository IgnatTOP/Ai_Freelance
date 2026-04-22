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
      <div className="flex items-start justify-between mb-5">
        <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 group-hover:bg-purple-500/15 transition-all duration-300">
          {icon}
        </div>
        {number !== undefined && (
          <span className="text-xs font-bold text-zinc-700 font-[Space_Grotesk] tabular-nums">
            {String(number).padStart(2, "0")}
          </span>
        )}
      </div>
      <h3 className="text-lg font-semibold mb-2 text-zinc-100">{title}</h3>
      <p className="text-zinc-500 text-sm leading-relaxed">{description}</p>
    </CardBody>
  </Card>
);
