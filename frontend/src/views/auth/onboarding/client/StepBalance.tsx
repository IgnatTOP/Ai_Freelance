"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button, Input, Card, CardBody } from "@heroui/react";
import { ArrowLeft, Wallet, CreditCard, Check } from "lucide-react";
import { useOnboardingStore } from "@/features/onboarding/model";
import { useBalance } from "@/features/balance-management";
import { paymentsApi } from "@/shared/api/endpoints/payments";
import { notify } from "@/shared/notifications/notify";

type Props = {
    onFinish: () => void;
    isFinishing: boolean;
};

export const StepBalance = ({ onFinish, isFinishing }: Props) => {
    const { data: balance } = useBalance();
    const { prevStep } = useOnboardingStore();

    const [amount, setAmount] = useState("");
    const [isDepositing, setIsDepositing] = useState(false);
    const [deposited, setDeposited] = useState(false);

    const handleDeposit = async () => {
        const num = Number(amount);
        if (!num || num <= 0) return;

        setIsDepositing(true);
        try {
            await paymentsApi.deposit({ amount: num });
            setDeposited(true);
            notify.success({
                title: "Баланс пополнен",
                message: `+${num.toLocaleString("ru-RU")} ₽`,
            });
        } catch {
            notify.error({
                title: "Ошибка пополнения",
                message: "Попробуйте ещё раз",
            });
        } finally {
            setIsDepositing(false);
        }
    };

    const QUICK_AMOUNTS = [1000, 3000, 5000, 10000];

    return (
        <motion.div
            className="glass-card rounded-2xl p-6 sm:p-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
        >
            <h2 className="mb-1 text-2xl font-bold text-zinc-100">
                Пополните баланс
            </h2>
            <p className="mb-6 text-sm text-zinc-500">
                Баланс нужен для размещения заказов. Вы можете пополнить позже.
            </p>

            {/* Balance card */}
            <Card className="bg-zinc-900/50 border border-zinc-800 mb-6">
                <CardBody className="flex flex-row items-center gap-4 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                        <Wallet size={24} className="text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500">Текущий баланс</p>
                        <p className="text-2xl font-bold text-zinc-100">
                            {(balance?.available ?? 0).toLocaleString("ru-RU")} ₽
                        </p>
                    </div>
                </CardBody>
            </Card>

            {/* Quick amounts */}
            <div className="mb-4 flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((q) => (
                    <Button
                        key={q}
                        size="sm"
                        variant={amount === String(q) ? "solid" : "bordered"}
                        color={amount === String(q) ? "secondary" : "default"}
                        onPress={() => setAmount(String(q))}
                        className="border-zinc-700"
                    >
                        {q.toLocaleString("ru-RU")} ₽
                    </Button>
                ))}
            </div>

            {/* Custom amount input */}
            <div className="flex gap-3">
                <Input
                    label="Сумма пополнения (₽)"
                    type="number"
                    value={amount}
                    onValueChange={setAmount}
                    variant="bordered"
                    startContent={<CreditCard size={16} className="text-zinc-500" />}
                    classNames={{ inputWrapper: "border-zinc-700 hover:border-emerald-500/50" }}
                />
                <Button
                    color="secondary"
                    isLoading={isDepositing}
                    isDisabled={!amount || Number(amount) <= 0 || deposited}
                    onPress={handleDeposit}
                    className="shrink-0"
                    startContent={deposited ? <Check size={16} /> : undefined}
                >
                    {deposited ? "Пополнено" : "Пополнить"}
                </Button>
            </div>

            <div className="mt-8 flex justify-between">
                <Button variant="light" startContent={<ArrowLeft size={16} />} onPress={prevStep}>
                    Назад
                </Button>
                <Button
                    color="secondary"
                    isLoading={isFinishing}
                    onPress={onFinish}
                >
                    {deposited ? "Завершить" : "Пропустить и начать"}
                </Button>
            </div>
        </motion.div>
    );
};
