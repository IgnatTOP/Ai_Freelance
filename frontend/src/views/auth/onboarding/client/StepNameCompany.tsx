"use client";

import { motion } from "framer-motion";
import { Button, Input } from "@heroui/react";
import { ArrowRight, Building2, User } from "lucide-react";
import { useOnboardingStore } from "@/features/onboarding/model";

export const StepNameCompany = () => {
    const { clientData, updateClient, nextStep } = useOnboardingStore();

    const canContinue = clientData.name.trim().length > 0;

    return (
        <motion.div
            className="glass-card rounded-2xl p-6 sm:p-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
        >
            <h2 className="mb-1 text-2xl font-bold text-zinc-100">
                Расскажите о себе
            </h2>
            <p className="mb-6 text-sm text-zinc-500">
                Как к вам обращаться и название вашей компании
            </p>

            <div className="space-y-4">
                <Input
                    label="Имя и фамилия"
                    placeholder="Иван Иванов"
                    value={clientData.name}
                    onValueChange={(v) => updateClient({ name: v })}
                    variant="bordered"
                    startContent={<User size={16} className="text-zinc-500" />}
                    classNames={{ inputWrapper: "border-zinc-700 hover:border-purple-500/50" }}
                />

                <Input
                    label="Компания"
                    placeholder="ООО «Ваша компания» (необязательно)"
                    value={clientData.company}
                    onValueChange={(v) => updateClient({ company: v })}
                    variant="bordered"
                    startContent={<Building2 size={16} className="text-zinc-500" />}
                    classNames={{ inputWrapper: "border-zinc-700 hover:border-purple-500/50" }}
                />
            </div>

            <div className="mt-8 flex justify-end">
                <Button
                    color="secondary"
                    endContent={<ArrowRight size={16} />}
                    isDisabled={!canContinue}
                    onPress={nextStep}
                >
                    Далее
                </Button>
            </div>
        </motion.div>
    );
};
