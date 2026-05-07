"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { useOnboardingStore, type PortfolioEntry } from "@/features/onboarding/model";
import { FilkaButton, FilkaField, FilkaInput, FilkaTextarea } from "@/shared/ui/filka/FilkaPrimitives";

const MAX_ITEMS = 3;

const emptyEntry = (): PortfolioEntry => ({
  title: "",
  description: "",
  link: "",
});

export const StepPortfolio = () => {
  const { freelancerData, updateFreelancer, nextStep, prevStep } = useOnboardingStore();
  const items = freelancerData.portfolioItems;

  const updateItem = (index: number, patch: Partial<PortfolioEntry>) => {
    const updated = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
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
      <h2 className="mb-1 text-2xl font-bold text-[var(--fg-0)]">Портфолио</h2>
      <p className="mb-6 text-sm text-[var(--fg-3)]">Добавьте до {MAX_ITEMS} работ (можно пропустить)</p>

      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--bg-1)]/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--fg-3)]">Работа {i + 1}</span>
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="text-[var(--fg-3)] transition-colors hover:text-[var(--err)]"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <FilkaField label="Название">
              <FilkaInput value={item.title} onChange={(e) => updateItem(i, { title: e.target.value })} className="text-sm" />
            </FilkaField>
            <FilkaField label="Описание">
              <FilkaTextarea
                value={item.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
                className="min-h-[72px] text-sm"
              />
            </FilkaField>
            <FilkaField label="Ссылка (необязательно)">
              <FilkaInput value={item.link ?? ""} onChange={(e) => updateItem(i, { link: e.target.value })} className="text-sm" />
            </FilkaField>
          </div>
        ))}

        {items.length < MAX_ITEMS && (
          <FilkaButton
            variant="ghost"
            className="w-full border border-dashed border-[var(--line)]"
            startContent={<Plus size={14} />}
            onClick={addItem}
          >
            Добавить работу
          </FilkaButton>
        )}
      </div>

      <div className="mt-8 flex justify-between">
        <FilkaButton variant="ghost" startContent={<ArrowLeft size={16} />} onClick={prevStep}>
          Назад
        </FilkaButton>
        <FilkaButton variant="primary" endContent={<ArrowRight size={16} />} onClick={nextStep}>
          {items.length === 0 ? "Пропустить" : "Далее"}
        </FilkaButton>
      </div>
    </motion.div>
  );
};
