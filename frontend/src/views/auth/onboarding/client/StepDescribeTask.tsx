"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useOnboardingStore } from "@/features/onboarding/model";
import { useAIOrderGenerate } from "@/features/onboarding/hooks/useAIOrderGenerate";
import { FilkaButton, FilkaChip, FilkaField, FilkaTextarea } from "@/shared/ui/filka/FilkaPrimitives";

export const StepDescribeTask = () => {
  const { clientData, updateClient, nextStep } = useOnboardingStore();
  const { streamText, result, isStreaming, generate } = useAIOrderGenerate();

  const handleGenerate = async () => {
    await generate(clientData.freeText);
  };

  const handleAccept = () => {
    if (result) {
      updateClient({
        generatedTitle: result.title || "",
        generatedDescription: result.description || "",
        generatedCategoryId: result.category_id || "",
        generatedSkills: result.skills || [],
        generatedBudgetMax: result.budget_max || 0,
        generatedDeadline: result.deadline || "",
      });
      nextStep();
    }
  };

  return (
    <motion.div
      className="glass-card rounded-2xl p-6 sm:p-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <h2 className="mb-1 text-2xl font-bold text-[var(--fg-0)]">Что нужно сделать?</h2>
      <p className="mb-6 text-sm text-[var(--fg-3)]">Опишите задачу в свободной форме — ИИ оформит заказ</p>

      <FilkaField label="Описание задачи">
        <FilkaTextarea
          placeholder="Например: нужен лендинг для стоматологической клиники, 5 экранов, адаптивный..."
          value={clientData.freeText}
          onChange={(e) => updateClient({ freeText: e.target.value })}
          className="min-h-[120px]"
        />
      </FilkaField>

      <div className="mt-4 flex flex-wrap gap-2">
        <FilkaButton
          variant="soft"
          loading={isStreaming}
          disabled={!clientData.freeText.trim()}
          startContent={<Sparkles size={14} />}
          onClick={handleGenerate}
        >
          Создать заказ с ИИ
        </FilkaButton>
        {result && !isStreaming && (
          <FilkaButton variant="ghost" endContent={<ArrowRight size={14} />} onClick={handleAccept}>
            Далее к проверке
          </FilkaButton>
        )}
      </div>

      {(streamText || isStreaming || result) && (
        <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--bg-1)]/80 p-4">
          {isStreaming ? (
            <div className="flex items-center gap-2 text-sm text-[var(--fg-2)]">
              <Loader2 size={14} className="animate-spin text-[var(--mint-400)]" />
              ИИ анализирует задачу и подготавливает поля формы...
            </div>
          ) : result ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-[var(--mint-300)]">
                <CheckCircle2 size={14} />
                Черновик заказа готов. На следующем шаге форма уже заполнена.
              </div>
              <p className="text-sm font-medium text-[var(--fg-0)]">{result.title}</p>
              <div className="flex flex-wrap gap-2">
                {result.skills.slice(0, 5).map((skill) => (
                  <FilkaChip key={skill}>{skill}</FilkaChip>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--fg-3)]">ИИ не вернул структурированный ответ. Попробуйте перегенерировать.</p>
          )}
        </div>
      )}
    </motion.div>
  );
};
