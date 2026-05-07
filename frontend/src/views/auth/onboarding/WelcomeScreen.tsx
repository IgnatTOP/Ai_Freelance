"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { FilkaButton } from "@/shared/ui/filka/FilkaPrimitives";

type Props = {
  role: "client" | "freelancer";
  onStart: () => void;
};

export const WelcomeScreen = ({ role, onStart }: Props) => {
  const subtitle =
    role === "freelancer"
      ? "Давайте создадим ваш профиль за пару минут"
      : "Опишите задачу — наш ИИ оформит заказ за вас";

  return (
    <div className="flex flex-col items-center text-center">
      <motion.svg
        width={64}
        height={64}
        viewBox="0 0 32 32"
        fill="none"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <defs>
          <linearGradient id="welcome-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#b6d9fc" />
            <stop offset="50%" stopColor="#663af3" />
            <stop offset="100%" stopColor="#4f2bc7" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="14" stroke="url(#welcome-grad)" strokeWidth="2.5" fill="none" />
        <circle cx="16" cy="16" r="5" fill="url(#welcome-grad)" />
        <path
          d="M16 2 C20 8, 24 12, 30 16 C24 20, 20 24, 16 30 C12 24, 8 20, 2 16 C8 12, 12 8, 16 2Z"
          fill="url(#welcome-grad)"
          opacity="0.3"
        />
      </motion.svg>

      <motion.h1
        className="mt-6 text-4xl font-bold gradient-text sm:text-5xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        Филка
      </motion.h1>

      <motion.p
        className="mt-4 max-w-md text-lg text-[var(--fg-2)]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        {subtitle}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="mt-10"
      >
        <FilkaButton size="lg" className="px-8 text-base font-semibold" endContent={<ArrowRight size={18} />} onClick={onStart}>
          Начать
        </FilkaButton>
      </motion.div>
    </div>
  );
};
