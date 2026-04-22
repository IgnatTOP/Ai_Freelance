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
} from "@heroui/react";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { useWithdraw, useBalance } from "@/features/balance-management";

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
    const isValid =
        Number.isFinite(numericAmount) &&
        numericAmount > 0 &&
        numericAmount <= available &&
        cardLast4.length === 4;

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
            }
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
                        <p className="text-lg font-semibold text-white">Заявка на вывод создана!</p>
                        <p className="text-sm text-zinc-400">₽{numericAmount.toLocaleString("ru-RU")} на карту •••• {cardLast4}</p>
                    </ModalBody>
                ) : (
                    <>
                        <ModalHeader className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <ArrowUpRight size={18} />
                            </div>
                            <div>
                                <p className="text-base font-semibold text-white">Вывод средств</p>
                                <p className="text-xs text-zinc-500 font-normal">
                                    Доступно: ₽{available.toLocaleString("ru-RU")}
                                </p>
                            </div>
                        </ModalHeader>
                        <ModalBody className="space-y-4">
                            <Input
                                label="Сумма вывода"
                                placeholder="0"
                                value={amount}
                                onValueChange={setAmount}
                                type="number"
                                variant="bordered"
                                startContent={<span className="text-zinc-500 text-sm">₽</span>}
                                description={numericAmount > available ? "Сумма превышает доступный баланс" : undefined}
                                isInvalid={numericAmount > available}
                                classNames={{
                                    inputWrapper: "bg-zinc-900/50 border-zinc-700/50 hover:border-purple-500/40 group-data-[focus=true]:border-purple-500/60",
                                    label: "text-zinc-400",
                                    input: "text-zinc-200 text-lg font-semibold",
                                }}
                                autoFocus
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    label="Последние 4 цифры карты"
                                    placeholder="0000"
                                    value={cardLast4}
                                    onValueChange={(v) => setCardLast4(v.replace(/\D/g, "").slice(0, 4))}
                                    variant="bordered"
                                    classNames={{
                                        inputWrapper: "bg-zinc-900/50 border-zinc-700/50 hover:border-purple-500/40 group-data-[focus=true]:border-purple-500/60",
                                        label: "text-zinc-400",
                                        input: "text-zinc-200",
                                    }}
                                />
                                <Input
                                    label="Банк"
                                    placeholder="Сбербанк"
                                    value={bankName}
                                    onValueChange={setBankName}
                                    variant="bordered"
                                    classNames={{
                                        inputWrapper: "bg-zinc-900/50 border-zinc-700/50 hover:border-purple-500/40 group-data-[focus=true]:border-purple-500/60",
                                        label: "text-zinc-400",
                                        input: "text-zinc-200",
                                    }}
                                />
                            </div>
                            {withdraw.isError && (
                                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                    Не удалось создать заявку на вывод. Попробуйте снова.
                                </p>
                            )}
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="light" className="text-zinc-400" onPress={handleClose}>
                                Отмена
                            </Button>
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-500/20"
                                onPress={handleWithdraw}
                                isLoading={withdraw.isPending}
                                isDisabled={!isValid}
                                startContent={<ArrowUpRight size={16} />}
                            >
                                Вывести
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};
