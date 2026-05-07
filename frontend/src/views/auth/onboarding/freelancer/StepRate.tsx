"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles, Check } from "lucide-react";
import { useOnboardingStore } from "@/features/onboarding/model";
import { useAIProfileImprove } from "@/features/onboarding/hooks/useAIProfileImprove";
import { AIStreamingText } from "../AIStreamingText";
import { FilkaButton, FilkaField, FilkaInput, FilkaTextarea } from "@/shared/ui/filka/FilkaPrimitives";

export const StepRate = () => {
  const { freelancerData, updateFreelancer, nextStep, prevStep } = useOnboardingStore();
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
      <h2 className="mb-1 text-2xl font-bold text-[var(--fg-0)]">Ставка и био</h2>
      <p className="mb-6 text-sm text-[var(--fg-3)]">Укажите ставку и расскажите о себе</p>

      <div className="space-y-4">
        <FilkaField label="Часовая ставка (₽/час)">
          <FilkaInput
            type="number"
            placeholder="2000"
            value={freelancerData.hourlyRate}
            onChange={(e) => updateFreelancer({ hourlyRate: e.target.value })}
          />
        </FilkaField>

        <FilkaField label="О себе">
          <FilkaTextarea
            placeholder="Расскажите о своём опыте, подходе к работе..."
            value={freelancerData.bio}
            onChange={(e) => updateFreelancer({ bio: e.target.value })}
            className="min-h-[100px]"
          />
        </FilkaField>

        <div className="flex flex-wrap gap-2">
          <FilkaButton
            variant="soft"
            size="sm"
            loading={isStreaming}
            startContent={<Sparkles size={14} />}
            disabled={!freelancerData.bio.trim()}
            onClick={handleImprove}
          >
            Улучшить с ИИ
          </FilkaButton>
          {aiText && !isStreaming && (
            <FilkaButton variant="soft" size="sm" startContent={<Check size={14} />} onClick={acceptAI}>
              Принять
            </FilkaButton>
          )}
        </div>

        {(aiText || isStreaming) && <AIStreamingText text={aiText} isStreaming={isStreaming} />}
      </div>

      <div className="mt-8 flex justify-between">
        <FilkaButton variant="ghost" startContent={<ArrowLeft size={16} />} onClick={prevStep}>
          Назад
        </FilkaButton>
        <FilkaButton variant="primary" endContent={<ArrowRight size={16} />} disabled={!freelancerData.hourlyRate.trim()} onClick={nextStep}>
          Далее
        </FilkaButton>
      </div>
    </motion.div>
  );
};
