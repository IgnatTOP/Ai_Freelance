"use client";

import { motion } from "framer-motion";
import { Button, Chip, Input } from "@heroui/react";
import { ArrowLeft, ArrowRight, Plus, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOnboardingStore } from "@/features/onboarding/model";
import { useAISuggestSkills } from "@/features/onboarding/hooks/useAISuggestSkills";
import { catalogApi } from "@/shared/api/endpoints/catalog";

export const StepSkills = () => {
  const { freelancerData, updateFreelancer, nextStep, prevStep } =
    useOnboardingStore();
  const { suggestedSkills, isStreaming, suggest } = useAISuggestSkills();
  const [query, setQuery] = useState("");
  const [allSkills, setAllSkills] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    catalogApi.listSkills().then((skills) => {
      setAllSkills(skills.map((s) => s.name));
    }).catch(() => {});
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
        const skills =
          allSkills.length > 0
            ? allSkills
            : (await catalogApi.listSkills()).map((s) => s.name);

        if (cancelled) return;

        const selected = new Set(
          freelancerData.skills.map((s) => s.trim().toLowerCase())
        );
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
    [freelancerData.skills, splitSkills, updateFreelancer]
  );

  const addSkill = useCallback(
    (skill: string) => {
      addSkills(skill);
    },
    [addSkills]
  );

  const removeSkill = useCallback(
    (skill: string) => {
      updateFreelancer({
        skills: freelancerData.skills.filter((s) => s !== skill),
      });
    },
    [freelancerData.skills, updateFreelancer]
  );

  const selectedSkillSet = useMemo(
    () => new Set(freelancerData.skills.map((skill) => skill.toLowerCase())),
    [freelancerData.skills]
  );

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
      <h2 className="mb-1 text-2xl font-bold text-zinc-100">Ваши навыки</h2>
      <p className="mb-6 text-sm text-zinc-500">
        Выберите навыки из каталога или добавьте свои
      </p>

      {/* Selected skills */}
      {freelancerData.skills.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {freelancerData.skills.map((skill) => (
            <Chip
              key={skill}
              variant="flat"
              color="secondary"
              onClose={() => removeSkill(skill)}
              endContent={<X size={12} />}
            >
              {skill}
            </Chip>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Input
          label="Поиск навыков"
          placeholder="React, TypeScript..."
          value={query}
          onValueChange={setQuery}
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim()) {
              e.preventDefault();
              addSkills(query);
            }
          }}
          variant="bordered"
          classNames={{ inputWrapper: "border-zinc-700 hover:border-emerald-500/50" }}
          endContent={
            <Button
              size="sm"
              color="secondary"
              variant="flat"
              isIconOnly
              isDisabled={!query.trim()}
              onPress={() => addSkills(query)}
              className="min-w-8 h-8"
            >
              <Plus size={14} />
            </Button>
          }
        />
        {isSearching && query.trim().length > 0 && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-400">
            Ищем навыки...
          </div>
        )}
        {searchResults.length > 0 && !isSearching && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-2">
            {searchResults.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => addSkill(skill)}
                className="w-full rounded-lg px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-emerald-500/10 hover:text-emerald-300"
              >
                {skill}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* AI suggest */}
      <Button
        variant="flat"
        color="secondary"
        size="sm"
        className="mt-4"
        startContent={<Sparkles size={14} />}
        isLoading={isStreaming}
        onPress={handleAISuggest}
      >
        Подобрать с ИИ
      </Button>

      {suggestedSkills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestedSkills
            .filter((s) => !selectedSkillSet.has(s.toLowerCase()))
            .map((skill) => (
              <Chip
                key={skill}
                variant="bordered"
                className="cursor-pointer border-emerald-500/30 hover:bg-emerald-500/10"
                onClick={() => addSkill(skill)}
              >
                + {skill}
              </Chip>
            ))}
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <Button variant="light" startContent={<ArrowLeft size={16} />} onPress={prevStep}>
          Назад
        </Button>
        <Button
          color="secondary"
          endContent={<ArrowRight size={16} />}
          isDisabled={freelancerData.skills.length === 0}
          onPress={nextStep}
        >
          Далее
        </Button>
      </div>
    </motion.div>
  );
};
