"use client";

import { useState } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    Chip,
    Divider,
} from "@heroui/react";
import { AlertTriangle, Wallet, ArrowDownLeft, CheckCircle2 } from "lucide-react";
import { useDepositBalance } from "@/features/balance-actions";

interface InsufficientFundsModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly availableBalance: number;
    readonly requiredAmount: number;
    /** Called after successful deposit — parent should retry the accept action */
    readonly onDepositSuccess?: () => void;
}

export const parseInsufficientFundsError = (
    message: string
): { available: number; required: number } | null => {
    // Pattern: "недостаточно средств на балансе (доступно: 0.00, требуется: 100000.00)"
    const match = message.match(/доступно:\s*([\d.]+).*требуется:\s*([\d.]+)/i);
    if (!match?.[1] || !match[2]) return null;
    return {
        available: parseFloat(match[1]),
        required: parseFloat(match[2]),
    };
};

export const isInsufficientFundsError = (error: unknown): boolean => {
    if (!error || typeof error !== "object") return false;
    const msg = (error as { message?: string }).message ?? "";
    return msg.includes("недостаточно средств");
};

const QUICK_AMOUNTS = [1_000, 5_000, 10_000, 50_000, 100_000];

export const InsufficientFundsModal = ({
    isOpen,
    onClose,
    availableBalance,
    requiredAmount,
    onDepositSuccess,
}: InsufficientFundsModalProps) => {
    const shortfall = Math.max(0, Math.ceil(requiredAmount - availableBalance));
    const [amount, setAmount] = useState(String(shortfall));
    const [step, setStep] = useState<"info" | "deposit" | "success">("info");
    const deposit = useDepositBalance();

    const numericAmount = Number(amount);
    const isValid = Number.isFinite(numericAmount) && numericAmount > 0;

    const handleDeposit = () => {
        if (!isValid) return;
        deposit.mutate(numericAmount, {
            onSuccess: () => {
                setStep("success");
                setTimeout(() => {
                    setStep("info");
                    setAmount(String(shortfall));
                    deposit.reset();
                    onClose();
                    onDepositSuccess?.();
                }, 1500);
            },
        });
    };

    const handleClose = () => {
        if (deposit.isPending) return;
        setStep("info");
        setAmount(String(shortfall));
        deposit.reset();
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            classNames={{
                base: "bg-zinc-950 border border-white/[0.08]",
                header: "border-b border-white/[0.06]",
                footer: "border-t border-white/[0.06]",
            }}
            backdrop="blur"
            placement="center"
            size="lg"
        >
            <ModalContent>
                {step === "success" ? (
                    <ModalBody className="py-12 flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center animate-fade-in-up">
                            <CheckCircle2 size={32} className="text-emerald-400" />
                        </div>
                        <p className="text-lg font-semibold text-white">Баланс пополнен!</p>
                        <p className="text-sm text-zinc-400">Повторяем принятие отклика…</p>
                    </ModalBody>
                ) : step === "deposit" ? (
                    <>
                        <ModalHeader className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <ArrowDownLeft size={18} />
                            </div>
                            <div>
                                <p className="text-base font-semibold text-white">Пополнение баланса</p>
                                <p className="text-xs text-zinc-500 font-normal">
                                    Минимум ₽{shortfall.toLocaleString("ru-RU")} для принятия отклика
                                </p>
                            </div>
                        </ModalHeader>
                        <ModalBody className="space-y-5">
                            <Input
                                label="Сумма пополнения"
                                placeholder="0"
                                value={amount}
                                onValueChange={setAmount}
                                type="number"
                                variant="bordered"
                                startContent={<span className="text-zinc-500 text-sm">₽</span>}
                                classNames={{
                                    inputWrapper: "bg-zinc-900/50 border-zinc-700/50 hover:border-emerald-500/40 group-data-[focus=true]:border-emerald-500/60",
                                    label: "text-zinc-400",
                                    input: "text-zinc-200 text-lg font-semibold",
                                }}
                                autoFocus
                            />
                            <div className="flex flex-wrap gap-2">
                                {QUICK_AMOUNTS.filter((qa) => qa >= shortfall).map((qa) => (
                                    <Chip
                                        key={qa}
                                        as="button"
                                        variant="flat"
                                        className="cursor-pointer transition-all"
                                        classNames={{
                                            base: amount === String(qa)
                                                ? "bg-emerald-500/20 border border-emerald-500/40"
                                                : "bg-zinc-800/60 border border-zinc-700/30 hover:bg-zinc-800 hover:border-zinc-600/50",
                                            content: amount === String(qa)
                                                ? "text-emerald-300 font-medium"
                                                : "text-zinc-400 font-medium",
                                        }}
                                        onClick={() => setAmount(String(qa))}
                                    >
                                        ₽{qa.toLocaleString("ru-RU")}
                                    </Chip>
                                ))}
                            </div>
                            {deposit.isError && (
                                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                    Не удалось пополнить баланс. Попробуйте снова.
                                </p>
                            )}
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="light" className="text-zinc-400" onPress={() => setStep("info")}>
                                Назад
                            </Button>
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-500/20"
                                onPress={handleDeposit}
                                isLoading={deposit.isPending}
                                isDisabled={!isValid}
                                startContent={<Wallet size={16} />}
                            >
                                Пополнить ₽{isValid ? numericAmount.toLocaleString("ru-RU") : "0"}
                            </Button>
                        </ModalFooter>
                    </>
                ) : (
                    <>
                        <ModalHeader className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                                <AlertTriangle size={18} />
                            </div>
                            <p className="text-base font-semibold text-white">Недостаточно средств</p>
                        </ModalHeader>
                        <ModalBody className="space-y-5">
                            <p className="text-sm text-zinc-300">
                                Для принятия отклика необходимо зарезервировать средства в escrow. На вашем балансе недостаточно средств.
                            </p>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/60 p-4 text-center">
                                    <p className="text-xs text-zinc-500 mb-1">На балансе</p>
                                    <p className="text-lg font-bold text-emerald-400">₽{availableBalance.toLocaleString("ru-RU")}</p>
                                </div>
                                <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/60 p-4 text-center">
                                    <p className="text-xs text-zinc-500 mb-1">Требуется</p>
                                    <p className="text-lg font-bold text-amber-400">₽{requiredAmount.toLocaleString("ru-RU")}</p>
                                </div>
                                <div className="rounded-xl bg-red-500/[0.06] border border-red-500/20 p-4 text-center">
                                    <p className="text-xs text-zinc-500 mb-1">Не хватает</p>
                                    <p className="text-lg font-bold text-red-400">₽{shortfall.toLocaleString("ru-RU")}</p>
                                </div>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="light" className="text-zinc-400" onPress={handleClose}>
                                Закрыть
                            </Button>
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-500/20"
                                onPress={() => setStep("deposit")}
                                startContent={<ArrowDownLeft size={16} />}
                            >
                                Пополнить баланс
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};
