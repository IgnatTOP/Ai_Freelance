"use client";

import { useState, useMemo } from "react";
import { Button, Input, Link, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Checkbox, useDisclosure } from "@heroui/react";
import { Eye, EyeOff, Phone, UserPlus, Briefcase, Code2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRegisterPhone } from "@/features/auth-phone";
import { useSessionStore } from "@/shared/store/session.store";
import { useRouter } from "next/navigation";
import { formatRuPhoneMask, isValidPhone, normalizePhone } from "@/shared/lib/phone";

const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score: 20, label: "Слабый", color: "bg-red-500" };
    if (score === 2) return { score: 40, label: "Средний", color: "bg-amber-500" };
    if (score === 3) return { score: 60, label: "Хороший", color: "bg-yellow-400" };
    if (score === 4) return { score: 80, label: "Сильный", color: "bg-emerald-400" };
    return { score: 100, label: "Отличный", color: "bg-green-400" };
};

export const RegisterForm = () => {
    const router = useRouter();
    const registerMutation = useRegisterPhone();
    const setSession = useSessionStore((s) => s.setSession);
    const setPendingPhone = useSessionStore((s) => s.setPendingPhone);
    const setPhoneVerified = useSessionStore((s) => s.setPhoneVerified);

    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [role, setRole] = useState<"client" | "freelancer">("client");
    const [showPassword, setShowPassword] = useState(false);
    const [phoneTouched, setPhoneTouched] = useState(false);
    const [passwordTouched, setPasswordTouched] = useState(false);
    const [confirmTouched, setConfirmTouched] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const normalizedPhone = normalizePhone(phone);

    const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
    const phoneInvalid = phoneTouched && !isValidPhone(phone);
    const passwordInvalid = passwordTouched && password.length < 8;
    const confirmInvalid = confirmTouched && passwordMismatch;
    const canSubmit = isValidPhone(phone) && password.length >= 8 && !passwordMismatch && acceptedTerms;
    const strength = useMemo(() => getPasswordStrength(password), [password]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordMismatch) return;
        const normalizedPhone = normalizePhone(phone);
        if (!normalizedPhone) return;

        registerMutation.mutate(
            { phone: normalizedPhone, password, role },
            {
                onSuccess: (data) => {
                    setSession(data.user.id, data.user.role);
                    setPendingPhone(normalizedPhone);
                    setPhoneVerified(false);
                    router.push("/verify-phone" as never);
                },
            }
        );
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Role selector: 2 Glassmorphism Cards */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    type="button"
                    onClick={() => setRole("client")}
                    className={`relative p-4 rounded-2xl border text-left transition-all overflow-hidden ${role === "client"
                        ? "bg-emerald-600/15 border-emerald-500 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                        : "bg-zinc-900/40 border-zinc-800/60 hover:border-zinc-700/80 hover:bg-zinc-900/80"
                        }`}
                >
                    {role === "client" && (
                        <div className="absolute top-3 right-3 text-emerald-400">
                            <CheckCircle2 size={16} className="fill-emerald-500/20" />
                        </div>
                    )}
                    <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center transition-colors ${role === "client" ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-400"
                        }`}>
                        <Briefcase size={20} />
                    </div>
                    <p className={`font-semibold mb-1 ${role === "client" ? "text-white" : "text-zinc-300"}`}>Заказчик</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">Ищу исполнителей для своих проектов</p>
                </button>

                <button
                    type="button"
                    onClick={() => setRole("freelancer")}
                    className={`relative p-4 rounded-2xl border text-left transition-all overflow-hidden ${role === "freelancer"
                        ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                        : "bg-zinc-900/40 border-zinc-800/60 hover:border-zinc-700/80 hover:bg-zinc-900/80"
                        }`}
                >
                    {role === "freelancer" && (
                        <div className="absolute top-3 right-3 text-emerald-400">
                            <CheckCircle2 size={16} className="fill-emerald-500/20" />
                        </div>
                    )}
                    <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center transition-colors ${role === "freelancer" ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-400"
                        }`}>
                        <Code2 size={20} />
                    </div>
                    <p className={`font-semibold mb-1 ${role === "freelancer" ? "text-white" : "text-zinc-300"}`}>Фрилансер</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">Ищу заказы и предлагаю услуги</p>
                </button>
            </div>

            <Input
                label="Телефон"
                placeholder="+7 (999) 123-45-67"
                value={phone}
                onValueChange={(v) => setPhone(formatRuPhoneMask(v))}
                onBlur={() => setPhoneTouched(true)}
                startContent={<Phone size={16} className="text-zinc-500" />}
                variant="bordered"
                isInvalid={phoneInvalid}
                errorMessage={phoneInvalid ? "Введите корректный номер телефона" : undefined}
                classNames={{
                    inputWrapper:
                        "bg-zinc-900/50 border-zinc-700/50 hover:border-emerald-500/40 group-data-[focus=true]:border-emerald-500/60",
                    label: "text-zinc-400",
                    input: "text-zinc-200 placeholder:text-zinc-600",
                }}
                isRequired
            />

            <div className="space-y-2">
                <Input
                    label="Пароль"
                    placeholder="Минимум 8 символов"
                    value={password}
                    onValueChange={setPassword}
                    onBlur={() => setPasswordTouched(true)}
                    type={showPassword ? "text" : "password"}
                    variant="bordered"
                    isInvalid={passwordInvalid}
                    errorMessage={passwordInvalid ? "Минимум 8 символов" : undefined}
                    endContent={
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    }
                    classNames={{
                        inputWrapper:
                            "bg-zinc-900/50 border-zinc-700/50 hover:border-emerald-500/40 group-data-[focus=true]:border-emerald-500/60",
                        label: "text-zinc-400",
                        input: "text-zinc-200 placeholder:text-zinc-600",
                    }}
                    isRequired
                />
                {password.length > 0 && (
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                                style={{ width: `${strength.score}%` }}
                            />
                        </div>
                        <span className={`text-[10px] font-medium shrink-0 ${strength.score <= 40 ? "text-red-400" : strength.score <= 60 ? "text-amber-400" : "text-emerald-400"
                            }`}>
                            {strength.label}
                        </span>
                    </div>
                )}
            </div>

            <Input
                label="Подтвердите пароль"
                placeholder="Повторите пароль"
                value={confirmPassword}
                onValueChange={setConfirmPassword}
                onBlur={() => setConfirmTouched(true)}
                type={showPassword ? "text" : "password"}
                variant="bordered"
                isInvalid={confirmInvalid}
                errorMessage={confirmInvalid ? "Пароли не совпадают" : undefined}
                classNames={{
                    inputWrapper:
                        "bg-zinc-900/50 border-zinc-700/50 hover:border-emerald-500/40 group-data-[focus=true]:border-emerald-500/60",
                    label: "text-zinc-400",
                    input: "text-zinc-200 placeholder:text-zinc-600",
                }}
                isRequired
            />

            <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-3">
                <Checkbox
                    isSelected={acceptedTerms}
                    onValueChange={setAcceptedTerms}
                    classNames={{ label: "text-sm text-zinc-300" }}
                >
                    Принимаю{" "}
                    <button type="button" onClick={onOpen} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
                        условия оферты
                    </button>
                </Checkbox>
            </div>

            <AnimatePresence>
                {registerMutation.isError && (
                    <motion.p
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        className="text-sm text-red-400 text-center -mt-2 overflow-hidden"
                    >
                        {registerMutation.error instanceof Error
                            ? registerMutation.error.message
                            : "Ошибка регистрации. Возможно, этот номер уже используется."}
                    </motion.p>
                )}
            </AnimatePresence>

            <Button
                type="submit"
                size="lg"
                isLoading={registerMutation.isPending}
                isDisabled={!canSubmit}
                className="bg-emerald-600 text-white font-semibold glow-sm hover:bg-emerald-500 transition-all duration-300 mt-1"
                endContent={!registerMutation.isPending && <UserPlus size={18} />}
            >
                Создать аккаунт
            </Button>

            <p className="text-sm text-zinc-500 text-center mt-2">
                Уже есть аккаунт?{" "}
                <Link
                    href="/login"
                    className="text-emerald-400 hover:text-emerald-300 text-sm"
                >
                    Войти
                </Link>
            </p>

            <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl" backdrop="blur" classNames={{ base: "bg-[#10102a] border border-white/10" }}>
                <ModalContent>
                    <ModalHeader>Публичная оферта</ModalHeader>
                    <ModalBody>
                        <p className="text-sm text-zinc-300 leading-relaxed">
                            Используя платформу, вы подтверждаете согласие с правилами сервиса, политикой обработки данных,
                            условиями безопасной сделки и регламентом разрешения споров.
                        </p>
                        <p className="text-sm text-zinc-400">
                            Полный текст оферты предоставляется в юридическом разделе и обязателен для всех зарегистрированных пользователей.
                        </p>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="flat" onPress={onOpenChange}>Закрыть</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </form>
    );
};
