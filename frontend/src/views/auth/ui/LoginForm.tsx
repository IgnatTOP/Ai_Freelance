"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLoginPhone } from "@/features/auth-phone";
import { useSessionStore } from "@/shared/store/session.store";
import { isValidPhone } from "@/shared/lib/phone";
import {
    FilkaButton,
    FilkaField,
    FilkaInput,
    FilkaPhoneInput,
    IconArrowRight,
    IconEye,
    IconEyeOff,
    IconLock,
} from "@/shared/ui/filka";

export const LoginForm = () => {
    const router = useRouter();
    const loginMutation = useLoginPhone();
    const setSession = useSessionStore((s) => s.setSession);
    const setPhoneVerified = useSessionStore((s) => s.setPhoneVerified);

    const [phoneDigits, setPhoneDigits] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [phoneTouched, setPhoneTouched] = useState(false);
    const [passwordTouched, setPasswordTouched] = useState(false);

    const phoneInvalid = phoneTouched && !isValidPhone(phoneDigits);
    const passwordInvalid = passwordTouched && password.length < 8;
    const canSubmit = isValidPhone(phoneDigits) && password.length >= 8;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPhoneTouched(true);
        setPasswordTouched(true);
        if (!canSubmit) return;
        const fullPhone = phoneDigits.startsWith("7") ? phoneDigits : `7${phoneDigits}`;
        loginMutation.mutate(
            { phone: fullPhone, password },
            {
                onSuccess: (data) => {
                    setSession(data.user.id, data.user.role);
                    setPhoneVerified(true);
                    router.push("/dashboard");
                },
            },
        );
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <FilkaField label="Телефон" error={phoneInvalid ? "Введите корректный номер телефона" : undefined}>
                <FilkaPhoneInput
                    value={phoneDigits}
                    onChange={(digits) => {
                        setPhoneDigits(digits);
                        if (phoneTouched) setPhoneTouched(false);
                    }}
                    hasError={phoneInvalid}
                    autoFocus
                />
            </FilkaField>

            <FilkaField label="Пароль" error={passwordInvalid ? "Минимум 8 символов" : undefined}>
                <div className="relative">
                    <IconLock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-3)]" />
                    <FilkaInput
                        placeholder="Минимум 8 символов"
                        value={password}
                        type={showPassword ? "text" : "password"}
                        hasError={passwordInvalid}
                        onChange={(event) => setPassword(event.target.value)}
                        onBlur={() => setPasswordTouched(true)}
                        className="pl-10 pr-11"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--fg-3)] transition-colors hover:text-[var(--fg-0)]"
                        aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                    >
                        {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                    </button>
                </div>
            </FilkaField>

            {loginMutation.isError && (
                <p
                    className="rounded-[var(--r-md)] border px-4 py-3 text-sm"
                    style={{
                        background: "rgba(248,113,113,0.08)",
                        borderColor: "rgba(248,113,113,0.22)",
                        color: "#fecaca",
                    }}
                >
                    {loginMutation.error instanceof Error ? loginMutation.error.message : "Неверный телефон или пароль"}
                </p>
            )}

            <FilkaButton
                type="submit"
                size="lg"
                loading={loginMutation.isPending}
                disabled={!canSubmit}
                endContent={<IconArrowRight size={18} />}
                className="w-full"
            >
                Войти
            </FilkaButton>

            <p className="text-center text-sm" style={{ color: "var(--fg-2)" }}>
                Нет аккаунта?{" "}
                <Link href="/register" className="filka-link">
                    Зарегистрироваться
                </Link>
            </p>
        </form>
    );
};
