"use client";

import { useState } from "react";
import { useDepositBalance } from "@/features/balance-actions";
import { formatMoney } from "@/shared/lib/money";
import {
    FilkaButton,
    FilkaChip,
    FilkaField,
    FilkaInput,
    FilkaModal,
    FilkaModalBody,
    FilkaModalFooter,
    FilkaModalHeader,
    FilkaModalTitle,
    FilkaModalDescription,
    IconCircleCheck,
    IconWallet,
} from "@/shared/ui/filka";

interface DepositModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly prefillAmount?: number;
    readonly onSuccess?: () => void;
}

const QUICK_AMOUNTS = [1_000, 5_000, 10_000, 50_000, 100_000];

export const DepositModal = ({ isOpen, onClose, prefillAmount, onSuccess }: DepositModalProps) => {
    const [amount, setAmount] = useState(prefillAmount ? String(prefillAmount) : "");
    const [success, setSuccess] = useState(false);
    const deposit = useDepositBalance();

    const numericAmount = Number(amount);
    const isValid = Number.isFinite(numericAmount) && numericAmount > 0;

    const handleDeposit = () => {
        if (!isValid) return;
        deposit.mutate(numericAmount, {
            onSuccess: () => {
                setSuccess(true);
                setTimeout(() => {
                    setSuccess(false);
                    setAmount("");
                    onClose();
                    onSuccess?.();
                }, 1500);
            },
        });
    };

    const handleClose = () => {
        if (deposit.isPending) return;
        setAmount("");
        setSuccess(false);
        deposit.reset();
        onClose();
    };

    return (
        <FilkaModal open={isOpen} onClose={handleClose} size="md">
            {success ? (
                <FilkaModalBody className="flex flex-col items-center gap-4 py-12">
                    <div
                        className="grid h-16 w-16 place-items-center rounded-full"
                        style={{ background: "rgba(102,58,243,0.18)", border: "1px solid rgba(102,58,243,0.32)", color: "var(--mint-300)" }}
                    >
                        <IconCircleCheck size={32} />
                    </div>
                    <p className="text-lg font-semibold">Баланс пополнен</p>
                    <p className="t-mono" style={{ color: "var(--mint-300)" }}>
                        +{formatMoney(numericAmount)}
                    </p>
                </FilkaModalBody>
            ) : (
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
                                <FilkaModalDescription>Средства зачислятся мгновенно</FilkaModalDescription>
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
                            {QUICK_AMOUNTS.map((qa) => (
                                <button key={qa} type="button" onClick={() => setAmount(String(qa))} className="filka-chip filka-chip-muted cursor-pointer">
                                    {formatMoney(qa)}
                                </button>
                            ))}
                            {amount ? (
                                <FilkaChip tone="default">Выбрано: {formatMoney(Number(amount) || 0)}</FilkaChip>
                            ) : null}
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
                        <FilkaButton variant="ghost" onClick={handleClose}>
                            Отмена
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
            )}
        </FilkaModal>
    );
};
