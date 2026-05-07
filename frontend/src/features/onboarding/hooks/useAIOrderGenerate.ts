"use client";

import { useCallback, useRef, useState } from "react";
import { streamAI } from "@/shared/sse/stream";

type GeneratedOrder = {
  title: string;
  description: string;
  category_id: string;
  skills: string[];
  budget_min: number;
  budget_max: number;
  deadline: string;
};

export const useAIOrderGenerate = () => {
  const [streamText, setStreamText] = useState("");
  const [result, setResult] = useState<GeneratedOrder | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const inferTitle = (text: string): string => {
    const trimmed = text.trim();
    if (!trimmed) return "Новый проект";
    const firstLine = trimmed.split("\n").find((line) => line.trim().length > 0) ?? trimmed;
    const clean = firstLine.replace(/\s+/g, " ").trim();
    return clean.length > 70 ? `${clean.slice(0, 67).trimEnd()}...` : clean;
  };

  const extractJSONObject = (raw: string): string => {
    const text = raw.trim();
    if (!text) return "";

    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch?.[1]) return fenceMatch[1].trim();

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) return text.slice(start, end + 1);
    return "";
  };

  const toDateFromDays = (days: unknown): string => {
    const num = typeof days === "number" ? days : Number(days);
    const safeDays = Number.isFinite(num) && num > 0 ? Math.round(num) : 14;
    const date = new Date();
    date.setDate(date.getDate() + safeDays);
    return date.toISOString().slice(0, 10);
  };

  const normalizeGeneratedOrder = (raw: Record<string, unknown>, freeText: string): GeneratedOrder => {
    const title = typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : inferTitle(freeText);
    const description =
      typeof raw.description === "string" && raw.description.trim() ? raw.description.trim() : freeText.trim();
    const skills = Array.isArray(raw.skills) ? raw.skills.filter((s): s is string => typeof s === "string" && s.trim().length > 0) : [];

    const budgetMinRaw = typeof raw.budget_min === "number" ? raw.budget_min : Number(raw.budget_min);
    const budgetMaxRaw = typeof raw.budget_max === "number" ? raw.budget_max : Number(raw.budget_max);
    const budgetMin = Number.isFinite(budgetMinRaw) && budgetMinRaw > 0 ? Math.round(budgetMinRaw) : 40000;
    const budgetMax = Number.isFinite(budgetMaxRaw) && budgetMaxRaw > 0 ? Math.round(budgetMaxRaw) : 50000;

    return {
      title,
      description,
      category_id: typeof raw.category_id === "string" ? raw.category_id : "",
      skills,
      budget_min: Math.min(budgetMin, budgetMax),
      budget_max: budgetMax,
      deadline: toDateFromDays(raw.deadline_days),
    };
  };

  const generate = useCallback(async (freeText: string) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setStreamText("");
    setResult(null);
    setIsStreaming(true);

    let accumulated = "";
    const title = inferTitle(freeText);

    await streamAI(
      "/ai/orders/suggestions/stream",
      { title, description: freeText },
      {
        onChunk: (chunk) => {
          accumulated += chunk;
          setStreamText(accumulated);
        },
        onDone: () => {
          setIsStreaming(false);
          try {
            const jsonRaw = extractJSONObject(accumulated);
            if (jsonRaw) {
              const parsed = JSON.parse(jsonRaw) as Record<string, unknown>;
              setResult(normalizeGeneratedOrder(parsed, freeText));
              return;
            }
            setResult(
              normalizeGeneratedOrder(
                {
                  title,
                  description: freeText,
                },
                freeText
              )
            );
          } catch {
            // Fallback to minimum viable generated order when AI response isn't valid JSON.
            setResult(
              normalizeGeneratedOrder(
                {
                  title,
                  description: freeText,
                },
                freeText
              )
            );
          }
        },
        onError: () => {
          setIsStreaming(false);
          setResult(
            normalizeGeneratedOrder(
              {
                title,
                description: freeText,
              },
              freeText
            )
          );
        },
      },
      controller.signal
    );
  }, []);

  const stop = useCallback(() => {
    controllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return { streamText, result, isStreaming, generate, stop };
};
