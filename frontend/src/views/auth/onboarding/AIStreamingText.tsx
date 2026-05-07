"use client";

import { motion } from "framer-motion";

type Props = {
  text: string;
  isStreaming: boolean;
  className?: string;
};

export const AIStreamingText = ({ text, isStreaming, className = "" }: Props) => (
  <div
    className={`relative rounded-xl border border-[rgba(52,211,153,0.2)] bg-[rgba(52,211,153,0.06)] p-4 text-sm leading-relaxed text-[var(--fg-1)] ${className}`}
  >
    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      {text}
    </motion.span>
    {isStreaming && <span className="ml-0.5 inline-block h-4 w-[2px] animate-blink-cursor bg-[var(--mint-400)]" />}
  </div>
);
