"use client";

import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Sparkles, MessageSquareHeart } from "lucide-react";
import { useOnboardingStore } from "@/features/onboarding/model";
import { FilkaButton, FilkaTextarea } from "@/shared/ui/filka/FilkaPrimitives";

type Props = {
  onFinish: (redirectTo?: string) => void;
  isFinishing: boolean;
};

export const StepWelcomeTemplate = ({ onFinish, isFinishing }: Props) => {
  const { prevStep, freelancerData, updateFreelancer } = useOnboardingStore();

  return (
    <motion.div
      className="glass-card rounded-2xl p-6 sm:p-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(52,211,153,0.22)] bg-[rgba(52,211,153,0.1)] text-[var(--mint-300)]">
          <MessageSquareHeart size={20} />
        </div>
        <h2 className="text-2xl font-bold text-[var(--fg-0)]">Шаблон отклика</h2>
      </div>
      <p className="mb-6 text-sm leading-relaxed text-[var(--fg-2)]">
        Подготовьте универсальное приветственное письмо. Оно будет автоматически подставляться при отклике на заказы, экономя ваше время.
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--fg-0)]">Текст отклика</span>
          <FilkaButton
            size="sm"
            variant="soft"
            className="h-7"
            startContent={<Sparkles size={14} />}
            onClick={() => {
              const aiTemplate = `Здравствуйте! Меня заинтересовал ваш проект.\nМой опыт и навыки (${freelancerData.skills.slice(0, 3).join(", ")}) отлично подходят для решения ваших задач. Я внимательно изучил требования и готов обсудить детали в чате.\n\nРаботаю на результат, соблюдаю сроки. Обращайтесь!`;
              updateFreelancer({ bio: aiTemplate });
            }}
          >
            AI: Сгенерировать
          </FilkaButton>
        </div>

        <FilkaTextarea
          placeholder="Здравствуйте! Предлагаю свои услуги для выполнения вашего заказа. Имею большой опыт в этой сфере..."
          value={freelancerData.bio}
          onChange={(e) => updateFreelancer({ bio: e.target.value })}
          className="min-h-[120px] text-sm leading-relaxed"
        />

        <div className="flex gap-3 rounded-xl border border-[rgba(125,211,252,0.2)] bg-[rgba(125,211,252,0.06)] p-4">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-[var(--info)]" />
          <p className="text-xs leading-relaxed text-[var(--fg-1)]">
            Вы сможете изменить текст перед отправкой каждого конкретного отклика. Хорошее сопроводительное письмо повышает шанс выбора исполнителем на 40%.
          </p>
        </div>
      </div>

      <div className="mt-8 flex justify-between border-t border-[var(--line)] pt-6">
        <FilkaButton variant="ghost" className="text-[var(--fg-2)]" startContent={<ArrowLeft size={16} />} onClick={prevStep}>
          Назад
        </FilkaButton>
        <FilkaButton variant="primary" loading={isFinishing} startContent={<CheckCircle2 size={16} />} onClick={() => onFinish()}>
          Начать работу
        </FilkaButton>
      </div>
    </motion.div>
  );
};
