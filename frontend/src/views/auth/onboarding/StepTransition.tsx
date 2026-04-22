"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

const variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95,
  }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? -300 : 300,
    opacity: 0,
    scale: 0.95,
  }),
};

const transition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};

type Props = {
  stepKey: number;
  direction: number;
  children: ReactNode;
};

export const StepTransition = ({ stepKey, direction, children }: Props) => (
  <AnimatePresence mode="wait" custom={direction}>
    <motion.div
      key={stepKey}
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={transition}
      className="w-full"
    >
      {children}
    </motion.div>
  </AnimatePresence>
);
