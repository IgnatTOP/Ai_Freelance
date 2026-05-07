"use client";

import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, Briefcase, Send, Search, Sparkles, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useOnboardingStore } from "@/features/onboarding/model";
import { useAIRecommendedOrders } from "@/features/onboarding/hooks/useAIRecommendedOrders";
import { FilkaButton, FilkaChip } from "@/shared/ui/filka/FilkaPrimitives";

type Props = {
  onFinish: (redirectTo?: string) => void;
  isFinishing: boolean;
};

export const StepRecommendedOrders = ({ onFinish, isFinishing }: Props) => {
  const { prevStep } = useOnboardingStore();
  const { orders, isLoading, fetch: fetchOrders } = useAIRecommendedOrders();
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!fetched) {
      setFetched(true);
      fetchOrders();
    }
  }, [fetched, fetchOrders]);

  return (
    <motion.div
      className="glass-card rounded-2xl p-6 sm:p-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <h2 className="mb-1 text-2xl font-bold text-[var(--fg-0)]">Рекомендуемые заказы</h2>
      <p className="mb-6 text-sm text-[var(--fg-3)]">ИИ подобрал заказы по вашему профилю</p>

      <div className="grid gap-3 sm:grid-cols-2">
        {isLoading ? (
          <>
            <div className="rounded-xl border border-[rgba(102,58,243,0.2)] bg-[linear-gradient(135deg,rgba(102,58,243,0.1),rgba(20,21,42,0.6))] p-4 sm:col-span-2">
              <div className="flex items-center gap-4">
                <div className="relative h-14 w-14 shrink-0">
                  <div className="absolute inset-0 animate-ping rounded-full border border-[rgba(102,58,243,0.35)]" />
                  <div className="absolute inset-1 animate-pulse rounded-full border border-[rgba(102,58,243,0.4)]" />
                  <div className="absolute inset-0 flex items-center justify-center text-[var(--mint-300)]">
                    <Search size={20} className="animate-pulse" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[var(--fg-0)]">Ищем релевантные заказы</p>
                  <p className="text-xs text-[var(--fg-2)]">Сопоставляем ваши навыки, бюджет и активные проекты</p>
                </div>
                <div className="ml-auto flex items-center gap-1 text-[var(--mint-300)]">
                  <Sparkles size={14} className="animate-bounce" />
                  <Sparkles size={12} className="animate-bounce [animation-delay:120ms]" />
                  <Sparkles size={10} className="animate-bounce [animation-delay:240ms]" />
                </div>
              </div>
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <motion.div
                key={i}
                className="rounded-xl border border-[var(--line)] bg-[var(--bg-1)]/50 p-4"
                initial={{ opacity: 0.35, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: i * 0.08, repeat: Infinity, repeatType: "reverse" }}
              >
                <div className="mb-3 h-4 w-2/3 rounded bg-[var(--bg-3)] shimmer" />
                <div className="mb-2 h-3 w-full rounded bg-[var(--bg-3)] shimmer" />
                <div className="mb-2 h-3 w-4/5 rounded bg-[var(--bg-3)] shimmer" />
                <div className="h-6 w-24 rounded-full bg-[rgba(102,58,243,0.12)]" />
              </motion.div>
            ))}
          </>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="card-hover-glow rounded-xl border border-[var(--line)] bg-[var(--bg-1)]/40 p-4">
              <div className="mb-2 flex items-start gap-2">
                <Briefcase size={14} className="mt-0.5 shrink-0 text-[var(--mint-300)]" />
                <h3 className="line-clamp-2 text-sm font-semibold text-[var(--fg-0)]">{order.title}</h3>
              </div>
              <p className="mb-3 line-clamp-3 text-xs text-[var(--fg-2)]">{order.description}</p>
              <div className="flex flex-wrap gap-1">
                {order.skill_tags.slice(0, 3).map((tag) => (
                  <FilkaChip key={tag} className="px-2 py-0.5 text-[10px]">
                    {tag}
                  </FilkaChip>
                ))}
              </div>
              {order.budget_max > 0 && (
                <p className="mt-2 text-xs font-medium text-[var(--fg-2)]">до {order.budget_max.toLocaleString("ru-RU")} ₽</p>
              )}
              <div className="mt-3 flex gap-2">
                <FilkaButton
                  size="sm"
                  variant="ghost"
                  className="h-8 min-w-8 max-w-8 p-0"
                  loading={isFinishing}
                  onClick={() => onFinish(`/dashboard/orders/${order.id}`)}
                  aria-label="Открыть"
                >
                  <ArrowUpRight size={13} />
                </FilkaButton>
                <FilkaButton
                  size="sm"
                  variant="primary"
                  className="min-w-0 flex-1"
                  loading={isFinishing}
                  startContent={<Send size={13} />}
                  onClick={() => onFinish(`/dashboard/orders/${order.id}#respond`)}
                >
                  Откликнуться
                </FilkaButton>
              </div>
            </div>
          ))
        )}
      </div>

      {!isLoading && orders.length === 0 && <p className="py-8 text-center text-sm text-[var(--fg-3)]">Пока нет подходящих заказов — они появятся позже</p>}

      <div className="mt-8 flex justify-between">
        <FilkaButton variant="ghost" startContent={<ArrowLeft size={16} />} onClick={prevStep}>
          Назад
        </FilkaButton>
        <FilkaButton variant="primary" loading={isFinishing} startContent={<CheckCircle size={16} />} onClick={() => onFinish()}>
          Завершить
        </FilkaButton>
      </div>
    </motion.div>
  );
};
