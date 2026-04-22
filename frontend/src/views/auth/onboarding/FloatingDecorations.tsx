"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

const PARTICLE_COUNT = 10;

const randomBetween = (min: number, max: number) =>
  Math.random() * (max - min) + min;

export const FloatingDecorations = () => {
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        id: i,
        x: randomBetween(5, 95),
        y: randomBetween(5, 95),
        size: randomBetween(2, 5),
        duration: randomBetween(8, 16),
        delay: randomBetween(0, 4),
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Gradient blobs */}
      <div
        className="animate-blob absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)",
        }}
      />
      <div
        className="animate-blob-delay absolute -right-32 top-1/3 h-80 w-80 rounded-full opacity-15"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)",
        }}
      />
      <div
        className="animate-blob-delay-2 absolute -bottom-32 left-1/3 h-72 w-72 rounded-full opacity-15"
        style={{
          background:
            "radial-gradient(circle, rgba(192,132,252,0.3) 0%, transparent 70%)",
        }}
      />

      {/* Floating particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: "rgba(139,92,246,0.3)",
          }}
          animate={{
            y: [0, -30, 10, -20, 0],
            x: [0, 15, -10, 5, 0],
            opacity: [0.2, 0.5, 0.3, 0.6, 0.2],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};
