"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useOnboardingStore } from "@/features/onboarding/model";
import { FilkaButton, FilkaField, FilkaInput } from "@/shared/ui/filka/FilkaPrimitives";

export const StepExperience = () => {
  const { freelancerData, updateFreelancer, nextStep, prevStep } = useOnboardingStore();

  return (
    <motion.div
      className="glass-card rounded-2xl p-6 sm:p-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <h2 className="mb-1 text-2xl font-bold text-[var(--fg-0)]">Ваш опыт</h2>
      <p className="mb-6 text-sm text-[var(--fg-3)]">Возраст и опыт работы в годах</p>

      <div className="grid grid-cols-2 gap-4">
        <FilkaField label="Возраст">
          <FilkaInput
            type="number"
            placeholder="25"
            value={freelancerData.age}
            onChange={(e) => updateFreelancer({ age: e.target.value })}
          />
        </FilkaField>
        <FilkaField label="Опыт (лет)">
          <FilkaInput
            type="number"
            placeholder="3"
            value={freelancerData.experienceYears}
            onChange={(e) => updateFreelancer({ experienceYears: e.target.value })}
          />
        </FilkaField>
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
