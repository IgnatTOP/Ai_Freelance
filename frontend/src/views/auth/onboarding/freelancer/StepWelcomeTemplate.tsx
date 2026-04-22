"use client";

import { motion } from "framer-motion";
import { Button, Textarea } from "@heroui/react";
import { ArrowLeft, CheckCircle2, Sparkles, MessageSquareHeart } from "lucide-react";
import { useOnboardingStore } from "@/features/onboarding/model";

type Props = {
    onFinish: (redirectTo?: string) => void;
    isFinishing: boolean;
};

export const StepWelcomeTemplate = ({ onFinish, isFinishing }: Props) => {
    const { prevStep, freelancerData, updateFreelancer } = useOnboardingStore();

    return (
        <motion.div
            className="glass-card rounded-2xl p-6 sm:p-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
        >
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <MessageSquareHeart size={20} />
                </div>
                <h2 className="text-2xl font-bold text-zinc-100">
                    Шаблон отклика
                </h2>
            </div>
            <p className="mb-6 text-sm text-zinc-400 leading-relaxed">
                Подготовьте универсальное приветственное письмо. Оно будет автоматически подставляться при отклике на заказы, экономя ваше время.
            </p>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-zinc-200">Текст отклика</span>
                    <Button
                        size="sm"
                        variant="flat"
                        className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 h-7"
                        startContent={<Sparkles size={14} />}
                        onPress={() => {
                            const aiTemplate = `Здравствуйте! Меня заинтересовал ваш проект.\nМой опыт и навыки (${freelancerData.skills.slice(0, 3).join(", ")}) отлично подходят для решения ваших задач. Я внимательно изучил требования и готов обсудить детали в чате.\n\nРаботаю на результат, соблюдаю сроки. Обращайтесь!`;
                            updateFreelancer({ bio: aiTemplate });
                        }}
                    >
                        AI: Сгенерировать
                    </Button>
                </div>

                <Textarea
                    placeholder="Здравствуйте! Предлагаю свои услуги для выполнения вашего заказа. Имею большой опыт в этой сфере..."
                    value={freelancerData.bio} // Using 'bio' to double as welcome letter or we can keep it as is
                    onValueChange={(val) => updateFreelancer({ bio: val })}
                    minRows={5}
                    maxRows={10}
                    variant="bordered"
                    classNames={{
                        inputWrapper: "bg-zinc-900/50 border-zinc-700/50 hover:border-emerald-500/40 group-data-[focus=true]:border-emerald-500/60 shadow-sm",
                        input: "text-zinc-200 text-sm leading-relaxed",
                    }}
                />

                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3">
                    <Sparkles size={16} className="text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-200/80 leading-relaxed">
                        Вы сможете изменить текст перед отправкой каждого конкретного отклика. Хорошее сопроводительное письмо повышает шанс выбора исполнителем на 40%.
                    </p>
                </div>
            </div>

            <div className="mt-8 flex justify-between pt-6 border-t border-white/[0.06]">
                <Button
                    variant="light"
                    className="text-zinc-400 hover:text-zinc-200"
                    startContent={<ArrowLeft size={16} />}
                    onPress={prevStep}
                >
                    Назад
                </Button>
                <Button
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-600/25"
                    startContent={<CheckCircle2 size={16} />}
                    onPress={() => onFinish()}
                    isLoading={isFinishing}
                >
                    Начать работу
                </Button>
            </div>
        </motion.div>
    );
};
