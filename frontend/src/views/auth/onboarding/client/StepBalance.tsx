"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Wallet, CreditCard, Check } from "lucide-react";
import { useOnboardingStore } from "@/features/onboarding/model";
import { useBalance } from "@/features/balance-management";
import { paymentsApi } from "@/shared/api/endpoints/payments";
import { notify } from "@/shared/notifications/notify";
import { FilkaButton, FilkaCard, FilkaField, FilkaInput } from "@/shared/ui/filka/FilkaPrimitives";

type Props = {
  onFinish: () => void;
  isFinishing: boolean;
};

export const StepBalance = ({ onFinish, isFinishing }: Props) => {
  const queryClient = useQueryClient();
  const { data: balance } = useBalance();
  const { prevStep } = useOnboardingStore();

  const [amount, setAmount] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [deposited, setDeposited] = useState(false);

  const handleDeposit = async () => {
    const num = Number(amount);
    if (!num || num <= 0) return;

    setIsDepositing(true);
    try {
      await paymentsApi.deposit({ amount: num });
      void queryClient.invalidateQueries({ queryKey: ["balance"] });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setDeposited(true);
      notify.success({
        title: "Баланс пополнен",
        message: `+${num.toLocaleString("ru-RU")} ₽`,
      });
    } catch {
      notify.error({
        title: "Ошибка пополнения",
        message: "Попробуйте ещё раз",
      });
    } finally {
      setIsDepositing(false);
    }
  };

  const QUICK_AMOUNTS = [1000, 3000, 5000, 10000];

  return (
    <motion.div
      className="glass-card rounded-2xl p-6 sm:p-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <h2 className="mb-1 text-2xl font-bold text-[var(--fg-0)]">Пополните баланс</h2>
      <p className="mb-6 text-sm text-[var(--fg-3)]">Баланс нужен для размещения заказов. Вы можете пополнить позже.</p>

      <FilkaCard className="mb-6 border border-[var(--line)] bg-[var(--bg-1)]/80 p-4">
        <div className="flex flex-row items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(102,58,243,0.12)]">
            <Wallet size={24} className="text-[var(--mint-300)]" />
          </div>
          <div>
            <p className="text-xs text-[var(--fg-3)]">Текущий баланс</p>
            <p className="text-2xl font-bold text-[var(--fg-0)]">{(balance?.available ?? 0).toLocaleString("ru-RU")} ₽</p>
          </div>
        </div>
      </FilkaCard>

      <div className="mb-4 flex flex-wrap gap-2">
        {QUICK_AMOUNTS.map((q) => (
          <FilkaButton
            key={q}
            size="sm"
            variant={amount === String(q) ? "soft" : "ghost"}
            className="border border-[var(--line)]"
            onClick={() => setAmount(String(q))}
          >
            {q.toLocaleString("ru-RU")} ₽
          </FilkaButton>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <FilkaField label="Сумма пополнения (₽)" className="min-w-0 flex-1">
          <div className="relative">
            <CreditCard size={16} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--fg-3)]" />
            <FilkaInput className="pl-10" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </FilkaField>
        <FilkaButton
          variant="primary"
          className="w-full shrink-0 sm:w-auto"
          loading={isDepositing}
          disabled={!amount || Number(amount) <= 0 || deposited}
          startContent={deposited ? <Check size={16} /> : undefined}
          onClick={handleDeposit}
        >
          {deposited ? "Пополнено" : "Пополнить"}
        </FilkaButton>
      </div>

      <div className="mt-8 flex justify-between">
        <FilkaButton variant="ghost" startContent={<ArrowLeft size={16} />} onClick={prevStep}>
          Назад
        </FilkaButton>
        <FilkaButton variant="primary" loading={isFinishing} onClick={onFinish}>
          {deposited ? "Завершить" : "Пропустить и начать"}
        </FilkaButton>
      </div>
    </motion.div>
  );
};
