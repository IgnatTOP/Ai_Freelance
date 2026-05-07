"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Plus, Search, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOnboardingStore } from "@/features/onboarding/model";
import { useAISuggestSkills } from "@/features/onboarding/hooks/useAISuggestSkills";
import { catalogApi } from "@/shared/api/endpoints/catalog";
import { FilkaButton, FilkaInput } from "@/shared/ui/filka/FilkaPrimitives";

const DRAG_MIME = "application/x-filka-skill";
const AUTO_SUGGEST_DELAY = 600;
const POPULAR_LIMIT = 28;

const normalize = (s: string) => s.trim().toLowerCase();

interface SkillChipProps {
  readonly skill: string;
  readonly variant: "catalog" | "selected" | "suggested";
  readonly isSelected?: boolean;
  readonly animated?: boolean;
  readonly onClick: () => void;
  readonly onRemove?: () => void;
}

const SkillChip = ({ skill, variant, isSelected = false, animated = true, onClick, onRemove }: SkillChipProps) => {
  const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(DRAG_MIME, skill);
    e.dataTransfer.setData("text/plain", skill);
    e.dataTransfer.effectAllowed = "copyMove";
  };

  const styleByVariant: React.CSSProperties =
    variant === "selected"
      ? {
          background: "linear-gradient(135deg, rgba(102,58,243,0.22), rgba(138,102,246,0.18))",
          color: "var(--ghost-white)",
          border: "1px solid rgba(186,215,247,0.32)",
          boxShadow: "0 0 0 1px rgba(102,58,243,0.18) inset",
        }
      : variant === "suggested"
      ? isSelected
        ? {
            background: "rgba(199,211,234,0.03)",
            color: "var(--whisper-blue)",
            border: "1px dashed rgba(186,215,247,0.18)",
            cursor: "default",
          }
        : {
            background: "rgba(102,58,243,0.10)",
            color: "var(--ghost-white)",
            border: "1px solid rgba(102,58,243,0.36)",
          }
      : isSelected
      ? {
          background: "rgba(199,211,234,0.025)",
          color: "var(--whisper-blue)",
          border: "1px dashed rgba(186,215,247,0.16)",
          cursor: "default",
        }
      : {
          background: "rgba(199,211,234,0.04)",
          color: "var(--arctic-mist)",
          border: "1px solid rgba(186,215,247,0.14)",
        };

  const Wrapper: React.ElementType = animated ? motion.div : "div";
  const animProps = animated
    ? {
        layoutId: `skill-${skill}`,
        initial: { opacity: 0, scale: 0.9 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.9 },
        transition: { type: "spring", stiffness: 380, damping: 28 },
      }
    : {};

  return (
    <Wrapper
      draggable={!isSelected || variant === "selected"}
      onDragStart={onDragStart}
      onClick={isSelected && variant !== "selected" ? undefined : onClick}
      className={`group inline-flex select-none items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
        isSelected && variant !== "selected" ? "" : "cursor-grab active:cursor-grabbing"
      }`}
      style={styleByVariant}
      {...animProps}
    >
      {variant === "suggested" ? <Sparkles size={12} className="opacity-80" /> : null}
      <span>{skill}</span>
      {variant === "selected" && onRemove ? (
        <button
          type="button"
          aria-label={`Удалить ${skill}`}
          className="ml-0.5 grid h-4 w-4 place-items-center rounded-full transition-colors hover:bg-[rgba(255,255,255,0.18)]"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X size={11} />
        </button>
      ) : isSelected ? (
        <Check size={11} className="opacity-70" />
      ) : variant === "catalog" ? (
        <Plus size={12} className="opacity-0 transition-opacity group-hover:opacity-90" />
      ) : null}
    </Wrapper>
  );
};

