"use client";

import { motion } from "framer-motion";
import { Button, Input } from "@heroui/react";
import { ArrowRight } from "lucide-react";
import { useOnboardingStore } from "@/features/onboarding/model";

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
      <h2 className="mb-1 text-2xl font-bold text-zinc-100">
        Как вас зовут?
      </h2>
      <p className="mb-6 text-sm text-zinc-500">Имя и фамилия</p>

      <Input
        label="Имя и фамилия"
        placeholder="Иван Иванов"
        value={freelancerData.name}
        onValueChange={(v) => updateFreelancer({ name: v })}
        variant="bordered"
        classNames={{ inputWrapper: "border-zinc-700 hover:border-emerald-500/50" }}
      />

      <div className="mt-8 flex justify-end">
        <Button
          color="secondary"
          endContent={<ArrowRight size={16} />}
          isDisabled={!canContinue}
          onPress={nextStep}
        >
          Далее
        </Button>
      </div>
    </motion.div>
  );
};
