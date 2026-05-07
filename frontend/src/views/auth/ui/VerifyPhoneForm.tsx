"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVerifyPhone } from "@/features/auth-phone";
import { authTokenStorage } from "@/shared/api/client";
import { authApi } from "@/shared/api/endpoints/auth";
import { notify } from "@/shared/notifications/notify";
import { useSessionStore } from "@/shared/store/session.store";
import { useSessionHydrated } from "@/shared/store/use-session-hydrated";
import { formatRuPhoneMask } from "@/shared/lib/phone";
import {
  FilkaButton,
  FilkaOTPInput,
  IconArrowRight,
} from "@/shared/ui/filka";

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

  const [code, setCode] = useState("");
  const [resendCountdown, setResendCountdown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const canSubmit = code.length === OTP_LENGTH && Boolean(pendingPhone);

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
      notify.error({ title: "Не удалось подтвердить телефон", message: "Проверьте код и попробуйте ещё раз." });
      setCode("");
    }
  };

  const handleResend = async () => {
    if (!pendingPhone || resendCountdown > 0 || isResending) return;
    setIsResending(true);
    try {
      await authApi.resendCode(pendingPhone);
      setResendCountdown(60);
      notify.success({ title: "Код отправлен повторно" });
    } catch (resendError) {
      notify.error({
        title: "Не удалось отправить код",
        message: resendError instanceof Error ? resendError.message : "Попробуйте позже.",
      });
    } finally {
      setIsResending(false);
    }
  };

  if (!sessionHydrated || !pendingPhone) return null;

  const masked = formatRuPhoneMask(pendingPhone);

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-sm" style={{ color: "var(--fg-1)" }}>
          Код отправлен на{" "}
          <span className="t-mono font-semibold" style={{ color: "var(--fg-0)" }}>
            {masked}
          </span>
        </p>
      </div>

      <FilkaOTPInput
        length={OTP_LENGTH}
        value={code}
        onChange={setCode}
        onComplete={() => void handleVerify()}
        hasError={Boolean(error)}
        autoFocus
      />

      {error ? (
        <p className="text-center text-sm" style={{ color: "#fecaca" }}>
          {error}
        </p>
      ) : null}

      <FilkaButton
        className="w-full"
        size="lg"
        disabled={!canSubmit}
        loading={verifyMutation.isPending}
        onClick={handleVerify}
        endContent={<IconArrowRight size={18} />}
      >
        Подтвердить телефон
      </FilkaButton>

      <div className="flex items-center justify-between gap-4 text-xs" style={{ color: "var(--fg-2)" }}>
        <button
          type="button"
          className={resendCountdown > 0 ? "cursor-not-allowed opacity-60" : "filka-link"}
          disabled={resendCountdown > 0 || isResending}
          onClick={() => void handleResend()}
        >
          {isResending ? "Отправляем…" : resendCountdown > 0 ? `Повторить через ${formatCountdown(resendCountdown)}` : "Отправить код повторно"}
        </button>
        <Link href="/register" className="transition-colors hover:text-[var(--fg-0)]">
          Изменить номер
        </Link>
      </div>
    </div>
  );
};
