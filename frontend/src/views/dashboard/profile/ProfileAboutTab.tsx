"use client";

import { User, Code2, PenLine } from "lucide-react";
import type { Profile } from "@/shared/api/endpoints/profile";
import { FilkaButton, FilkaChip } from "@/shared/ui/filka/FilkaPrimitives";

type Props = {
  profile: Profile | null;
  role: string | null;
  isEditing: boolean;
  onStartEdit: () => void;
};

export const ProfileAboutTab = ({ profile, role, isEditing, onStartEdit }: Props) => {
  return (
    <div className="mt-4 space-y-6">
      <div className="glass-card rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-[rgba(52,211,153,0.12)] p-2 text-[var(--mint-300)]">
              <User size={18} />
            </div>
            <h3 className="text-lg font-semibold text-[var(--fg-0)]">О себе</h3>
          </div>
        </div>
        {profile?.bio ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--fg-1)]">{profile.bio}</p>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--line)] py-6 text-center">
            <PenLine size={24} className="mx-auto mb-2 text-[var(--fg-3)]" />
            <p className="text-sm text-[var(--fg-2)]">Напишите пару слов о себе, чтобы выделиться</p>
            {!isEditing && (
              <FilkaButton size="sm" variant="soft" className="mt-3" onClick={onStartEdit}>
                Добавить описание
              </FilkaButton>
            )}
          </div>
        )}
      </div>

      {role === "freelancer" && (
        <div className="glass-card rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-[rgba(125,211,252,0.1)] p-2 text-[var(--info)]">
                <Code2 size={18} />
              </div>
              <h3 className="text-lg font-semibold text-[var(--fg-0)]">Навыки и технологии</h3>
            </div>
          </div>
          {profile?.skills && profile.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <FilkaChip key={s} className="text-xs font-medium">
                  {s}
                </FilkaChip>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--line)] py-6 text-center">
              <Code2 size={24} className="mx-auto mb-2 text-[var(--fg-3)]" />
              <p className="text-sm text-[var(--fg-2)]">Добавьте навыки, чтобы заказчики находили вас быстрее</p>
              {!isEditing && (
                <FilkaButton size="sm" variant="soft" className="mt-3" onClick={onStartEdit}>
                  Указать навыки
                </FilkaButton>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
