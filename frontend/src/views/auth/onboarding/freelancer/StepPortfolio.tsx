"use client";

import { motion } from "framer-motion";
import { Button, Input, Textarea } from "@heroui/react";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { useOnboardingStore, type PortfolioEntry } from "@/features/onboarding/model";

const MAX_ITEMS = 3;

const emptyEntry = (): PortfolioEntry => ({
  title: "",
  description: "",
  link: "",
});

export const StepPortfolio = () => {
  const { freelancerData, updateFreelancer, nextStep, prevStep } =
    useOnboardingStore();
  const items = freelancerData.portfolioItems;

  const updateItem = (index: number, patch: Partial<PortfolioEntry>) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, ...patch } : item
    );
    updateFreelancer({ portfolioItems: updated });
  };

  const addItem = () => {
    if (items.length < MAX_ITEMS) {
      updateFreelancer({ portfolioItems: [...items, emptyEntry()] });
    }
  };

  const removeItem = (index: number) => {
    updateFreelancer({ portfolioItems: items.filter((_, i) => i !== index) });
  };

  return (
    <motion.div
      className="glass-card rounded-2xl p-6 sm:p-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <h2 className="mb-1 text-2xl font-bold text-zinc-100">Портфолио</h2>
      <p className="mb-6 text-sm text-zinc-500">
        Добавьте до {MAX_ITEMS} работ (можно пропустить)
      </p>

      <div className="space-y-4">
        {items.map((item, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-700/50 bg-zinc-900/30 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">
                Работа {i + 1}
              </span>
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="text-zinc-500 hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <Input
              label="Название"
              value={item.title}
              onValueChange={(v) => updateItem(i, { title: v })}
              variant="bordered"
              size="sm"
              classNames={{ inputWrapper: "border-zinc-700 hover:border-emerald-500/50" }}
            />
            <Textarea
              label="Описание"
              value={item.description}
              onValueChange={(v) => updateItem(i, { description: v })}
              variant="bordered"
              size="sm"
              minRows={2}
              classNames={{ inputWrapper: "border-zinc-700 hover:border-emerald-500/50" }}
            />
            <Input
              label="Ссылка (необязательно)"
              value={item.link ?? ""}
              onValueChange={(v) => updateItem(i, { link: v })}
              variant="bordered"
              size="sm"
              classNames={{ inputWrapper: "border-zinc-700 hover:border-emerald-500/50" }}
            />
          </div>
        ))}

        {items.length < MAX_ITEMS && (
          <Button
            variant="bordered"
            className="border-dashed border-zinc-700"
            startContent={<Plus size={14} />}
            onPress={addItem}
            fullWidth
          >
            Добавить работу
          </Button>
        )}
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="light" startContent={<ArrowLeft size={16} />} onPress={prevStep}>
          Назад
        </Button>
        <Button color="secondary" endContent={<ArrowRight size={16} />} onPress={nextStep}>
          {items.length === 0 ? "Пропустить" : "Далее"}
        </Button>
      </div>
    </motion.div>
  );
};
