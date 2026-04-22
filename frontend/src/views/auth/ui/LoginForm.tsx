"use client";

import { useState } from "react";
import { Button, Input, Link } from "@heroui/react";
import { Eye, EyeOff, LogIn, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLoginPhone } from "@/features/auth-phone";
import { useSessionStore } from "@/shared/store/session.store";
import { useRouter } from "next/navigation";
import { formatRuPhoneMask, isValidPhone, normalizePhone } from "@/shared/lib/phone";

export const LoginForm = () => {
    const router = useRouter();
    const loginMutation = useLoginPhone();
    const setSession = useSessionStore((s) => s.setSession);
    const setPhoneVerified = useSessionStore((s) => s.setPhoneVerified);

    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [phoneTouched, setPhoneTouched] = useState(false);
    const [passwordTouched, setPasswordTouched] = useState(false);

    const normalizedPhone = normalizePhone(phone);
    const phoneInvalid = phoneTouched && !isValidPhone(phone);
    const passwordInvalid = passwordTouched && password.length < 8;
    const canSubmit = isValidPhone(phone) && password.length >= 8;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const normalizedPhone = normalizePhone(phone);
        if (!normalizedPhone) return;
        loginMutation.mutate(
            { phone: normalizedPhone, password },
            {
                onSuccess: (data) => {
                    setSession(data.user.id, data.user.role);
                    setPhoneVerified(true);
                    router.push("/dashboard");
                },
            }
        );
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
                        "bg-zinc-900/50 border-zinc-700/50 hover:border-purple-500/40 group-data-[focus=true]:border-purple-500/60",
                    label: "text-zinc-400",
                    input: "text-zinc-200 placeholder:text-zinc-600",
                }}
                isRequired
            />

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
                        "bg-zinc-900/50 border-zinc-700/50 hover:border-purple-500/40 group-data-[focus=true]:border-purple-500/60",
                    label: "text-zinc-400",
                    input: "text-zinc-200 placeholder:text-zinc-600",
                }}
                isRequired
            />

            <AnimatePresence>
                {loginMutation.isError && (
                    <motion.p
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        className="text-sm text-red-400 text-center -mt-2 overflow-hidden"
                    >
                        {loginMutation.error instanceof Error
                            ? loginMutation.error.message
                            : "Неверный телефон или пароль"}
                    </motion.p>
                )}
            </AnimatePresence>

            <Button
                type="submit"
                size="lg"
                isLoading={loginMutation.isPending}
                isDisabled={!canSubmit}
                className="bg-purple-600 text-white font-semibold glow-sm hover:bg-purple-500 transition-all duration-300 mt-1"
                endContent={!loginMutation.isPending && <LogIn size={18} />}
            >
                Войти
            </Button>

            <p className="text-sm text-zinc-500 text-center mt-2">
                Нет аккаунта?{" "}
                <Link
                    href="/register"
                    className="text-purple-400 hover:text-purple-300 text-sm"
                >
                    Зарегистрироваться
                </Link>
            </p>
        </form>
    );
};
