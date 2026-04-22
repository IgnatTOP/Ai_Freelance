"use client";

import { motion } from "framer-motion";
import { Button, Input, Textarea } from "@heroui/react";
import { ArrowLeft, ArrowRight, Sparkles, Check } from "lucide-react";
import { useOnboardingStore } from "@/features/onboarding/model";
import { useAIProfileImprove } from "@/features/onboarding/hooks/useAIProfileImprove";
import { AIStreamingText } from "../AIStreamingText";

export const StepRate = () => {
  const { freelancerData, updateFreelancer, nextStep, prevStep } =
    useOnboardingStore();
  const { text: aiText, isStreaming, improve, clear } = useAIProfileImprove();

  const handleImprove = () => {
    improve(freelancerData.bio, freelancerData.skills);
  };

  const acceptAI = () => {
    if (aiText) {
      updateFreelancer({ bio: aiText });
      clear();
    }
  };

  return (
    <motion.div
      className="glass-card rounded-2xl p-6 sm:p-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <h2 className="mb-1 text-2xl font-bold text-zinc-100">Ставка и био</h2>
      <p className="mb-6 text-sm text-zinc-500">
        Укажите ставку и расскажите о себе
      </p>

      <div className="space-y-4">
        <Input
          label="Часовая ставка (₽/час)"
          type="number"
          placeholder="2000"
          value={freelancerData.hourlyRate}
          onValueChange={(v) => updateFreelancer({ hourlyRate: v })}
          variant="bordered"
          classNames={{ inputWrapper: "border-zinc-700 hover:border-purple-500/50" }}
        />

        <Textarea
          label="О себе"
          placeholder="Расскажите о своём опыте, подходе к работе..."
          value={freelancerData.bio}
          onValueChange={(v) => updateFreelancer({ bio: v })}
          variant="bordered"
          minRows={4}
          classNames={{ inputWrapper: "border-zinc-700 hover:border-purple-500/50" }}
        />

        <div className="flex gap-2">
          <Button
            variant="flat"
            color="secondary"
            size="sm"
            startContent={<Sparkles size={14} />}
            isLoading={isStreaming}
            onPress={handleImprove}
            isDisabled={!freelancerData.bio.trim()}
          >
            Улучшить с ИИ
          </Button>
          {aiText && !isStreaming && (
            <Button
              variant="flat"
              color="success"
              size="sm"
              startContent={<Check size={14} />}
              onPress={acceptAI}
            >
              Принять
            </Button>
          )}
        </div>

        {(aiText || isStreaming) && (
          <AIStreamingText text={aiText} isStreaming={isStreaming} />
        )}
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="light" startContent={<ArrowLeft size={16} />} onPress={prevStep}>
          Назад
        </Button>
        <Button
          color="secondary"
          endContent={<ArrowRight size={16} />}
          isDisabled={!freelancerData.hourlyRate.trim()}
          onPress={nextStep}
        >
          Далее
        </Button>
      </div>
    </motion.div>
  );
};
