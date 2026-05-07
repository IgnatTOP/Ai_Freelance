"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

type Props = {
  steps: string[];
  currentStep: number;
};

export const ProgressStepper = ({ steps, currentStep }: Props) => (
  <div className="flex items-center justify-center gap-0 px-2">
    {steps.map((label, i) => {
      const stepNum = i + 1;
      const isCompleted = stepNum < currentStep;
      const isActive = stepNum === currentStep;

      return (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center">
            <motion.div
              className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors ${
                isCompleted
                  ? "border-[var(--mint-500)] bg-[var(--mint-500)] text-[#062219]"
                  : isActive
                    ? "border-[var(--mint-400)] bg-[rgba(52,211,153,0.15)] text-[var(--mint-200)]"
                    : "border-[var(--line)] bg-[var(--bg-2)] text-[var(--fg-3)]"
              }`}
              animate={isActive ? { scale: 1.15 } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-[var(--mint-300)]"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              {isCompleted ? <Check size={14} strokeWidth={3} /> : stepNum}
            </motion.div>
            <span
              className={`mt-1.5 hidden text-[10px] sm:block ${
                isActive ? "text-[var(--mint-300)]" : isCompleted ? "text-[var(--fg-2)]" : "text-[var(--fg-3)]"
              }`}
            >
              {label}
            </span>
          </div>

          {i < steps.length - 1 && (
            <div className="mx-1 h-0.5 w-6 overflow-hidden rounded-full bg-[var(--bg-3)] sm:w-10">
              <motion.div
                className="h-full rounded-full bg-[var(--grad-brand)]"
                initial={{ width: "0%" }}
                animate={{ width: isCompleted ? "100%" : "0%" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          )}
        </div>
      );
    })}
  </div>
);
