"use client";

import { motion } from "framer-motion";
import { Button, Chip, Input, Select, SelectItem, Textarea } from "@heroui/react";
import { ArrowLeft, Send, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useOnboardingStore } from "@/features/onboarding/model";
import { catalogApi, type Category } from "@/shared/api/endpoints/catalog";

type Props = {
  onPublish: () => void;
  isPublishing: boolean;
};

export const StepReviewOrder = ({ onPublish, isPublishing }: Props) => {
  const { clientData, updateClient, prevStep } = useOnboardingStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [skillInput, setSkillInput] = useState("");

  useEffect(() => {
    catalogApi.listCategories().then(setCategories).catch(() => {});
  }, []);

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !clientData.generatedSkills.includes(trimmed)) {
      updateClient({ generatedSkills: [...clientData.generatedSkills, trimmed] });
    }
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    updateClient({
      generatedSkills: clientData.generatedSkills.filter((s) => s !== skill),
    });
  };

  return (
    <motion.div
      className="glass-card rounded-2xl p-6 sm:p-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <h2 className="mb-1 text-2xl font-bold text-zinc-100">Проверка заказа</h2>
      <p className="mb-6 text-sm text-zinc-500">
        Проверьте и отредактируйте сгенерированный заказ
      </p>

      <div className="space-y-4">
        <Input
          label="Название"
          value={clientData.generatedTitle}
          onValueChange={(v) => updateClient({ generatedTitle: v })}
          variant="bordered"
          classNames={{ inputWrapper: "border-zinc-700 hover:border-emerald-500/50" }}
        />

        <Textarea
          label="Описание"
          value={clientData.generatedDescription}
          onValueChange={(v) => updateClient({ generatedDescription: v })}
          variant="bordered"
          minRows={4}
          classNames={{ inputWrapper: "border-zinc-700 hover:border-emerald-500/50" }}
        />

        {categories.length > 0 && (
          <Select
            label="Категория"
            selectedKeys={clientData.generatedCategoryId ? [clientData.generatedCategoryId] : []}
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0] as string;
              updateClient({ generatedCategoryId: val });
            }}
            variant="bordered"
            classNames={{ trigger: "border-zinc-700 hover:border-emerald-500/50" }}
          >
            {categories.map((cat) => (
              <SelectItem key={cat.id}>{cat.name}</SelectItem>
            ))}
          </Select>
        )}

        {/* Skills */}
        <div>
          <p className="mb-2 text-sm text-zinc-400">Навыки</p>
          <div className="mb-2 flex flex-wrap gap-2">
            {clientData.generatedSkills.map((skill) => (
              <Chip
                key={skill}
                variant="flat"
                color="secondary"
                onClose={() => removeSkill(skill)}
                endContent={<X size={12} />}
              >
                {skill}
              </Chip>
            ))}
          </div>
          <Input
            placeholder="Добавить навык..."
            value={skillInput}
            onValueChange={setSkillInput}
            onKeyDown={(e) => {
              if (e.key === "Enter" && skillInput.trim()) addSkill(skillInput);
            }}
            variant="bordered"
            size="sm"
            classNames={{ inputWrapper: "border-zinc-700 hover:border-emerald-500/50" }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Бюджет (₽)"
            type="number"
            value={String(clientData.generatedBudgetMax || "")}
            onValueChange={(v) =>
              updateClient({ generatedBudgetMax: Number(v) || 0 })
            }
            variant="bordered"
            classNames={{ inputWrapper: "border-zinc-700 hover:border-emerald-500/50" }}
          />
          <Input
            label="Дедлайн"
            type="date"
            value={clientData.generatedDeadline}
            onValueChange={(v) => updateClient({ generatedDeadline: v })}
            variant="bordered"
            classNames={{ inputWrapper: "border-zinc-700 hover:border-emerald-500/50" }}
          />
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="light" startContent={<ArrowLeft size={16} />} onPress={prevStep}>
          Назад
        </Button>
        <Button
          color="secondary"
          startContent={<Send size={14} />}
          isLoading={isPublishing}
          isDisabled={!clientData.generatedTitle.trim()}
          onPress={onPublish}
        >
          Опубликовать
        </Button>
      </div>
    </motion.div>
  );
};
