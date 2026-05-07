"use client";

import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, FileText } from "lucide-react";
import { useOnboardingStore } from "@/features/onboarding/model";
import { FilkaButton, FilkaField, FilkaTextarea } from "@/shared/ui/filka/FilkaPrimitives";

export const StepDescription = () => {
  const { clientData, updateClient, nextStep, prevStep } = useOnboardingStore();
  const description = clientData.description ?? "";

  return (
    <motion.div
      className="glass-card rounded-2xl p-6 sm:p-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <h2 className="mb-1 text-2xl font-bold text-[var(--fg-0)]">Чем вы занимаетесь?</h2>
      <p className="mb-6 text-sm text-[var(--fg-3)]">
        Расскажите о своей деятельности — это поможет фрилансерам лучше понять ваши задачи
      </p>

      <FilkaField label="Описание деятельности">
        <div className="relative">
          <FileText size={16} className="pointer-events-none absolute left-3 top-3 text-[var(--fg-3)]" />
          <FilkaTextarea
            className="min-h-[120px] pl-10"
            placeholder="Например: мы разрабатываем мобильные приложения для ритейла и часто ищем дизайнеров и разработчиков..."
            value={description}
            onChange={(e) => updateClient({ description: e.target.value })}
          />
        </div>
      </FilkaField>

      <div className="mt-2 text-right">
        <span className="text-xs text-[var(--fg-3)]">{description.length} / 500</span>
      </div>

      <div className="mt-6 flex justify-between">
        <FilkaButton variant="ghost" startContent={<ArrowLeft size={16} />} onClick={prevStep}>
          Назад
        </FilkaButton>
        <FilkaButton variant="primary" endContent={<ArrowRight size={16} />} onClick={nextStep}>
          {description.trim() ? "Далее" : "Пропустить"}
        </FilkaButton>
      </div>
    </motion.div>
  );
};
