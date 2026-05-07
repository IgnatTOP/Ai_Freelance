"use client";

import { AuthLayout } from "./ui/AuthLayout";
import { VerifyPhoneForm } from "./ui/VerifyPhoneForm";

export const VerifyPhonePage = () => (
  <AuthLayout title="Подтверждение телефона" subtitle="Введите 6-значный код из SMS" mode="verify">
    <VerifyPhoneForm />
  </AuthLayout>
);
