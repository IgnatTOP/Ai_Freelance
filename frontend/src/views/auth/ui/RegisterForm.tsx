"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRegisterPhone } from "@/features/auth-phone";
import { useSessionStore } from "@/shared/store/session.store";
import { isValidPhone } from "@/shared/lib/phone";
import { cn } from "@/shared/lib/cn";
import {
    FilkaButton,
    FilkaCheckbox,
    FilkaField,
    FilkaInput,
    FilkaPhoneInput,
    IconArrowRight,
    IconBriefcase,
    IconCircleCheck,
    IconEye,
    IconEyeOff,
    IconLightning,
} from "@/shared/ui/filka";

const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score: 20, label: "Слабый", color: "#f87171" };
    if (score === 2) return { score: 40, label: "Средний", color: "#f59e0b" };
    if (score === 3) return { score: 60, label: "Хороший", color: "#f5e27a" };
    if (score === 4) return { score: 80, label: "Сильный", color: "#663af3" };
    return { score: 100, label: "Отличный", color: "#b6d9fc" };
};

export const RegisterForm = () => {
    const router = useRouter();
    const registerMutation = useRegisterPhone();
    const setSession = useSessionStore((s) => s.setSession);
    const setPendingPhone = useSessionStore((s) => s.setPendingPhone);
    const setPhoneVerified = useSessionStore((s) => s.setPhoneVerified);

    const [phoneDigits, setPhoneDigits] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [role, setRole] = useState<"client" | "freelancer">("client");
    const [showPassword, setShowPassword] = useState(false);
    const [phoneTouched, setPhoneTouched] = useState(false);
    const [passwordTouched, setPasswordTouched] = useState(false);
    const [confirmTouched, setConfirmTouched] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);

    const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
    const phoneInvalid = phoneTouched && !isValidPhone(phoneDigits);
    const passwordInvalid = passwordTouched && password.length < 8;
    const confirmInvalid = confirmTouched && passwordMismatch;
    const canSubmit = isValidPhone(phoneDigits) && password.length >= 8 && !passwordMismatch && acceptedTerms;
    const strength = useMemo(() => getPasswordStrength(password), [password]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPhoneTouched(true);
        setPasswordTouched(true);
        setConfirmTouched(true);
        if (!canSubmit) return;
        const fullPhone = phoneDigits.startsWith("7") ? phoneDigits : `7${phoneDigits}`;

        registerMutation.mutate(
            { phone: fullPhone, password, role },
            {
                onSuccess: (data) => {
                    setSession(data.user.id, data.user.role);
                    setPendingPhone(fullPhone);
                    setPhoneVerified(false);
                    setIsNavigating(true);
                    router.push("/verify-phone" as never);
                },
            },
        );
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
                <RoleCard
                    icon={<IconBriefcase size={19} />}
                    title="Заказчик"
                    description="Ищу исполнителей и публикую проекты."
                    selected={role === "client"}
                    onSelect={() => setRole("client")}
                />
                <RoleCard
                    icon={<IconLightning size={19} />}
                    title="Исполнитель"
                    description="Берусь за задачи и развиваю профиль."
                    selected={role === "freelancer"}
                    onSelect={() => setRole("freelancer")}
                />
            </div>

            <FilkaField label="Телефон" error={phoneInvalid ? "Введите корректный номер телефона" : undefined}>
                <FilkaPhoneInput
                    value={phoneDigits}
                    onChange={(digits) => setPhoneDigits(digits)}
                    hasError={phoneInvalid}
                />
            </FilkaField>

            <FilkaField label="Пароль" error={passwordInvalid ? "Минимум 8 символов" : undefined}>
                <div className="relative">
                    <FilkaInput
                        placeholder="Минимум 8 символов"
                        value={password}
                        type={showPassword ? "text" : "password"}
                        hasError={passwordInvalid}
                        onChange={(event) => setPassword(event.target.value)}
                        onBlur={() => setPasswordTouched(true)}
                        className="pr-11"
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
                {password.length > 0 ? (
                    <div className="mt-2 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--bg-3)" }}>
                            <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${strength.score}%`, backgroundColor: strength.color }}
                            />
                        </div>
                        <span className="text-[11px] font-medium" style={{ color: strength.color }}>
                            {strength.label}
                        </span>
                    </div>
                ) : null}
            </FilkaField>

            <FilkaField label="Подтвердите пароль" error={confirmInvalid ? "Пароли не совпадают" : undefined}>
                <FilkaInput
                    placeholder="Повторите пароль"
                    value={confirmPassword}
                    type={showPassword ? "text" : "password"}
                    hasError={confirmInvalid}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    onBlur={() => setConfirmTouched(true)}
                />
            </FilkaField>

            <div
                className="rounded-[var(--r-lg)] border p-4"
                style={{ background: "var(--bg-2)", borderColor: "var(--line)" }}
            >
                <FilkaCheckbox
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    label={
                        <span>
                            Принимаю{" "}
                            <Link href="/" className="filka-link">
                                условия оферты
                            </Link>{" "}
                            и{" "}
                            <Link href="/" className="filka-link">
                                политику обработки данных
                            </Link>
                        </span>
                    }
                />
            </div>

            {registerMutation.isError && (
                <p
                    className="rounded-[var(--r-md)] border px-4 py-3 text-sm"
                    style={{
                        background: "rgba(248,113,113,0.08)",
                        borderColor: "rgba(248,113,113,0.22)",
                        color: "#fecaca",
                    }}
                >
                    {registerMutation.error instanceof Error
                        ? registerMutation.error.message
                        : "Ошибка регистрации. Возможно, этот номер уже используется."}
                </p>
            )}

            <FilkaButton
                type="submit"
                size="lg"
                loading={registerMutation.isPending || isNavigating}
                disabled={!canSubmit}
                endContent={<IconArrowRight size={18} />}
                className="w-full"
            >
                {isNavigating ? "Переходим…" : "Создать аккаунт"}
            </FilkaButton>

            <p className="text-center text-sm" style={{ color: "var(--fg-2)" }}>
                Уже есть аккаунт?{" "}
                <Link href="/login" className="filka-link">
                    Войти
                </Link>
            </p>
        </form>
    );
};

interface RoleCardProps {
    readonly icon: React.ReactNode;
    readonly title: string;
    readonly description: string;
    readonly selected: boolean;
    readonly onSelect: () => void;
}

const RoleCard = ({ icon, title, description, selected, onSelect }: RoleCardProps) => (
    <button
        type="button"
        onClick={onSelect}
        className={cn(
            "relative rounded-[var(--r-lg)] border p-4 text-left transition-all",
            selected ? "shadow-[var(--shadow-glow-soft)]" : "hover:border-[var(--line-hover)]",
        )}
        style={{
            background: selected ? "rgba(102,58,243,0.12)" : "var(--bg-2)",
            borderColor: selected ? "rgba(102,58,243,0.32)" : "var(--line)",
        }}
        aria-pressed={selected}
    >
        {selected ? (
            <IconCircleCheck size={16} className="absolute right-4 top-4 text-[var(--mint-300)]" />
        ) : null}
        <div
            className="mb-3 grid h-10 w-10 place-items-center rounded-[var(--r-md)]"
            style={{
                background: "rgba(102,58,243,0.12)",
                color: "var(--mint-300)",
            }}
        >
            {icon}
        </div>
        <div className="mb-1 text-sm font-semibold">{title}</div>
        <div className="text-xs leading-5" style={{ color: "var(--fg-2)" }}>
            {description}
        </div>
    </button>
);
