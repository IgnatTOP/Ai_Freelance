"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/shared/store/session.store";
import { useOrderWizardStore } from "@/features/order-create-wizard";
import { useCategories, useCreateOrder, usePublishOrder, useSkills } from "@/features/order-management";
import { useAIOrderGenerate } from "@/features/onboarding";
import { useBalance } from "@/features/balance-management";
import {
    InsufficientFundsModal,
    isInsufficientFundsError,
    parseInsufficientFundsError,
} from "@/shared/ui/insufficient-funds-modal/InsufficientFundsModal";
import { formatMoney } from "@/shared/lib/money";
import {
    FilkaAISphere,
    FilkaButton,
    FilkaCard,
    FilkaChip,
    FilkaDatePicker,
    FilkaField,
    FilkaInput,
    FilkaSelect,
    FilkaShimmerRow,
    FilkaSpinner,
    FilkaTagInput,
    FilkaTextarea,
    FilkaTypingDots,
    IconArrowRight,
    IconLightning,
    IconLock,
    IconMic,
    IconPaperclip,
    IconSend,
    IconSpark,
    useFilkaToast,
} from "@/shared/ui/filka";

interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
    ts: number;
}

type DraftPatch = {
    title?: string;
    description?: string;
    category_id?: string;
    skill_tags?: string[];
    budget_min?: number;
    budget_max?: number;
    deadline_at?: string;
};

type CategoryOption = { id: string; name: string };
type SkillOption = { id: string; name: string; category_id?: string };

const dateToIso = (d: Date) => d.toISOString().slice(0, 10);
const isoToDate = (s?: string) => (s ? new Date(s) : null);

const QUICK_REPLIES = [
    "Бюджет — около 80 000 ₽, нужно за 2 недели",
    "Стек: React, Next.js, Tailwind",
    "Готов добавить ТЗ голосом",
];

const calculateProgress = (draft: {
    title?: string;
    description?: string;
    category_id?: string;
    skill_tags?: string[];
    budget_min?: number;
    budget_max?: number;
    deadline_at?: string;
}) => {
    const fields = [
        Boolean(draft.title?.trim()),
        Boolean(draft.description?.trim()),
        Boolean(draft.category_id),
        (draft.skill_tags ?? []).length > 0,
        Boolean(draft.budget_min && draft.budget_min > 0),
        Boolean(draft.budget_max && draft.budget_max > 0),
        Boolean(draft.deadline_at),
    ];
    const filled = fields.filter(Boolean).length;
    return { filled, total: fields.length };
};

const dedupe = (items: string[]) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

const toNumber = (value: string) => Number(value.replace(/\s/g, "").replace(",", "."));

const inferTitle = (text: string): string => {
    const firstUsefulLine = text
        .split("\n")
        .map((line) => line.trim())
        .find((line) => line && !/^(стек|бюджет|срок|дедлайн)\b/i.test(line));
    const source = firstUsefulLine ?? (text.trim() || "Новый проект");
    const clean = source.replace(/\s+/g, " ").trim();
    return clean.length > 86 ? `${clean.slice(0, 83).trimEnd()}...` : clean;
};

const inferBudget = (text: string): Pick<DraftPatch, "budget_min" | "budget_max"> => {
    const budgetLine = text.match(/(?:бюджет|стоимость|цена)[^\d]{0,24}(\d[\d\s]*(?:[.,]\d+)?)(?:\s*(?:-|–|—|до)\s*(\d[\d\s]*(?:[.,]\d+)?))?/i);
    const rubLine = budgetLine ?? text.match(/(\d[\d\s]*(?:[.,]\d+)?)\s*(?:₽|руб|р\b)/i);
    if (!rubLine?.[1]) return {};

    const first = Math.round(toNumber(rubLine[1]));
    const second = rubLine[2] ? Math.round(toNumber(rubLine[2])) : first;
    if (!Number.isFinite(first) || first <= 0 || !Number.isFinite(second) || second <= 0) return {};
    return { budget_min: Math.min(first, second), budget_max: Math.max(first, second) };
};

const inferDeadline = (text: string): Pick<DraftPatch, "deadline_at"> => {
    const weeks = text.match(/(\d+)\s*(?:недел[яиь]?|недели|недель)/i);
    const days = weeks ? Number(weeks[1]) * 7 : Number(text.match(/(\d+)\s*(?:дн\.?|день|дня|дней)/i)?.[1]);
    if (!Number.isFinite(days) || days <= 0) return {};

    const date = new Date();
    date.setDate(date.getDate() + Math.round(days));
    return { deadline_at: dateToIso(date) };
};

