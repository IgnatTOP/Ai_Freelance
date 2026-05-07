"use client";

import { Briefcase, ExternalLink, FileText, Plus } from "lucide-react";
import type { PortfolioItem } from "@/shared/api/endpoints/profile";
import { FilkaButton, FilkaCard } from "@/shared/ui/filka/FilkaPrimitives";

type Props = {
  portfolio: PortfolioItem[];
  onStartEdit: () => void;
};

export const ProfilePortfolioTab = ({ portfolio, onStartEdit }: Props) => {
  if (!portfolio || portfolio.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-[var(--line)] py-8 text-center">
        <FileText size={28} className="mx-auto mb-3 text-[var(--fg-3)]" />
        <p className="mb-1 text-sm text-[var(--fg-2)]">Портфолио пока пусто</p>
        <p className="text-xs text-[var(--fg-3)]">Добавьте примеры работ, чтобы заказчики оценили ваш уровень</p>
        <FilkaButton size="sm" variant="soft" className="mt-3" onClick={onStartEdit}>
          Добавить работу
        </FilkaButton>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-[rgba(245,182,66,0.1)] p-2 text-[var(--warn)]">
            <Briefcase size={18} />
          </div>
          <h3 className="text-lg font-semibold text-[var(--fg-0)]">Портфолио</h3>
        </div>
        <FilkaButton size="sm" variant="soft" startContent={<Plus size={14} />} onClick={onStartEdit}>
          Добавить
        </FilkaButton>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {portfolio.map((item) => (
          <FilkaCard
            key={item.id}
            glass
            className="p-4 transition-colors hover:border-[rgba(102,58,243,0.22)]"
          >
            <h4 className="mb-1 text-sm font-medium text-[var(--fg-0)]">{item.title}</h4>
            <p className="mb-3 line-clamp-2 text-xs text-[var(--fg-2)]">{item.description}</p>
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-[var(--mint-400)] hover:text-[var(--mint-300)]"
              >
                <ExternalLink size={12} /> Открыть проект
              </a>
            )}
          </FilkaCard>
        ))}
      </div>
    </div>
  );
};
