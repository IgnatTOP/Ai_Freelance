"use client";

import { Chip } from "@heroui/react";

const statusConfig: Record<string, { color: "success" | "warning" | "danger" | "primary" | "default"; label: string }> = {
  draft: { color: "default", label: "Черновик" },
  published: { color: "primary", label: "Опубликован" },
  in_progress: { color: "warning", label: "В работе" },
  completed: { color: "success", label: "Завершён" },
  cancelled: { color: "danger", label: "Отменён" },
  pending: { color: "warning", label: "Ожидает" },
  shortlisted: { color: "primary", label: "В шорт-листе" },
  accepted: { color: "success", label: "Принят" },
  rejected: { color: "danger", label: "Отклонён" },
};

interface StatusBadgeProps {
  readonly status: string;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status] ?? { color: "default" as const, label: status };
  return (
    <Chip size="sm" color={config.color} variant="flat">
      {config.label}
    </Chip>
  );
};