const inferSkills = (text: string, skills: SkillOption[] = []): string[] => {
    const found = new Set<string>();
    const lowerText = text.toLowerCase();

    for (const skill of skills) {
        if (skill.name && lowerText.includes(skill.name.toLowerCase())) {
            found.add(skill.name);
        }
    }

    const stack = text.match(/(?:стек|технологии|навыки)\s*[:—-]\s*([^\n.]+)/i)?.[1];
    if (stack) {
        for (const item of stack.split(/[,;/+]/)) {
            const value = item.trim();
            if (value) found.add(value);
        }
    }

    return dedupe([...found]);
};

const inferCategoryId = (
    preferredId: string | undefined,
    selectedSkills: string[],
    categories: CategoryOption[] = [],
    skills: SkillOption[] = [],
): string | undefined => {
    if (preferredId && categories.some((category) => category.id === preferredId)) return preferredId;

    const scoreByCategory = new Map<string, number>();
    for (const skillName of selectedSkills) {
        const skill = skills.find((candidate) => candidate.name.toLowerCase() === skillName.toLowerCase());
        if (skill?.category_id) {
            scoreByCategory.set(skill.category_id, (scoreByCategory.get(skill.category_id) ?? 0) + 1);
        }
    }

    const best = [...scoreByCategory.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (best && categories.some((category) => category.id === best)) return best;

    return categories[0]?.id;
};

const inferDraftFromText = (
    text: string,
    categories: CategoryOption[] = [],
    skills: SkillOption[] = [],
): DraftPatch => {
    const skillTags = inferSkills(text, skills);
    const categoryId = inferCategoryId(undefined, skillTags, categories, skills);
    const patch: DraftPatch = {
        title: inferTitle(text),
        description: text.trim(),
        skill_tags: skillTags,
        ...inferBudget(text),
        ...inferDeadline(text),
    };
    if (categoryId) patch.category_id = categoryId;
    return patch;
};

export const OrderCreatePage = () => {
    const router = useRouter();
    const role = useSessionStore((s) => s.role);
    const { draft, patchDraft, reset } = useOrderWizardStore();
    const { data: balance } = useBalance();
    const { data: categories } = useCategories();
    const { data: skills } = useSkills();
    const create = useCreateOrder();
    const publish = usePublishOrder();
    const { result: generatedOrder, isStreaming, generate, stop } = useAIOrderGenerate();
    const toast = useFilkaToast();
    const lastPromptRef = useRef("");

    const [chatInput, setChatInput] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: "assistant",
            ts: Date.now(),
            content:
                "Привет! Я помогу превратить идею в техническое задание. Расскажите, что нужно сделать — стек, бюджет, дедлайн. Можно сразу всё одним сообщением.",
        },
    ]);
    const [insufficientOpen, setInsufficientOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (!generatedOrder) return;

        const promptFallback = inferDraftFromText(lastPromptRef.current, categories, skills);
        const mergedSkills = dedupe([...(generatedOrder.skills ?? []), ...(promptFallback.skill_tags ?? [])]);
        const generatedPatch: DraftPatch = { skill_tags: mergedSkills };
        const title = generatedOrder.title || promptFallback.title;
        const description = generatedOrder.description || promptFallback.description;
        const categoryId = inferCategoryId(generatedOrder.category_id, mergedSkills, categories, skills);
        const budgetMin = generatedOrder.budget_min || promptFallback.budget_min;
        const budgetMax = generatedOrder.budget_max || promptFallback.budget_max;
        const deadlineAt = generatedOrder.deadline || promptFallback.deadline_at;

        if (title) generatedPatch.title = title;
        if (description) generatedPatch.description = description;
        if (categoryId) generatedPatch.category_id = categoryId;
        if (budgetMin) generatedPatch.budget_min = budgetMin;
        if (budgetMax) generatedPatch.budget_max = budgetMax;
        if (deadlineAt) generatedPatch.deadline_at = deadlineAt;
        patchDraft(generatedPatch);

        setMessages((prev) => {
            const message = `Заполнил черновик: заголовок, описание, ${mergedSkills.length ? "навыки, " : ""}бюджет и срок. Проверьте поля справа перед публикацией.`;
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && last.ts === -1) {
                return [...prev.slice(0, -1), { ...last, content: message, ts: Date.now() }];
            }
            return [...prev, { role: "assistant", content: message, ts: Date.now() }];
        });
    }, [categories, generatedOrder, patchDraft, skills]);

    const handleSendMessage = async (text?: string) => {
        const prompt = text ?? chatInput.trim();
        if (!prompt) return;
        lastPromptRef.current = prompt;
        const fallback = inferDraftFromText(prompt, categories, skills);
        patchDraft(fallback);
        setMessages((prev) => [
            ...prev,
            { role: "user", content: prompt, ts: Date.now() },
            { role: "assistant", content: "Собираю черновик заказа и заполняю поля справа...", ts: -1 },
        ]);
        setChatInput("");
        await generate(prompt);
    };

    const progress = useMemo(() => calculateProgress(draft), [draft]);
    const requiredAmount = (draft.budget_max ?? draft.budget_min ?? 0) || 0;
    const available = balance?.available ?? 0;

    const canPublish =
        Boolean(draft.title?.trim()) &&
        Boolean(draft.description?.trim()) &&
        Boolean(draft.category_id) &&
        (draft.skill_tags?.length ?? 0) > 0 &&
        (draft.budget_min ?? 0) > 0 &&
        (draft.budget_max ?? 0) > 0 &&
        Boolean(draft.deadline_at);

    const handlePublish = async (skipBalanceCheck = false) => {
        if (!canPublish) {
            toast.warn("Заполните все поля", "Заголовок, описание, категория, бюджет, навыки и срок");
            return;
        }
        if (!skipBalanceCheck && requiredAmount > available) {
            setInsufficientOpen(true);
            return;
        }
        try {
            const order = await create.mutateAsync({
                title: draft.title!,
                description: draft.description!,
                category: draft.category_id ?? "",
                skill_tags: draft.skill_tags ?? [],
                budget_min: draft.budget_min ?? 0,
                budget_max: draft.budget_max ?? 0,
                deadline: draft.deadline_at ?? "",
            });
            await publish.mutateAsync(order.id);
            toast.success("Заказ опубликован");
            reset();
            router.replace(`/dashboard/orders/${order.id}` as never);
        } catch (e) {
            if (isInsufficientFundsError(e)) {
                const parsed = parseInsufficientFundsError(e instanceof Error ? e.message : "");
                setInsufficientOpen(true);
                if (parsed) {
                    toast.warn("Нужно пополнить баланс", `Не хватает ${formatMoney(parsed.required - parsed.available)}`);
                }
                return;
            }
            toast.error(
                "Не удалось опубликовать заказ",
                e instanceof Error ? e.message : "Попробуйте позже",
            );
        }
    };

    const handleSaveDraft = async () => {
        if (!canPublish) {
            toast.warn("Черновик пока неполный", "Заполните обязательные поля, чтобы сохранить его на сервере");
            return;
        }
        try {
            const order = await create.mutateAsync({
                title: draft.title,
                description: draft.description ?? "",
                category: draft.category_id ?? "",
                skill_tags: draft.skill_tags ?? [],
                budget_min: draft.budget_min ?? 0,
                budget_max: draft.budget_max ?? 0,
                deadline: draft.deadline_at ?? "",
            });
            toast.success("Черновик сохранён");
            reset();
            router.replace(`/dashboard/orders/${order.id}` as never);
        } catch (e) {
            toast.error("Не удалось сохранить", e instanceof Error ? e.message : undefined);
        }
    };

    if (role && role !== "client") {
        return (
            <FilkaCard className="p-8 text-center">
                <IconLock size={28} className="mx-auto mb-3 text-[var(--fg-3)]" />
                <h2 className="t-h3 mb-2">Создание заказов доступно заказчикам</h2>
                <p className="t-body-sm" style={{ color: "var(--fg-2)" }}>
                    Перейдите на страницу профиля и измените роль, чтобы публиковать заказы.
                </p>
            </FilkaCard>
        );
    }

    return (
        <div className="grid gap-5 xl:grid-cols-2">
            <FilkaCard className="flex flex-col overflow-hidden p-0" style={{ minHeight: 640 }}>
                <header
                    className="flex items-center gap-3 border-b px-5 py-4"
                    style={{ borderColor: "var(--line)" }}
                >
                    <FilkaAISphere size={42} speaking={isStreaming} />
                    <div>
                        <div className="text-sm font-semibold">Филка · AI-ассистент</div>
                        <div className="t-caption flex items-center gap-1.5 text-[11px]">
                            {isStreaming ? (
                                <>
                                    <FilkaTypingDots />
                                    собирает техзадание…
                                </>
                            ) : (
                                "слушает вас"
                            )}
                        </div>
                    </div>
                </header>

                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 f-scroll">
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            {msg.role !== "user" ? (
                                <div
                                    className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-md"
                                    style={{ background: "var(--grad-ai-sphere)" }}
                                />
                            ) : null}
                            <div className="max-w-[80%]">
                                <div
                                    className="rounded-[12px] px-3 py-2 text-[13px] leading-relaxed"
                                    style={{
                                        background: msg.role === "user" ? "rgba(52,211,153,0.14)" : "var(--bg-3)",
                                        border:
                                            msg.role === "user"
                                                ? "1px solid rgba(52,211,153,0.22)"
                                                : "1px solid var(--line)",
                                        borderTopLeftRadius: msg.role !== "user" ? 4 : undefined,
                                        borderTopRightRadius: msg.role === "user" ? 4 : undefined,
                                    }}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="border-t p-3" style={{ borderColor: "var(--line)" }}>
                    <div className="mb-2 flex flex-wrap gap-1.5">
                        {QUICK_REPLIES.map((q) => (
                            <button
                                key={q}
                                type="button"
                                onClick={() => void handleSendMessage(q)}
                                className="filka-chip filka-chip-muted cursor-pointer"
                                disabled={isStreaming}
                            >
                                <IconSpark size={11} />
                                {q}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-end gap-2">
                        <button
                            type="button"
                            className="grid h-10 w-10 place-items-center rounded-[var(--r-md)] border"
                            style={{ background: "var(--bg-1)", borderColor: "var(--line-2)", color: "var(--fg-2)" }}
                            aria-label="Прикрепить"
                            disabled
                        >
                            <IconPaperclip size={16} />
                        </button>
                        <textarea
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    void handleSendMessage();
                                }
                            }}
                            placeholder="Ответьте AI-ассистенту…"
                            disabled={isStreaming}
                            rows={1}
                            className="filka-textarea flex-1 resize-none"
                            style={{ minHeight: 40, maxHeight: 120 }}
                        />
                        <button
                            type="button"
                            className="grid h-10 w-10 place-items-center rounded-[var(--r-md)] border"
                            style={{ background: "var(--bg-1)", borderColor: "var(--line-2)", color: "var(--fg-2)" }}
                            aria-label="Голос"
                            disabled
                        >
                            <IconMic size={16} />
                        </button>
                        {isStreaming ? (
                            <button
                                type="button"
                                onClick={() => void stop()}
                                className="grid h-10 w-10 place-items-center rounded-[var(--r-md)]"
                                style={{
                                    background: "rgba(248,113,113,0.14)",
                                    border: "1px solid rgba(248,113,113,0.32)",
                                    color: "var(--err)",
                                }}
                                aria-label="Остановить"
                            >
                                <FilkaSpinner size={14} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => void handleSendMessage()}
                                disabled={!chatInput.trim()}
                                className="filka-btn filka-btn-primary"
                                style={{ height: 40, width: 40, padding: 0 }}
                                aria-label="Отправить"
                            >
                                <IconSend size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </FilkaCard>

            <div className="flex flex-col gap-4">
                <FilkaCard className="overflow-hidden p-0" style={{ borderTop: "2px solid var(--mint-400)" }}>
                    <div
                        className="flex items-center gap-3 border-b px-5 py-4"
                        style={{ borderColor: "var(--line)" }}
                    >
                        <div className="flex flex-col gap-0.5">
                            <span className="t-eyebrow">Техзадание · собирается AI</span>
                            <span className="t-caption text-[11px]">черновик заказа в реальном времени</span>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <FilkaChip>
                                <span className="dot-live" />
                                live
                            </FilkaChip>
                            <span className="t-mono text-[11px]" style={{ color: "var(--fg-2)" }}>
                                {progress.filled} из {progress.total} полей
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4 p-5">
                        <FilkaField label="Заголовок">
                            <FilkaInput
                                placeholder="Например: Лендинг на Next.js с анимациями"
                                value={draft.title ?? ""}
                                onChange={(e) => patchDraft({ title: e.target.value })}
                            />
                        </FilkaField>

                        <FilkaField label="Описание задачи">
                            <FilkaTextarea
                                placeholder="Опишите задачу подробно: цели, требования, желаемый результат…"
                                value={draft.description ?? ""}
                                onChange={(e) => patchDraft({ description: e.target.value })}
                                rows={6}
                            />
                            {isStreaming ? (
                                <div className="mt-2">
                                    <FilkaShimmerRow style={{ height: 8 }} />
                                </div>
                            ) : null}
                        </FilkaField>

                        <div className="grid grid-cols-2 gap-3">
                            <FilkaField label="Категория">
                                <FilkaSelect
                                    options={(categories ?? []).map((c) => ({
                                        value: c.id,
                                        label: c.name,
                                    }))}
                                    value={draft.category_id ?? null}
                                    onChange={(val) => patchDraft({ category_id: val ?? "" })}
                                    placeholder="Выберите категорию"
                                    searchable
                                />
                            </FilkaField>
                            <FilkaField label="Срок">
                                <FilkaDatePicker
                                    value={isoToDate(draft.deadline_at)}
                                    onChange={(d) => patchDraft({ deadline_at: dateToIso(d) })}
                                    minDate={new Date()}
                                />
                            </FilkaField>
                        </div>

                        <FilkaField label="Навыки и стек">
                            <FilkaTagInput
                                value={draft.skill_tags ?? []}
                                onChange={(tags) => patchDraft({ skill_tags: tags })}
                                suggestions={(skills ?? []).map((s) => s.name)}
                                placeholder="Например: React, Next.js, Tailwind"
                                maxTags={12}
                            />
                        </FilkaField>

                        <div className="grid grid-cols-2 gap-3">
                            <FilkaField label="Бюджет от, ₽">
                                <FilkaInput
                                    type="number"
                                    inputMode="numeric"
                                    placeholder="68 000"
                                    value={draft.budget_min ?? ""}
                                    onChange={(e) =>
                                        patchDraft({ budget_min: Number(e.target.value) || 0 })
                                    }
                                />
                            </FilkaField>
                            <FilkaField label="Бюджет до, ₽">
                                <FilkaInput
                                    type="number"
                                    inputMode="numeric"
                                    placeholder="92 000"
                                    value={draft.budget_max ?? ""}
                                    onChange={(e) =>
                                        patchDraft({ budget_max: Number(e.target.value) || 0 })
                                    }
                                />
                            </FilkaField>
                        </div>
                        {(draft.budget_min ?? 0) > 0 && (draft.budget_max ?? 0) > 0 ? (
                            <div className="rounded-[var(--r-md)] border p-3 text-[13px]" style={{ background: "var(--bg-1)", borderColor: "var(--line)" }}>
                                <div className="flex items-center gap-2">
                                    <IconLightning size={14} className="text-[var(--mint-300)]" />
                                    <span className="t-eyebrow">AI оценил рынок</span>
                                </div>
                                <div className="mt-1.5">
                                    Ваш диапазон <strong>{formatMoney(draft.budget_min ?? 0)} – {formatMoney(draft.budget_max ?? 0)}</strong> укладывается в среднюю рыночную оценку.
                                </div>
                            </div>
                        ) : null}
                    </div>
                </FilkaCard>

                <FilkaCard className="flex flex-wrap items-center gap-3 p-4">
                    <div className="flex flex-1 items-center gap-3">
                        <IconLock size={16} className="text-[var(--mint-300)]" />
                        <div className="text-[13px]">
                            На балансе: <strong>{formatMoney(available)}</strong>
                            {requiredAmount > 0 ? (
                                <>
                                    {" "}· потребуется: <strong>{formatMoney(requiredAmount)}</strong>
                                </>
                            ) : null}
                        </div>
                    </div>
                    <FilkaButton variant="ghost" onClick={handleSaveDraft} loading={create.isPending}>
                        Сохранить черновик
                    </FilkaButton>
                    <FilkaButton
                        variant="primary"
                        onClick={() => void handlePublish()}
                        loading={create.isPending || publish.isPending}
                        disabled={!canPublish}
                        endContent={<IconArrowRight size={14} />}
                    >
                        Опубликовать и пополнить эскроу
                    </FilkaButton>
                </FilkaCard>
            </div>

            <InsufficientFundsModal
                isOpen={insufficientOpen}
                onClose={() => setInsufficientOpen(false)}
                availableBalance={available}
                requiredAmount={requiredAmount}
                onDepositSuccess={() => {
                    setInsufficientOpen(false);
                    void handlePublish(true);
                }}
            />
        </div>
    );
};
