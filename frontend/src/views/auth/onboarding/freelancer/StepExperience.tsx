"use client";

import { motion } from "framer-motion";
import { Button, Input } from "@heroui/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useOnboardingStore } from "@/features/onboarding/model";

export const StepExperience = () => {
  const { freelancerData, updateFreelancer, nextStep, prevStep } =
    useOnboardingStore();

  return (
    <motion.div
      className="glass-card rounded-2xl p-6 sm:p-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <h2 className="mb-1 text-2xl font-bold text-zinc-100">Ваш опыт</h2>
      <p className="mb-6 text-sm text-zinc-500">
        Возраст и опыт работы в годах
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Возраст"
          type="number"
          placeholder="25"
          value={freelancerData.age}
          onValueChange={(v) => updateFreelancer({ age: v })}
          variant="bordered"
          classNames={{ inputWrapper: "border-zinc-700 hover:border-emerald-500/50" }}
        />
        <Input
          label="Опыт (лет)"
          type="number"
          placeholder="3"
          value={freelancerData.experienceYears}
          onValueChange={(v) => updateFreelancer({ experienceYears: v })}
          variant="bordered"
          classNames={{ inputWrapper: "border-zinc-700 hover:border-emerald-500/50" }}
        />
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="light" startContent={<ArrowLeft size={16} />} onPress={prevStep}>
          Назад
        </Button>
        <Button color="secondary" endContent={<ArrowRight size={16} />} onPress={nextStep}>
          Далее
        </Button>
      </div>
    </motion.div>
  );
};
