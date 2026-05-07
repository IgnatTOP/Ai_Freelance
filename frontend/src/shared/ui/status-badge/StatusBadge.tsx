"use client";

import { FilkaStatusBadge } from "@/shared/ui/filka";

const orderStatusConfig = {
    draft: { tone: "muted", label: "Черновик" },
    published: { tone: "success", label: "Опубликован" },
    in_progress: { tone: "info", label: "В работе" },
    completed: { tone: "neutral", label: "Завершён" },
    cancelled: { tone: "error", label: "Отменён" },
} as const;

const proposalStatusConfig = {
    pending: { tone: "warn", label: "На рассмотрении" },
    shortlisted: { tone: "info", label: "В шорт-листе" },
    accepted: { tone: "success", label: "Принят" },
    rejected: { tone: "error", label: "Отклонён" },
} as const;

const transactionStatusConfig = {
    pending: { tone: "warn", label: "В обработке" },
    completed: { tone: "success", label: "Завершено" },
    failed: { tone: "error", label: "Ошибка" },
    cancelled: { tone: "muted", label: "Отменено" },
} as const;

const transactionTypeConfig = {
    deposit: { tone: "success", label: "Пополнение" },
    withdrawal: { tone: "warn", label: "Вывод" },
    escrow_hold: { tone: "info", label: "Заморозка эскроу" },
    escrow_release: { tone: "success", label: "Выплата эскроу" },
    escrow_refund: { tone: "muted", label: "Возврат эскроу" },
} as const;

const merged = {
    ...orderStatusConfig,
    ...proposalStatusConfig,
    ...transactionStatusConfig,
    ...transactionTypeConfig,
} as Record<string, { tone: "muted" | "success" | "warn" | "info" | "error" | "neutral"; label: string }>;

interface StatusBadgeProps {
    readonly status: string;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
    const config = merged[status] ?? { tone: "muted" as const, label: status };
    return <FilkaStatusBadge tone={config.tone}>{config.label}</FilkaStatusBadge>;
};
