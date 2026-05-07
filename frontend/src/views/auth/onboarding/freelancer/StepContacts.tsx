"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { useOnboardingStore } from "@/features/onboarding/model";
import { FilkaButton, FilkaField, FilkaInput, FilkaChip } from "@/shared/ui/filka/FilkaPrimitives";

export const StepContacts = () => {
  const { freelancerData, updateFreelancer, nextStep, prevStep } = useOnboardingStore();

  return (
    <motion.div
      className="glass-card rounded-2xl p-6 sm:p-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <h2 className="mb-1 text-2xl font-bold text-[var(--fg-0)]">Контакты</h2>
      <p className="mb-6 text-sm text-[var(--fg-3)]">Email для связи с заказчиками</p>

      <FilkaField label="Email">
        <FilkaInput
          type="email"
          placeholder="mail@example.com"
          value={freelancerData.email}
          onChange={(e) => updateFreelancer({ email: e.target.value })}
        />
      </FilkaField>

      <div className="mt-4">
        <FilkaChip className="gap-1.5">
          <CheckCircle size={14} className="text-[var(--ok)]" />
          Телефон подтверждён
        </FilkaChip>
      </div>

      <div className="mt-8 flex justify-between">
        <FilkaButton variant="ghost" startContent={<ArrowLeft size={16} />} onClick={prevStep}>
          Назад
        </FilkaButton>
        <FilkaButton variant="primary" endContent={<ArrowRight size={16} />} onClick={nextStep}>
          Далее
        </FilkaButton>
      </div>
    </motion.div>
  );
};
