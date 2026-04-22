"use client";

import { motion } from "framer-motion";
import { Button, Textarea, Chip } from "@heroui/react";
import { ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useOnboardingStore } from "@/features/onboarding/model";
import { useAIOrderGenerate } from "@/features/onboarding/hooks/useAIOrderGenerate";

export const StepDescribeTask = () => {
  const { clientData, updateClient, nextStep } = useOnboardingStore();
  const { streamText, result, isStreaming, generate } = useAIOrderGenerate();

  const handleGenerate = async () => {
    await generate(clientData.freeText);
  };

  // When result is parsed, fill clientData and advance
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
      <h2 className="mb-1 text-2xl font-bold text-zinc-100">
        Что нужно сделать?
      </h2>
      <p className="mb-6 text-sm text-zinc-500">
        Опишите задачу в свободной форме — ИИ оформит заказ
      </p>

      <Textarea
        label="Описание задачи"
        placeholder="Например: нужен лендинг для стоматологической клиники, 5 экранов, адаптивный..."
        value={clientData.freeText}
        onValueChange={(v) => updateClient({ freeText: v })}
        variant="bordered"
        minRows={5}
        classNames={{ inputWrapper: "border-zinc-700 hover:border-emerald-500/50" }}
      />

      <div className="mt-4 flex gap-2">
        <Button
          color="secondary"
          startContent={<Sparkles size={14} />}
          isLoading={isStreaming}
          isDisabled={!clientData.freeText.trim()}
          onPress={handleGenerate}
        >
          Создать заказ с ИИ
        </Button>
        {result && !isStreaming && (
          <Button
            color="secondary"
            variant="flat"
            endContent={<ArrowRight size={14} />}
            onPress={handleAccept}
          >
            Далее к проверке
          </Button>
        )}
      </div>

      {(streamText || isStreaming || result) && (
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
          {isStreaming ? (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Loader2 size={14} className="animate-spin text-emerald-400" />
              ИИ анализирует задачу и подготавливает поля формы...
            </div>
          ) : result ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 size={14} />
                Черновик заказа готов. На следующем шаге форма уже заполнена.
              </div>
              <p className="text-sm font-medium text-zinc-200">{result.title}</p>
              <div className="flex flex-wrap gap-2">
                {result.skills.slice(0, 5).map((skill) => (
                  <Chip
                    key={skill}
                    size="sm"
                    variant="flat"
                    classNames={{
                      base: "bg-emerald-500/10 border border-emerald-500/20",
                      content: "text-emerald-300",
                    }}
                  >
                    {skill}
                  </Chip>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              ИИ не вернул структурированный ответ. Попробуйте перегенерировать.
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
};
