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
} from "@heroui/react";
import { ArrowDownLeft, Wallet, CheckCircle2 } from "lucide-react";
import { useDepositBalance } from "@/features/balance-actions";

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
        >
            <ModalContent>
                {success ? (
                    <ModalBody className="py-12 flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center animate-fade-in-up">
                            <CheckCircle2 size={32} className="text-emerald-400" />
                        </div>
                        <p className="text-lg font-semibold text-white">Баланс пополнен!</p>
                        <p className="text-sm text-zinc-400">+₽{numericAmount.toLocaleString("ru-RU")}</p>
                    </ModalBody>
                ) : (
                    <>
                        <ModalHeader className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                                <ArrowDownLeft size={18} />
                            </div>
                            <div>
                                <p className="text-base font-semibold text-white">Пополнение баланса</p>
                                <p className="text-xs text-zinc-500 font-normal">Средства зачислятся мгновенно</p>
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
                                    inputWrapper: "bg-zinc-900/50 border-zinc-700/50 hover:border-purple-500/40 group-data-[focus=true]:border-purple-500/60",
                                    label: "text-zinc-400",
                                    input: "text-zinc-200 text-lg font-semibold",
                                }}
                                autoFocus
                            />
                            <div className="flex flex-wrap gap-2">
                                {QUICK_AMOUNTS.map((qa) => (
                                    <Chip
                                        key={qa}
                                        as="button"
                                        variant="flat"
                                        className="cursor-pointer transition-all"
                                        classNames={{
                                            base: amount === String(qa)
                                                ? "bg-purple-500/20 border border-purple-500/40"
                                                : "bg-zinc-800/60 border border-zinc-700/30 hover:bg-zinc-800 hover:border-zinc-600/50",
                                            content: amount === String(qa)
                                                ? "text-purple-300 font-medium"
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
                            <Button variant="light" className="text-zinc-400" onPress={handleClose}>
                                Отмена
                            </Button>
                            <Button
                                className="bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-lg shadow-purple-500/20"
                                onPress={handleDeposit}
                                isLoading={deposit.isPending}
                                isDisabled={!isValid}
                                startContent={<Wallet size={16} />}
                            >
                                Пополнить ₽{isValid ? numericAmount.toLocaleString("ru-RU") : "0"}
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};
