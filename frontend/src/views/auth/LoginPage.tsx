"use client";

import { AuthLayout } from "./ui/AuthLayout";
import { AuthEntryGuard } from "./ui/AuthEntryGuard";
import { LoginForm } from "./ui/LoginForm";

export const LoginPage = () => (
    <AuthEntryGuard>
        <AuthLayout
            title="Добро пожаловать"
            subtitle="Войдите, чтобы продолжить работу на платформе"
            mode="login"
        >
            <LoginForm />
        </AuthLayout>
    </AuthEntryGuard>
);
