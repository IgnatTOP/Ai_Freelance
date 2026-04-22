"use client";

import { motion } from "framer-motion";
import { Button, Textarea } from "@heroui/react";
import { ArrowRight, ArrowLeft, FileText } from "lucide-react";
import { useOnboardingStore } from "@/features/onboarding/model";

export const StepDescription = () => {
    const { clientData, updateClient, nextStep, prevStep } = useOnboardingStore();
    const description = clientData.description ?? "";

    return (
        <motion.div
            className="glass-card rounded-2xl p-6 sm:p-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
        >
            <h2 className="mb-1 text-2xl font-bold text-zinc-100">
                Чем вы занимаетесь?
            </h2>
            <p className="mb-6 text-sm text-zinc-500">
                Расскажите о своей деятельности — это поможет фрилансерам лучше понять ваши задачи
            </p>

            <Textarea
                label="Описание деятельности"
                placeholder="Например: мы разрабатываем мобильные приложения для ритейла и часто ищем дизайнеров и разработчиков..."
                value={description}
                onValueChange={(v) => updateClient({ description: v })}
                variant="bordered"
                minRows={5}
                maxRows={10}
                startContent={<FileText size={16} className="text-zinc-500 mt-2" />}
                classNames={{ inputWrapper: "border-zinc-700 hover:border-emerald-500/50" }}
            />

            <div className="mt-2 text-right">
                <span className="text-xs text-zinc-600">
                    {description.length} / 500
                </span>
            </div>

            <div className="mt-6 flex justify-between">
                <Button variant="light" startContent={<ArrowLeft size={16} />} onPress={prevStep}>
                    Назад
                </Button>
                <Button
                    color="secondary"
                    endContent={<ArrowRight size={16} />}
                    onPress={nextStep}
                >
                    {description.trim() ? "Далее" : "Пропустить"}
                </Button>
            </div>
        </motion.div>
    );
};
