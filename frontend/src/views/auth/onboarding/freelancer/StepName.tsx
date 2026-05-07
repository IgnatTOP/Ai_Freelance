"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useOnboardingStore } from "@/features/onboarding/model";
import { FilkaButton, FilkaField, FilkaInput } from "@/shared/ui/filka/FilkaPrimitives";

export const StepName = () => {
  const { freelancerData, updateFreelancer, nextStep } = useOnboardingStore();

  const canContinue = freelancerData.name.trim().length > 0;

  return (
    <motion.div
      className="glass-card rounded-2xl p-6 sm:p-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <h2 className="mb-1 text-2xl font-bold text-[var(--fg-0)]">Как вас зовут?</h2>
      <p className="mb-6 text-sm text-[var(--fg-3)]">Имя и фамилия</p>

      <FilkaField label="Имя и фамилия">
        <FilkaInput
          placeholder="Иван Иванов"
          value={freelancerData.name}
          onChange={(e) => updateFreelancer({ name: e.target.value })}
        />
      </FilkaField>

      <div className="mt-8 flex justify-end">
        <FilkaButton variant="primary" endContent={<ArrowRight size={16} />} disabled={!canContinue} onClick={nextStep}>
          Далее
        </FilkaButton>
      </div>
    </motion.div>
  );
};
