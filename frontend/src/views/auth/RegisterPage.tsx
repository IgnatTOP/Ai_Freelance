"use client";

import { AuthLayout } from "./ui/AuthLayout";
import { AuthEntryGuard } from "./ui/AuthEntryGuard";
import { RegisterForm } from "./ui/RegisterForm";

export const RegisterPage = () => (
    <AuthEntryGuard>
        <AuthLayout
            title="Создать аккаунт"
            subtitle="Подключитесь к платформе и настройте роль в один шаг"
            mode="register"
        >
            <RegisterForm />
        </AuthLayout>
    </AuthEntryGuard>
);
