"use client";

import { motion } from "framer-motion";
import { Button, Chip, Input } from "@heroui/react";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { useOnboardingStore } from "@/features/onboarding/model";

export const StepContacts = () => {
  const { freelancerData, updateFreelancer, nextStep, prevStep } =
    useOnboardingStore();

  return (
    <motion.div
      className="glass-card rounded-2xl p-6 sm:p-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <h2 className="mb-1 text-2xl font-bold text-zinc-100">Контакты</h2>
      <p className="mb-6 text-sm text-zinc-500">Email для связи с заказчиками</p>

      <Input
        label="Email"
        type="email"
        placeholder="mail@example.com"
        value={freelancerData.email}
        onValueChange={(v) => updateFreelancer({ email: v })}
        variant="bordered"
        classNames={{ inputWrapper: "border-zinc-700 hover:border-emerald-500/50" }}
      />

      <div className="mt-4">
        <Chip
          color="success"
          variant="flat"
          startContent={<CheckCircle size={14} />}
        >
          Телефон подтверждён
        </Chip>
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
