"use client";

import { AuthLayout } from "./ui/AuthLayout";
import { AuthEntryGuard } from "./ui/AuthEntryGuard";
import { RegisterForm } from "./ui/RegisterForm";

export const RegisterPage = () => (
    <AuthEntryGuard>
        <AuthLayout
            title="Создать аккаунт"
            subtitle="Присоединяйтесь к платформе нового поколения"
        >
            <RegisterForm />
        </AuthLayout>
    </AuthEntryGuard>
);
