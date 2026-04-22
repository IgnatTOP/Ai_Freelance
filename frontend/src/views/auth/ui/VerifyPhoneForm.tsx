"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Link } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useVerifyPhone } from "@/features/auth-phone";
import { authTokenStorage } from "@/shared/api/client";
import { authApi } from "@/shared/api/endpoints/auth";
import { useSessionStore } from "@/shared/store/session.store";
import { useSessionHydrated } from "@/shared/store/use-session-hydrated";

const OTP_LENGTH = 6;

const formatCountdown = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${mins}:${String(sec).padStart(2, "0")}`;
};

export const VerifyPhoneForm = () => {
  const router = useRouter();
  const verifyMutation = useVerifyPhone();
  const sessionHydrated = useSessionHydrated();
  const pendingPhone = useSessionStore((s) => s.pendingPhone);
  const setPhoneVerified = useSessionStore((s) => s.setPhoneVerified);
  const setPendingPhone = useSessionStore((s) => s.setPendingPhone);
  const token = sessionHydrated ? authTokenStorage.get() : null;
  const [verificationCompleted, setVerificationCompleted] = useState(false);

  const [digits, setDigits] = useState<string[]>(() => Array.from({ length: OTP_LENGTH }, () => ""));
  const [resendCountdown, setResendCountdown] = useState(60);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!sessionHydrated) return;
    if (verificationCompleted) return;
    if (!pendingPhone) {
      router.replace((token ? "/dashboard" : "/register") as never);
    }
  }, [sessionHydrated, verificationCompleted, pendingPhone, token, router]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const id = window.setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendCountdown]);

  const code = useMemo(() => digits.join(""), [digits]);
  const canSubmit = code.length === OTP_LENGTH && pendingPhone;

  const setDigit = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < OTP_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!text) return;
    event.preventDefault();
    const next = Array.from({ length: OTP_LENGTH }, (_, index) => text[index] ?? "");
    setDigits(next);
    const focusIndex = Math.min(text.length, OTP_LENGTH - 1);
    refs.current[focusIndex]?.focus();
  };

  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!pendingPhone || code.length !== OTP_LENGTH) return;
    setError(null);
    try {
      await verifyMutation.mutateAsync({ phone: pendingPhone, code });
      setVerificationCompleted(true);
      setPhoneVerified(true);
      setPendingPhone(null);
      router.replace("/onboarding" as never);
    } catch {
      setError("Неверный код. Попробуйте ещё раз.");
      setDigits(Array.from({ length: OTP_LENGTH }, () => ""));
      refs.current[0]?.focus();
    }
  };

  if (!sessionHydrated || !pendingPhone) return null;

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-sm text-zinc-400">Код отправлен на {pendingPhone}</p>
      </div>

      <div className="flex items-center justify-center gap-2" onPaste={handlePaste}>
        {digits.map((digit, index) => (
          <Input
            key={index}
            ref={(el: HTMLInputElement | null) => {
              refs.current[index] = el;
            }}
            value={digit}
            onValueChange={(value) => setDigit(index, value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            inputMode="numeric"
            maxLength={1}
            className="w-11"
            classNames={{
              inputWrapper: "bg-zinc-900/60 border-zinc-700/70 h-12",
              input: "text-center text-lg text-zinc-100 font-semibold"
            }}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-400 text-center">{error}</p>
      )}

      <Button
        fullWidth
        className="bg-emerald-600 text-white font-semibold"
        isDisabled={!canSubmit}
        isLoading={verifyMutation.isPending}
        onPress={handleVerify}
      >
        Подтвердить телефон
      </Button>

      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          className={`transition-colors ${
            resendCountdown > 0 ? "text-zinc-600 cursor-not-allowed" : "text-emerald-400 hover:text-emerald-300"
          }`}
          disabled={resendCountdown > 0}
          onClick={() => {
            if (pendingPhone) {
              void authApi.resendCode(pendingPhone);
              setResendCountdown(60);
            }
          }}
        >
          {resendCountdown > 0 ? `Повторить через ${formatCountdown(resendCountdown)}` : "Отправить код повторно"}
        </button>
        <Link href="/register" className="text-zinc-500 hover:text-zinc-300">
          Изменить номер
        </Link>
      </div>
    </div>
  );
};
