"use client";

import { motion } from "framer-motion";
import { Button } from "@heroui/react";
import { ArrowLeft, CheckCircle, Briefcase, Send, Search, Sparkles, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useOnboardingStore } from "@/features/onboarding/model";
import { useAIRecommendedOrders } from "@/features/onboarding/hooks/useAIRecommendedOrders";

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
      <h2 className="mb-1 text-2xl font-bold text-zinc-100">
        Рекомендуемые заказы
      </h2>
      <p className="mb-6 text-sm text-zinc-500">
        ИИ подобрал заказы по вашему профилю
      </p>

      {/* Orders grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {isLoading
          ? (
            <>
              <div className="sm:col-span-2 rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-zinc-900/70 p-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-14 w-14 shrink-0">
                    <div className="absolute inset-0 rounded-full border border-emerald-400/40 animate-ping" />
                    <div className="absolute inset-1 rounded-full border border-teal-400/50 animate-pulse" />
                    <div className="absolute inset-0 flex items-center justify-center text-emerald-300">
                      <Search size={20} className="animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-zinc-100">Ищем релевантные заказы</p>
                    <p className="text-xs text-zinc-400">Сопоставляем ваши навыки, бюджет и активные проекты</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1 text-emerald-300">
                    <Sparkles size={14} className="animate-bounce" />
                    <Sparkles size={12} className="animate-bounce [animation-delay:120ms]" />
                    <Sparkles size={10} className="animate-bounce [animation-delay:240ms]" />
                  </div>
                </div>
              </div>
              {Array.from({ length: 4 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="rounded-xl border border-zinc-700/50 bg-zinc-900/30 p-4"
                  initial={{ opacity: 0.35, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: i * 0.08, repeat: Infinity, repeatType: "reverse" }}
                >
                  <div className="mb-3 h-4 w-2/3 rounded bg-zinc-800 shimmer" />
                  <div className="mb-2 h-3 w-full rounded bg-zinc-800 shimmer" />
                  <div className="mb-2 h-3 w-4/5 rounded bg-zinc-800 shimmer" />
                  <div className="h-6 w-24 rounded-full bg-emerald-500/15" />
                </motion.div>
              ))}
            </>
          )
          : orders.map((order) => (
              <div
                key={order.id}
                className="card-hover-glow rounded-xl border border-zinc-700/50 bg-zinc-900/30 p-4"
              >
                <div className="mb-2 flex items-start gap-2">
                  <Briefcase
                    size={14}
                    className="mt-0.5 shrink-0 text-emerald-400"
                  />
                  <h3 className="text-sm font-semibold text-zinc-200 line-clamp-2">
                    {order.title}
                  </h3>
                </div>
                <p className="mb-3 text-xs text-zinc-500 line-clamp-3">
                  {order.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {order.skill_tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {order.budget_max > 0 && (
                  <p className="mt-2 text-xs font-medium text-zinc-400">
                    до {order.budget_max.toLocaleString("ru-RU")} ₽
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="flat"
                    isIconOnly
                    startContent={<ArrowUpRight size={13} />}
                    className="h-8 w-8 min-w-8 bg-zinc-800/80 text-zinc-200 border border-white/[0.08]"
                    onPress={() => onFinish(`/dashboard/orders/${order.id}`)}
                    isLoading={isFinishing}
                  />
                  <Button
                    size="sm"
                    color="secondary"
                    startContent={<Send size={13} />}
                    className="min-w-0 flex-1"
                    onPress={() => onFinish(`/dashboard/orders/${order.id}#respond`)}
                    isLoading={isFinishing}
                  >
                    Откликнуться
                  </Button>
                </div>
              </div>
            ))}
      </div>

      {!isLoading && orders.length === 0 && (
        <p className="py-8 text-center text-sm text-zinc-500">
          Пока нет подходящих заказов — они появятся позже
        </p>
      )}

      <div className="mt-8 flex justify-between">
        <Button variant="light" startContent={<ArrowLeft size={16} />} onPress={prevStep}>
          Назад
        </Button>
        <Button
          color="secondary"
          startContent={<CheckCircle size={16} />}
          onPress={() => onFinish()}
          isLoading={isFinishing}
        >
          Завершить
        </Button>
      </div>
    </motion.div>
  );
};
