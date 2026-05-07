"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/features/onboarding/model";
import { FilkaButton } from "@/shared/ui/filka/FilkaPrimitives";

type Props = {
  orderId: string;
};

export const StepPublishSuccess = ({ orderId }: Props) => {
  const router = useRouter();
  const { clientData } = useOnboardingStore();

  const redirectUrl = `/dashboard/orders/${orderId}` as never;

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace(redirectUrl);
    }, 5000);
    return () => clearTimeout(timeout);
  }, [router, redirectUrl]);

  return (
    <motion.div
      className="flex flex-col items-center text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.svg
        width={80}
        height={80}
        viewBox="0 0 80 80"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(102,58,243,0.25)" strokeWidth="3" />
        <motion.circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke="#663af3"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />
        <motion.path
          d="M24 40 L35 51 L56 30"
          fill="none"
          stroke="#663af3"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
        />
      </motion.svg>

      <motion.h2
        className="mt-6 text-2xl font-bold text-[var(--fg-0)]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3 }}
      >
        Заказ опубликован!
      </motion.h2>

      <motion.div
        className="glass-card mt-6 w-full max-w-sm rounded-xl p-4 text-left"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
      >
        <h3 className="text-sm font-semibold text-[var(--fg-0)]">{clientData.generatedTitle}</h3>
        <p className="mt-1 line-clamp-2 text-xs text-[var(--fg-3)]">{clientData.generatedDescription}</p>
        {clientData.generatedBudgetMax > 0 && (
          <p className="mt-2 text-xs text-[var(--mint-300)]">до {clientData.generatedBudgetMax.toLocaleString("ru-RU")} ₽</p>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }} className="mt-8">
        <FilkaButton variant="primary" endContent={<ArrowRight size={16} />} onClick={() => router.replace(redirectUrl)}>
          Перейти к заказу
        </FilkaButton>
        <p className="mt-3 text-xs text-[var(--fg-3)]">Автоматический переход через 5 секунд...</p>
      </motion.div>
    </motion.div>
  );
};
