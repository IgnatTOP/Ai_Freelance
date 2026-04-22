"use client";

import { useCallback, useState } from "react";
import { apiClient } from "@/shared/api/client";

type SuggestSkillsParams = {
  name: string;
  experienceYears: string;
  selectedSkills: string[];
  catalogSkills: string[];
};

const normalize = (value: string) => value.trim().toLowerCase();

const tokenize = (value: string): string[] =>
  (value.toLowerCase().match(/[a-zа-я0-9+#.-]+/gi) ?? []).filter(Boolean);

const calcRelevance = (skill: string, anchors: string[]) => {
  if (anchors.length === 0) return 0;
  const skillTokens = tokenize(skill);
  if (skillTokens.length === 0) return 0;

  const anchorTokens = new Set(anchors.flatMap((anchor) => tokenize(anchor)));
  let score = 0;
  for (const token of skillTokens) {
    if (anchorTokens.has(token)) score += 3;
  }

  const skillNormalized = normalize(skill);
  for (const anchor of anchors) {
    const anchorNormalized = normalize(anchor);
    if (!anchorNormalized) continue;
    if (skillNormalized.includes(anchorNormalized) || anchorNormalized.includes(skillNormalized)) {
      score += 2;
    }
  }
  return score;
};

export const useAISuggestSkills = () => {
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const suggest = useCallback(async ({
    name,
    experienceYears,
    selectedSkills,
    catalogSkills,
  }: SuggestSkillsParams) => {
    setSuggestedSkills([]);
    setIsStreaming(true);

    const selected = selectedSkills.filter(Boolean);
    const catalog = Array.from(
      new Set(catalogSkills.map((skill) => skill.trim()).filter(Boolean))
    );
    const selectedSetForFallback = new Set(selected.map(normalize));
    const localFallback = (anchors: string[]) =>
      catalog
        .filter((skill) => !selectedSetForFallback.has(normalize(skill)))
        .map((skill) => ({ skill, score: calcRelevance(skill, anchors) }))
        .sort((a, b) => b.score - a.score || a.skill.localeCompare(b.skill))
        .map((entry) => entry.skill)
        .slice(0, 12);

    try {

      const prompt = `Предложи 12 профессиональных навыков для фрилансера.
Имя: ${name || "Специалист"}
Опыт: ${experienceYears || "не указан"} лет.
Уже выбраны навыки: ${selected.length ? selected.join(", ") : "пока нет"}.
Разрешено использовать только навыки из каталога: ${catalog.join(", ")}.
Если навыки уже выбраны, подбери смежные и углубляющие навыки только в том же профессиональном направлении.
Исключи общие и несвязанные навыки из других сфер.
Ответь только JSON-массивом строк, без комментариев.`;

      const data = await apiClient.request<{ response?: string; data?: { response?: string } }>("/ai/assistant", {
        method: "POST",
        body: JSON.stringify({ message: prompt }),
      });

      const raw = (data.response ?? data.data?.response ?? "").trim();
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      const byCatalog = new Map(catalog.map((skill) => [normalize(skill), skill]));
      const selectedSet = new Set(selected.map(normalize));
      const anchors = selected.length > 0 ? selected : [name];

      const normalizeRaw = (items: string[]) =>
        Array.from(
          new Set(
            items
              .map((item) => item.trim())
              .filter(Boolean)
              .filter((item) => !selectedSet.has(normalize(item)))
          )
        ).slice(0, 12);

      const resolveCatalogSkill = (item: string) => {
        const key = normalize(item);
        const exact = byCatalog.get(key);
        if (exact) return exact;
        if (catalog.length === 0) return null;

        const itemTokens = new Set(tokenize(item));
        if (itemTokens.size === 0) return null;

        let best: { skill: string; score: number } | null = null;
        for (const skill of catalog) {
          const skillTokens = tokenize(skill);
          if (skillTokens.length === 0) continue;
          const overlap = skillTokens.filter((token) => itemTokens.has(token)).length;
          if (overlap === 0) continue;
          const ratio = overlap / Math.max(skillTokens.length, itemTokens.size);
          if (!best || ratio > best.score) best = { skill, score: ratio };
        }
        return best && best.score >= 0.5 ? best.skill : null;
      };

      const normalizeToCatalog = (items: string[]) => {
        if (catalog.length === 0) return normalizeRaw(items);

        const out: string[] = [];
        const seen = new Set<string>();

        for (const item of items) {
          const key = normalize(item);
          if (!key || selectedSet.has(key)) continue;
          const matched = resolveCatalogSkill(item);
          if (!matched) continue;
          const matchedKey = normalize(matched);
          if (seen.has(matchedKey)) continue;
          seen.add(matchedKey);
          out.push(matched);
        }

        const sorted = out
          .map((skill) => ({ skill, score: calcRelevance(skill, anchors) }))
          .sort((a, b) => b.score - a.score)
          .map((entry) => entry.skill);

        return sorted.slice(0, 12);
      };

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          const normalized = normalizeToCatalog(
            parsed.filter((s): s is string => typeof s === "string")
          );
          if (normalized.length > 0) {
            setSuggestedSkills(normalized);
            return;
          }
        }
      }

      const fallback = raw
        .split(/[,\n;]+/)
        .map((s) => s.replace(/^```(?:json)?/i, "").replace(/```$/i, ""))
        .map((s) => s.replace(/^[-•\d.)\s]+/, "").trim())
        .filter(Boolean);
      const normalizedFallback = normalizeToCatalog(fallback);
      if (normalizedFallback.length > 0) {
        setSuggestedSkills(normalizedFallback);
        return;
      }

      if (catalog.length > 0) {
        const rankedCatalog = localFallback(selected.length > 0 ? selected : [name]);
        setSuggestedSkills(rankedCatalog);
        return;
      }
      setSuggestedSkills(normalizeRaw(fallback));
    } catch {
      if (catalog.length > 0) {
        setSuggestedSkills(localFallback(selected.length > 0 ? selected : [name]));
      } else {
        setSuggestedSkills([]);
      }
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const stop = useCallback(() => {
    setIsStreaming(false);
  }, []);

  return { suggestedSkills, isStreaming, suggest, stop };
};
