"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Plus, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOnboardingStore } from "@/features/onboarding/model";
import { useAISuggestSkills } from "@/features/onboarding/hooks/useAISuggestSkills";
import { catalogApi } from "@/shared/api/endpoints/catalog";
import { FilkaButton, FilkaChip, FilkaField, FilkaInput } from "@/shared/ui/filka/FilkaPrimitives";

export const StepSkills = () => {
  const { freelancerData, updateFreelancer, nextStep, prevStep } = useOnboardingStore();
  const { suggestedSkills, isStreaming, suggest } = useAISuggestSkills();
  const [query, setQuery] = useState("");
  const [allSkills, setAllSkills] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    catalogApi
      .listSkills()
      .then((skills) => {
        setAllSkills(skills.map((s) => s.name));
      })
      .catch(() => {});
  }, []);

  const splitSkills = useCallback((value: string): string[] => {
    return value
      .split(/[,\n;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, []);

  useEffect(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    const timer = window.setTimeout(async () => {
      try {
        const skills = allSkills.length > 0 ? allSkills : (await catalogApi.listSkills()).map((s) => s.name);

        if (cancelled) return;

        const selected = new Set(freelancerData.skills.map((s) => s.trim().toLowerCase()));
        const filtered = skills
          .filter((s) => s.toLowerCase().includes(normalizedQuery))
          .filter((s) => !selected.has(s.toLowerCase()))
          .slice(0, 8);

        setSearchResults(filtered);
      } catch {
        if (!cancelled) {
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [allSkills, freelancerData.skills, query]);

  const addSkills = useCallback(
    (raw: string) => {
      const parts = splitSkills(raw);
      if (parts.length === 0) return;

      const existing = new Set(freelancerData.skills.map((s) => s.toLowerCase()));
      const uniqueToAdd = parts.filter((skill) => !existing.has(skill.toLowerCase()));
      if (uniqueToAdd.length === 0) {
        setQuery("");
        return;
      }

      updateFreelancer({ skills: [...freelancerData.skills, ...uniqueToAdd] });
      setQuery("");
    },
    [freelancerData.skills, splitSkills, updateFreelancer],
  );

  const addSkill = useCallback(
    (skill: string) => {
      addSkills(skill);
    },
    [addSkills],
  );

  const removeSkill = useCallback(
    (skill: string) => {
      updateFreelancer({
        skills: freelancerData.skills.filter((s) => s !== skill),
      });
    },
    [freelancerData.skills, updateFreelancer],
  );

  const selectedSkillSet = useMemo(() => new Set(freelancerData.skills.map((skill) => skill.toLowerCase())), [freelancerData.skills]);

  const handleAISuggest = () => {
    suggest({
      name: freelancerData.name,
      experienceYears: freelancerData.experienceYears,
      selectedSkills: freelancerData.skills,
      catalogSkills: allSkills,
    });
  };

  return (
    <motion.div
      className="glass-card rounded-2xl p-6 sm:p-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <h2 className="mb-1 text-2xl font-bold text-[var(--fg-0)]">Ваши навыки</h2>
      <p className="mb-6 text-sm text-[var(--fg-3)]">Выберите навыки из каталога или добавьте свои</p>

      {freelancerData.skills.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {freelancerData.skills.map((skill) => (
            <span key={skill} className="filka-chip inline-flex items-center gap-1 pr-0.5">
              <span className="text-[var(--mint-200)]">{skill}</span>
              <button
                type="button"
                className="rounded p-0.5 text-[var(--mint-300)] hover:bg-[rgba(102,58,243,0.12)]"
                aria-label={`Удалить ${skill}`}
                onClick={() => removeSkill(skill)}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <FilkaField label="Поиск навыков">
          <div className="flex gap-2">
            <FilkaInput
              className="flex-1"
              placeholder="React, TypeScript..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && query.trim()) {
                  e.preventDefault();
                  addSkills(query);
                }
              }}
            />
            <FilkaButton
              size="sm"
              variant="soft"
              className="h-10 min-w-10 shrink-0 px-0"
              disabled={!query.trim()}
              onClick={() => addSkills(query)}
              aria-label="Добавить"
            >
              <Plus size={14} />
            </FilkaButton>
          </div>
        </FilkaField>
        {isSearching && query.trim().length > 0 && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-[var(--line)] bg-[var(--bg-2)] p-3 text-sm text-[var(--fg-2)]">
            Ищем навыки...
          </div>
        )}
        {searchResults.length > 0 && !isSearching && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--bg-2)] p-2">
            {searchResults.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => addSkill(skill)}
                className="w-full rounded-lg px-3 py-1.5 text-left text-sm text-[var(--fg-1)] hover:bg-[rgba(102,58,243,0.1)] hover:text-[var(--mint-200)]"
              >
                {skill}
              </button>
            ))}
          </div>
        )}
      </div>

      <FilkaButton variant="soft" size="sm" className="mt-4" loading={isStreaming} startContent={<Sparkles size={14} />} onClick={handleAISuggest}>
        Подобрать с ИИ
      </FilkaButton>

      {suggestedSkills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestedSkills
            .filter((s) => !selectedSkillSet.has(s.toLowerCase()))
            .map((skill) => (
              <button key={skill} type="button" onClick={() => addSkill(skill)}>
                <FilkaChip className="cursor-pointer border border-[rgba(102,58,243,0.25)] hover:bg-[rgba(102,58,243,0.1)]">+ {skill}</FilkaChip>
              </button>
            ))}
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <FilkaButton variant="ghost" startContent={<ArrowLeft size={16} />} onClick={prevStep}>
          Назад
        </FilkaButton>
        <FilkaButton variant="primary" endContent={<ArrowRight size={16} />} disabled={freelancerData.skills.length === 0} onClick={nextStep}>
          Далее
        </FilkaButton>
      </div>
    </motion.div>
  );
};
