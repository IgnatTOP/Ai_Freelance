"use client";

import { useState } from "react";
import { useBalance, useWithdraw } from "@/features/balance-management";
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
    IconArrowUpRight,
    IconCircleCheck,
} from "@/shared/ui/filka";

interface WithdrawModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
}

export const WithdrawModal = ({ isOpen, onClose }: WithdrawModalProps) => {
    const [amount, setAmount] = useState("");
    const [cardLast4, setCardLast4] = useState("");
    const [bankName, setBankName] = useState("");
    const [success, setSuccess] = useState(false);
    const withdraw = useWithdraw();
    const { data: balance } = useBalance();

    const available = balance?.available ?? 0;
    const numericAmount = Number(amount);
    const isOverLimit = numericAmount > available;
    const isValid =
        Number.isFinite(numericAmount) && numericAmount > 0 && !isOverLimit && cardLast4.length === 4;

    const handleWithdraw = () => {
        if (!isValid) return;
        withdraw.mutate(
            { amount: numericAmount, card_last4: cardLast4, bank_name: bankName || "Банк" },
            {
                onSuccess: () => {
                    setSuccess(true);
                    setTimeout(() => {
                        setSuccess(false);
                        setAmount("");
                        setCardLast4("");
                        setBankName("");
                        onClose();
                    }, 1500);
                },
            },
        );
    };

    const handleClose = () => {
        if (withdraw.isPending) return;
        setAmount("");
        setCardLast4("");
        setBankName("");
        setSuccess(false);
        withdraw.reset();
        onClose();
    };

    return (
        <FilkaModal open={isOpen} onClose={handleClose} size="md">
            {success ? (
                <FilkaModalBody className="flex flex-col items-center gap-4 py-12">
                    <div
                        className="grid h-16 w-16 place-items-center rounded-full"
                        style={{
                            background: "rgba(52,211,153,0.18)",
                            border: "1px solid rgba(52,211,153,0.32)",
                            color: "var(--mint-300)",
                        }}
                    >
                        <IconCircleCheck size={32} />
                    </div>
                    <p className="text-lg font-semibold">Заявка на вывод создана</p>
                    <p className="text-sm" style={{ color: "var(--fg-2)" }}>
                        {formatMoney(numericAmount)} на карту •••• {cardLast4}
                    </p>
                </FilkaModalBody>
            ) : (
                <>
                    <FilkaModalHeader>
                        <div className="flex items-center gap-3">
                            <span
                                className="grid h-10 w-10 place-items-center rounded-[var(--r-md)]"
                                style={{
                                    background: "rgba(52,211,153,0.1)",
                                    border: "1px solid rgba(52,211,153,0.22)",
                                    color: "var(--mint-300)",
                                }}
                            >
                                <IconArrowUpRight size={18} />
                            </span>
                            <div>
                                <FilkaModalTitle>Вывод средств</FilkaModalTitle>
                                <FilkaModalDescription>Доступно: {formatMoney(available)}</FilkaModalDescription>
                            </div>
                        </div>
                    </FilkaModalHeader>
                    <FilkaModalBody className="flex flex-col gap-4">
                        <FilkaField
                            label="Сумма вывода"
                            error={isOverLimit ? "Сумма превышает доступный баланс" : undefined}
                        >
                            <FilkaInput
                                type="number"
                                inputMode="numeric"
                                placeholder="0"
                                value={amount}
                                hasError={isOverLimit}
                                onChange={(e) => setAmount(e.target.value)}
                                style={{ fontSize: 17, fontWeight: 600 }}
                                autoFocus
                            />
                        </FilkaField>
                        <div className="grid grid-cols-2 gap-3">
                            <FilkaField label="Последние 4 цифры карты">
                                <FilkaInput
                                    placeholder="0000"
                                    inputMode="numeric"
                                    value={cardLast4}
                                    onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                />
                            </FilkaField>
                            <FilkaField label="Банк">
                                <FilkaInput placeholder="Сбербанк" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                            </FilkaField>
                        </div>
                        {withdraw.isError ? (
                            <div
                                className="rounded-[var(--r-md)] border px-3 py-2 text-sm"
                                style={{ background: "rgba(248,113,113,0.08)", borderColor: "rgba(248,113,113,0.22)", color: "var(--err)" }}
                            >
                                Не удалось создать заявку на вывод. Попробуйте снова.
                            </div>
                        ) : null}
                    </FilkaModalBody>
                    <FilkaModalFooter>
                        <FilkaButton variant="ghost" onClick={handleClose}>
                            Отмена
                        </FilkaButton>
                        <FilkaButton
                            variant="primary"
                            onClick={handleWithdraw}
                            loading={withdraw.isPending}
                            disabled={!isValid}
                            startContent={<IconArrowUpRight size={16} />}
                        >
                            Вывести
                        </FilkaButton>
                    </FilkaModalFooter>
                </>
            )}
        </FilkaModal>
    );
};
