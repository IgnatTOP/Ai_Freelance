"use client";

import { useState } from "react";
import { useDepositBalance } from "@/features/balance-actions";
import { formatMoney } from "@/shared/lib/money";
import {
    FilkaButton,
    FilkaField,
    FilkaInput,
    FilkaModal,
    FilkaModalBody,
    FilkaModalFooter,
    FilkaModalHeader,
    FilkaModalTitle,
    FilkaModalDescription,
    IconAlert,
    IconCircleCheck,
    IconWallet,
} from "@/shared/ui/filka";

interface InsufficientFundsModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly availableBalance: number;
    readonly requiredAmount: number;
    readonly onDepositSuccess?: () => void;
}

export const parseInsufficientFundsError = (
    message: string,
): { available: number; required: number } | null => {
    const match = message.match(/(?:доступно|available):\s*([\d.]+).*?(?:требуется|required):\s*([\d.]+)/i);
    if (!match?.[1] || !match[2]) return null;
    return {
        available: parseFloat(match[1]),
        required: parseFloat(match[2]),
    };
};

export const isInsufficientFundsError = (error: unknown): boolean => {
    if (!error || typeof error !== "object") return false;
    const msg = ((error as { message?: string }).message ?? "").toLowerCase();
    return msg.includes("недостаточно средств") || msg.includes("insufficient funds");
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
        <FilkaModal open={isOpen} onClose={handleClose} size="lg">
            {step === "success" ? (
                <FilkaModalBody className="flex flex-col items-center gap-4 py-12">
                    <div
                        className="grid h-16 w-16 place-items-center rounded-full"
                        style={{
                            background: "rgba(102,58,243,0.18)",
                            border: "1px solid rgba(102,58,243,0.32)",
                            color: "var(--mint-300)",
                        }}
                    >
                        <IconCircleCheck size={32} />
                    </div>
                    <p className="text-lg font-semibold">Баланс пополнен</p>
                    <p className="text-sm" style={{ color: "var(--fg-2)" }}>
                        Повторяем принятие отклика…
                    </p>
                </FilkaModalBody>
            ) : step === "deposit" ? (
                <>
                    <FilkaModalHeader>
                        <div className="flex items-center gap-3">
                            <span
                                className="grid h-10 w-10 place-items-center rounded-[var(--r-md)]"
                                style={{
                                    background: "rgba(102,58,243,0.1)",
                                    border: "1px solid rgba(102,58,243,0.22)",
                                    color: "var(--mint-300)",
                                }}
                            >
                                <IconWallet size={18} />
                            </span>
                            <div>
                                <FilkaModalTitle>Пополнение баланса</FilkaModalTitle>
                                <FilkaModalDescription>
                                    Минимум {formatMoney(shortfall)} для принятия отклика
                                </FilkaModalDescription>
                            </div>
                        </div>
                    </FilkaModalHeader>
                    <FilkaModalBody className="flex flex-col gap-4">
                        <FilkaField label="Сумма пополнения">
                            <FilkaInput
                                type="number"
                                inputMode="numeric"
                                placeholder="0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                style={{ fontSize: 17, fontWeight: 600 }}
                                autoFocus
                            />
                        </FilkaField>
                        <div className="flex flex-wrap gap-2">
                            {QUICK_AMOUNTS.filter((qa) => qa >= shortfall).map((qa) => (
                                <button
                                    key={qa}
                                    type="button"
                                    onClick={() => setAmount(String(qa))}
                                    className="filka-chip filka-chip-muted cursor-pointer"
                                >
                                    {formatMoney(qa)}
                                </button>
                            ))}
                        </div>
                        {deposit.isError ? (
                            <div
                                className="rounded-[var(--r-md)] border px-3 py-2 text-sm"
                                style={{ background: "rgba(248,113,113,0.08)", borderColor: "rgba(248,113,113,0.22)", color: "var(--err)" }}
                            >
                                Не удалось пополнить баланс. Попробуйте снова.
                            </div>
                        ) : null}
                    </FilkaModalBody>
                    <FilkaModalFooter>
                        <FilkaButton variant="ghost" onClick={() => setStep("info")}>
                            Назад
                        </FilkaButton>
                        <FilkaButton
                            variant="primary"
                            onClick={handleDeposit}
                            loading={deposit.isPending}
                            disabled={!isValid}
                            startContent={<IconWallet size={16} />}
                        >
                            Пополнить {isValid ? formatMoney(numericAmount) : ""}
                        </FilkaButton>
                    </FilkaModalFooter>
                </>
            ) : (
                <>
                    <FilkaModalHeader>
                        <div className="flex items-center gap-3">
                            <span
                                className="grid h-10 w-10 place-items-center rounded-[var(--r-md)]"
                                style={{
                                    background: "rgba(245,182,66,0.12)",
                                    border: "1px solid rgba(245,182,66,0.22)",
                                    color: "var(--warn)",
                                }}
                            >
                                <IconAlert size={18} />
                            </span>
                            <FilkaModalTitle>Недостаточно средств</FilkaModalTitle>
                        </div>
                    </FilkaModalHeader>
                    <FilkaModalBody className="flex flex-col gap-4">
                        <p className="text-sm" style={{ color: "var(--fg-1)" }}>
                            Для принятия отклика необходимо зарезервировать средства в эскроу. На вашем балансе недостаточно средств.
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                            <div
                                className="rounded-[var(--r-lg)] border p-4 text-center"
                                style={{ background: "var(--bg-1)", borderColor: "var(--line)" }}
                            >
                                <p className="text-xs" style={{ color: "var(--fg-3)" }}>
                                    На балансе
                                </p>
                                <p className="mt-1 text-lg font-bold" style={{ color: "var(--mint-300)" }}>
                                    {formatMoney(availableBalance)}
                                </p>
                            </div>
                            <div
                                className="rounded-[var(--r-lg)] border p-4 text-center"
                                style={{ background: "var(--bg-1)", borderColor: "var(--line)" }}
                            >
                                <p className="text-xs" style={{ color: "var(--fg-3)" }}>
                                    Требуется
                                </p>
                                <p className="mt-1 text-lg font-bold" style={{ color: "var(--warn)" }}>
                                    {formatMoney(requiredAmount)}
                                </p>
                            </div>
                            <div
                                className="rounded-[var(--r-lg)] border p-4 text-center"
                                style={{ background: "rgba(248,113,113,0.06)", borderColor: "rgba(248,113,113,0.22)" }}
                            >
                                <p className="text-xs" style={{ color: "var(--fg-3)" }}>
                                    Не хватает
                                </p>
                                <p className="mt-1 text-lg font-bold" style={{ color: "var(--err)" }}>
                                    {formatMoney(shortfall)}
                                </p>
                            </div>
                        </div>
                    </FilkaModalBody>
                    <FilkaModalFooter>
                        <FilkaButton variant="ghost" onClick={handleClose}>
                            Закрыть
                        </FilkaButton>
                        <FilkaButton
                            variant="primary"
                            onClick={() => setStep("deposit")}
                            startContent={<IconWallet size={16} />}
                        >
                            Пополнить баланс
                        </FilkaButton>
                    </FilkaModalFooter>
                </>
            )}
        </FilkaModal>
    );
};
