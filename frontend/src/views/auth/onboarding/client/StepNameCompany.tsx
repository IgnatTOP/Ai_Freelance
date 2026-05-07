"use client";

import { motion } from "framer-motion";
import { ArrowRight, Building2, User } from "lucide-react";
import { useOnboardingStore } from "@/features/onboarding/model";
import { FilkaButton, FilkaField, FilkaInput } from "@/shared/ui/filka/FilkaPrimitives";

export const StepNameCompany = () => {
  const { clientData, updateClient, nextStep } = useOnboardingStore();

  const canContinue = clientData.name.trim().length > 0;

  return (
    <motion.div
      className="glass-card rounded-2xl p-6 sm:p-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <h2 className="mb-1 text-2xl font-bold text-[var(--fg-0)]">Расскажите о себе</h2>
      <p className="mb-6 text-sm text-[var(--fg-3)]">Как к вам обращаться и название вашей компании</p>

      <div className="space-y-4">
        <FilkaField label="Имя и фамилия">
          <div className="relative">
            <User size={16} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--fg-3)]" />
            <FilkaInput
              className="pl-10"
              placeholder="Иван Иванов"
              value={clientData.name}
              onChange={(e) => updateClient({ name: e.target.value })}
            />
          </div>
        </FilkaField>

        <FilkaField label="Компания">
          <div className="relative">
            <Building2 size={16} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--fg-3)]" />
            <FilkaInput
              className="pl-10"
              placeholder="ООО «Ваша компания» (необязательно)"
              value={clientData.company}
              onChange={(e) => updateClient({ company: e.target.value })}
            />
          </div>
        </FilkaField>
      </div>

      <div className="mt-8 flex justify-end">
        <FilkaButton variant="primary" endContent={<ArrowRight size={16} />} disabled={!canContinue} onClick={nextStep}>
          Далее
        </FilkaButton>
      </div>
    </motion.div>
  );
};