export const StepSkills = () => {
  const { freelancerData, updateFreelancer, nextStep, prevStep } = useOnboardingStore();
  const { suggestedSkills, isStreaming, suggest } = useAISuggestSkills();

  const [query, setQuery] = useState("");
  const [allSkills, setAllSkills] = useState<string[]>([]);
  const [isOverDropzone, setIsOverDropzone] = useState(false);
  const suggestTimerRef = useRef<number | null>(null);

  const selectedSet = useMemo(() => new Set(freelancerData.skills.map(normalize)), [freelancerData.skills]);

  useEffect(() => {
    catalogApi
      .listSkills()
      .then((skills) => setAllSkills(skills.map((s) => s.name)))
      .catch(() => {});
  }, []);

  // Авто-подбор от ИИ при изменении набора навыков
  useEffect(() => {
    if (allSkills.length === 0) return;
    if (suggestTimerRef.current) {
      window.clearTimeout(suggestTimerRef.current);
    }
    suggestTimerRef.current = window.setTimeout(() => {
      suggest({
        name: freelancerData.name,
        experienceYears: freelancerData.experienceYears,
        selectedSkills: freelancerData.skills,
        catalogSkills: allSkills,
      });
    }, AUTO_SUGGEST_DELAY);

    return () => {
      if (suggestTimerRef.current) window.clearTimeout(suggestTimerRef.current);
    };
  }, [allSkills, freelancerData.skills, freelancerData.name, freelancerData.experienceYears, suggest]);

  const addSkill = useCallback(
    (raw: string) => {
      const skill = raw.trim();
      if (!skill) return;
      if (selectedSet.has(normalize(skill))) return;
      updateFreelancer({ skills: [...freelancerData.skills, skill] });
    },
    [freelancerData.skills, selectedSet, updateFreelancer],
  );

  const removeSkill = useCallback(
    (skill: string) => {
      updateFreelancer({ skills: freelancerData.skills.filter((s) => s !== skill) });
    },
    [freelancerData.skills, updateFreelancer],
  );

  const submitQuery = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    addSkill(q);
    setQuery("");
  }, [addSkill, query]);

  const onDropzoneDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes(DRAG_MIME) || e.dataTransfer.types.includes("text/plain")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      if (!isOverDropzone) setIsOverDropzone(true);
    }
  };

  const onDropzoneDragLeave = () => setIsOverDropzone(false);

  const onDropzoneDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const skill = e.dataTransfer.getData(DRAG_MIME) || e.dataTransfer.getData("text/plain");
    if (skill) {
      e.preventDefault();
      addSkill(skill);
    }
    setIsOverDropzone(false);
  };

  const onCatalogDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const skill = e.dataTransfer.getData(DRAG_MIME);
    if (skill && selectedSet.has(normalize(skill))) {
      e.preventDefault();
      removeSkill(skill);
    }
  };

  const filteredCatalog = useMemo(() => {
    const q = normalize(query);
    if (!q) return allSkills.slice(0, POPULAR_LIMIT);
    return allSkills.filter((s) => s.toLowerCase().includes(q)).slice(0, POPULAR_LIMIT);
  }, [allSkills, query]);

  const aiTopSuggestions = useMemo(() => suggestedSkills.slice(0, 8), [suggestedSkills]);

  return (
    <motion.div
      className="glass-card rounded-2xl p-6 sm:p-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <h2 className="mb-1 text-2xl font-bold text-[var(--fg-0)]">Ваши навыки</h2>
      <p className="mb-6 text-sm text-[var(--fg-3)]">
        Перетаскивайте навыки в правую колонку или кликните, чтобы добавить. AI подбирает связанные на лету.
      </p>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        {/* CATALOG */}
        <div
          className="flex min-h-[420px] flex-col rounded-xl border p-4"
          style={{
            background: "rgba(199,211,234,0.025)",
            borderColor: "var(--line)",
          }}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes(DRAG_MIME)) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }
          }}
          onDrop={onCatalogDrop}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--fg-3)" }}>
              Каталог
            </span>
            <span className="text-[11px]" style={{ color: "var(--fg-4)" }}>
              {filteredCatalog.length}
            </span>
          </div>

          <div className="relative mb-3">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--fg-3)" }}
            />
            <FilkaInput
              className="pl-9"
              placeholder="React, TypeScript, Figma..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitQuery();
                }
              }}
            />
          </div>

          {/* AI suggested — секция всегда отрендерена, чтобы лейаут не прыгал */}
          <div
            className="mb-3 rounded-lg border p-3"
            style={{
              background: "rgba(102,58,243,0.06)",
              borderColor: "rgba(102,58,243,0.22)",
              minHeight: 88,
            }}
          >
            <div className="mb-2 flex items-center gap-2">
              <Sparkles size={12} style={{ color: "var(--celestial-light)" }} />
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: "var(--celestial-light)" }}
              >
                AI рекомендует
              </span>
              {isStreaming ? (
                <span className="text-[10px]" style={{ color: "var(--fg-3)" }}>
                  подбираем…
                </span>
              ) : null}
            </div>
            {aiTopSuggestions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {aiTopSuggestions.map((skill) => {
                  const sel = selectedSet.has(normalize(skill));
                  return (
                    <SkillChip
                      key={skill}
                      skill={skill}
                      variant="suggested"
                      isSelected={sel}
                      animated={false}
                      onClick={() => addSkill(skill)}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px]" style={{ color: "var(--fg-3)" }}>
                {isStreaming ? "Анализируем ваш профиль…" : "Добавьте первый навык — AI предложит связанные."}
              </p>
            )}
          </div>

          {/* Все навыки каталога — порядок не меняется при добавлении */}
          <div className="flex flex-1 flex-wrap content-start gap-1.5 overflow-y-auto">
            {filteredCatalog.map((skill) => {
              const sel = selectedSet.has(normalize(skill));
              return (
                <SkillChip
                  key={skill}
                  skill={skill}
                  variant="catalog"
                  isSelected={sel}
                  animated={false}
                  onClick={() => addSkill(skill)}
                />
              );
            })}
            {filteredCatalog.length === 0 && query.trim() && (
              <button
                type="button"
                onClick={submitQuery}
                className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition-colors"
                style={{
                  background: "rgba(102,58,243,0.10)",
                  color: "var(--ghost-white)",
                  borderColor: "rgba(102,58,243,0.36)",
                }}
              >
                <Plus size={12} />
                Добавить «{query.trim()}»
              </button>
            )}
          </div>
        </div>

        {/* SELECTED / DROPZONE */}
        <div
          onDragOver={onDropzoneDragOver}
          onDragLeave={onDropzoneDragLeave}
          onDrop={onDropzoneDrop}
          className="flex min-h-[420px] flex-col rounded-xl border p-4 transition-all"
          style={{
            background: isOverDropzone
              ? "rgba(102,58,243,0.10)"
              : "linear-gradient(180deg, rgba(102,58,243,0.05), rgba(199,211,234,0.02))",
            borderColor: isOverDropzone ? "rgba(102,58,243,0.45)" : "rgba(102,58,243,0.22)",
            boxShadow: isOverDropzone ? "0 0 0 1px rgba(102,58,243,0.32) inset" : "none",
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--celestial-light)" }}>
              Мои навыки
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{
                background: "rgba(102,58,243,0.16)",
                color: "var(--ghost-white)",
                border: "1px solid rgba(102,58,243,0.30)",
              }}
            >
              {freelancerData.skills.length}
            </span>
          </div>

          {freelancerData.skills.length === 0 ? (
            <div
              className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed text-center"
              style={{ borderColor: "rgba(186,215,247,0.18)" }}
            >
              <div
                className="mb-3 grid h-12 w-12 place-items-center rounded-full"
                style={{
                  background: "rgba(102,58,243,0.12)",
                  border: "1px solid rgba(102,58,243,0.26)",
                }}
              >
                <Sparkles size={20} style={{ color: "var(--celestial-light)" }} />
              </div>
              <div className="text-sm font-medium" style={{ color: "var(--fg-1)" }}>
                Перетащите навыки сюда
              </div>
              <div className="mt-1 text-xs" style={{ color: "var(--fg-3)" }}>
                Или просто кликните по чипу слева
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-wrap content-start gap-2 overflow-y-auto">
              <AnimatePresence initial={false}>
                {freelancerData.skills.map((skill) => (
                  <SkillChip
                    key={skill}
                    skill={skill}
                    variant="selected"
                    onClick={() => removeSkill(skill)}
                    onRemove={() => removeSkill(skill)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {freelancerData.skills.length > 0 && (
            <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: "rgba(186,215,247,0.10)" }}>
              <span className="text-[11px]" style={{ color: "var(--fg-3)" }}>
                Перетащите чипы обратно в каталог чтобы убрать
              </span>
              <button
                type="button"
                onClick={() => updateFreelancer({ skills: [] })}
                className="text-[11px] font-medium transition-colors"
                style={{ color: "var(--fg-2)" }}
              >
                Очистить
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <FilkaButton variant="ghost" startContent={<ArrowLeft size={16} />} onClick={prevStep}>
          Назад
        </FilkaButton>
        <FilkaButton
          variant="primary"
          endContent={<ArrowRight size={16} />}
          disabled={freelancerData.skills.length === 0}
          onClick={nextStep}
        >
          Далее
        </FilkaButton>
      </div>
    </motion.div>
  );
};
