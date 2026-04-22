"use client";

import { motion } from "framer-motion";

type Props = {
  text: string;
  isStreaming: boolean;
  className?: string;
};

export const AIStreamingText = ({ text, isStreaming, className = "" }: Props) => (
  <div
    className={`relative rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm leading-relaxed text-zinc-200 ${className}`}
  >
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {text}
    </motion.span>
    {isStreaming && (
      <span className="ml-0.5 inline-block h-4 w-[2px] animate-blink-cursor bg-emerald-400" />
    )}
  </div>
);
