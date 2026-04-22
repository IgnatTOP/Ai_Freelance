"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Textarea, Select, SelectItem, Chip, Progress, Autocomplete, AutocompleteItem, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Calendar as HeroCalendar, Card, CardBody } from "@heroui/react";
import { ArrowLeft, ArrowRight, Send, Sparkles, Tag, Type, AlignLeft, LayoutList, CheckCircle2, Wallet, Calendar, Bot, Loader2, Shield, Lock } from "lucide-react";
import { useSessionStore } from "@/shared/store/session.store";
import { apiClient } from "@/shared/api/client";
import { useOrderWizardStore } from "@/features/order-create-wizard";
import { useCreateOrder, usePublishOrder, useCategories, useSkills } from "@/features/order-management";
import { useAIAssistant } from "@/features/ai-assistant";
import { PageHeader } from "@/shared/ui/page-header/PageHeader";
import { getLocalTimeZone, parseDate, today } from "@internationalized/date";

const STEPS = ["Описание", "Категория и навыки", "Бюджет и сроки", "Обзор", "Оплата"];

const TIPS = {
    1: [
        "Используйте понятный и лаконичный заголовок.",
        "Опишите задачу максимально подробно.",
        "Укажите конечный результат, который вы ожидаете получить.",
    ],
    2: [
        "Выберите наиболее подходящую категорию.",
        "Добавьте 3-5 ключевых навыков.",
        "Правильные теги помогут алгоритмам найти лучших фрилансеров.",
    ],
    3: [
        "Указывайте реальный бюджет для привлечения опытных специалистов.",
        "Адекватный дедлайн снижает риски.",
        "Вы всегда сможете обсудить окончательные сроки с исполнителем.",
    ],
    4: [
        "Проверьте все данные перед публикацией.",
        "Вы сможете редактировать заказ после публикации.",
        "Убедитесь, что описание полное и понятное.",
    ],
    5: [
        "Средства будут заморожены на escrow-счёте.",
        "Исполнитель получит оплату только после вашего подтверждения.",
        "Вы можете открыть спор, если работа не выполнена.",
    ],
};

const SkillAutoInput = ({
    selectedKeys,
    skillsList,
    categoryId,
    onSelectionChange
}: {
    selectedKeys: Set<string>,
    skillsList: { id: string, name: string, category_id?: string }[],
    categoryId: string | undefined,
    onSelectionChange: (keys: Set<string>) => void
}) => {
    const [query, setQuery] = useState("");
    const [bulkInput, setBulkInput] = useState("");

    const selectedLower = useMemo(
        () => new Set(Array.from(selectedKeys).map((s) => s.toLowerCase())),
        [selectedKeys]
    );

    const filteredSkills = useMemo(() => {
        const q = query.trim().toLowerCase();
        return skillsList.filter((skill) => {
            if (categoryId && skill.category_id && skill.category_id !== categoryId) return false;
            if (selectedLower.has(skill.name.toLowerCase())) return false;
            if (!q) return true;
            return skill.name.toLowerCase().includes(q);
        });
    }, [categoryId, query, selectedLower, skillsList]);

    const addSkillsFromText = useCallback((raw: string) => {
        const values = raw
            .split(/[,\n;]+/)
            .map((s) => s.trim())
            .filter(Boolean);
        if (values.length === 0) return;

        const catalogByLower = new Map(skillsList.map((s) => [s.name.toLowerCase(), s.name]));
        const next = new Set(selectedKeys);

        values.forEach((value) => {
            const exact = catalogByLower.get(value.toLowerCase());
            next.add(exact ?? value);
        });

        onSelectionChange(next);
    }, [onSelectionChange, selectedKeys, skillsList]);

    return (
        <div className="space-y-3">
            <Autocomplete
                label="Выберите навыки"
                variant="bordered"
                inputValue={query}
                onInputChange={setQuery}
                labelPlacement="outside"
                classNames={{
                    base: "max-w-full",
                    listboxWrapper: "max-h-[320px]",
                    selectorButton: "text-zinc-400",
                }}
                inputProps={{
                    classNames: {
                        inputWrapper: "bg-zinc-900/50 border-zinc-700/50 hover:border-emerald-500/40 focus-within:!border-emerald-500/60",
                        input: "text-zinc-200",
                        label: "text-zinc-400",
                    }
                }}
                popoverProps={{
                    classNames: {
                        content: "bg-zinc-900 border border-zinc-800",
                    }
                }}
                onSelectionChange={(key) => {
                    if (key) {
                        const newKeys = new Set(selectedKeys);
                        newKeys.add(String(key));
                        onSelectionChange(newKeys);
                        setQuery("");
                    }
                }}
            >
                {filteredSkills.map((skill) => (
                    <AutocompleteItem key={skill.name} textValue={skill.name} className="text-zinc-200 data-[hover=true]:bg-emerald-500/20 data-[hover=true]:text-emerald-300">
                        {skill.name}
                    </AutocompleteItem>
                ))}
            </Autocomplete>
            <div className="flex gap-2">
                <Input
                    value={bulkInput}
                    onValueChange={setBulkInput}
                    placeholder="Быстро добавить: React, TypeScript, Next.js"
                    variant="bordered"
                    size="sm"
                    classNames={{ inputWrapper: "bg-zinc-900/50 border-zinc-700/50 hover:border-emerald-500/40" }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && bulkInput.trim()) {
                            e.preventDefault();
                            addSkillsFromText(bulkInput);
                            setBulkInput("");
                        }
                    }}
                />
                <Button
                    size="sm"
                    variant="flat"
                    className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                    isDisabled={!bulkInput.trim()}
                    onPress={() => {
                        addSkillsFromText(bulkInput);
                        setBulkInput("");
                    }}
                >
                    Добавить
                </Button>
            </div>
            {filteredSkills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {filteredSkills.slice(0, 8).map((skill) => (
                        <button
                            key={skill.id}
                            type="button"
                            onClick={() => {
                                const next = new Set(selectedKeys);
                                next.add(skill.name);
                                onSelectionChange(next);
                            }}
                            className="rounded-full border border-zinc-700/70 bg-zinc-900/60 px-2.5 py-1 text-xs text-zinc-300 hover:border-emerald-500/40 hover:text-emerald-300"
                        >
                            + {skill.name}
                        </button>
                    ))}
                </div>
            )}
            {selectedKeys.size > 0 && (
                <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-zinc-500">Выбрано навыков: {selectedKeys.size}</p>
                        <button
                            type="button"
                            className="text-xs text-zinc-500 hover:text-zinc-300"
                            onClick={() => onSelectionChange(new Set())}
                        >
                            Очистить все
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {Array.from(selectedKeys).map((s) => (
                            <Chip
                                key={s}
                                onClose={() => {
                                    const newKeys = new Set(selectedKeys);
                                    newKeys.delete(s);
                                    onSelectionChange(newKeys);
                                }}
                                variant="flat"
                                classNames={{ base: "bg-emerald-500/10 border border-emerald-500/20", content: "text-emerald-300", closeButton: "text-emerald-400 hover:text-emerald-200" }}
                            >
                                {s}
                            </Chip>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export const OrderCreatePage = () => {
    const router = useRouter();
    const role = useSessionStore((s) => s.role);
    const { step, draft, setStep, patchDraft, reset } = useOrderWizardStore();
    const createOrder = useCreateOrder();
    const publishOrder = usePublishOrder();
    const aiAssistant = useAIAssistant();
    const aiModal = useDisclosure();
    const [aiGenerated, setAiGenerated] = useState("");
    const [isAutoClassifying, setIsAutoClassifying] = useState(false);
    const [autoClassifyMessage, setAutoClassifyMessage] = useState("");
    const [autoClassifyError, setAutoClassifyError] = useState("");
    const [aiBudgetSuggestion, setAiBudgetSuggestion] = useState<{ min: number | undefined; max: number | undefined } | null>(null);
    const [isAiBudgetLoading, setIsAiBudgetLoading] = useState(false);
    const [aiBudgetError, setAiBudgetError] = useState("");

    // Server data
    const { data: categoriesData, isLoading: catLoading } = useCategories();
    const { data: skillsData, isLoading: skillsLoading } = useSkills();

    const categories = categoriesData ?? [];
    const skillsList = skillsData ?? [];

    const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set(draft.skill_tags));

    useEffect(() => {
        if (role === "freelancer") {
            router.replace("/dashboard/orders");
        }
    }, [role, router]);

    useEffect(() => {
        patchDraft({ skill_tags: Array.from(selectedSkills) });
    }, [selectedSkills, patchDraft]);

    useEffect(() => {
        return () => { reset(); };
    }, [reset]);

    // Track AI streaming into local state
    useEffect(() => {
        if (aiAssistant.text && aiModal.isOpen) {
            setAiGenerated(aiAssistant.text);
        }
    }, [aiAssistant.text, aiModal.isOpen]);

    const handleAIGenerate = useCallback(async () => {
        if (!draft.title.trim()) return;
        setAiGenerated("");
        aiModal.onOpen();
        await aiAssistant.start(
            `Сгенерируй ТОЛЬКО текст описания (без заголовка, без слова "Описание:", без маркдаун-заголовков) для заказа на фриланс-бирже.

Заголовок заказа: "${draft.title}"
${draft.description.trim() ? `Текущий черновик описания: "${draft.description.trim()}"` : ""}

Требования к результату:
- Пиши на русском языке
- 3-5 абзацев чистого текста описания
- Включи: суть задачи, требования к исполнителю, ожидаемый результат и критерии приёмки
- НЕ повторяй заголовок заказа в начале текста
- НЕ добавляй заголовки секций, маркеры или нумерацию
- Начинай сразу с описания задачи`
        );
    }, [draft.title, draft.description, aiAssistant, aiModal]);

    const handleApplyAI = () => {
        if (aiGenerated) {
            patchDraft({ description: aiGenerated });
        }
        aiModal.onClose();
    };

    const handleAutoClassify = useCallback(async () => {
        if (!draft.title.trim() || !draft.description.trim()) return;
        setIsAutoClassifying(true);
        setAutoClassifyMessage("");
        setAutoClassifyError("");
        try {
            const result = await apiClient.request<Record<string, unknown>>("/ai/orders/suggestions", {
                method: "POST",
                body: JSON.stringify({
                    title: draft.title.trim(),
                    description: draft.description.trim(),
                }),
            });

            const toStr = (value: unknown) => (typeof value === "string" ? value.trim() : "");
            const aiSkills = Array.isArray(result.skills)
                ? result.skills.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
                : [];

            const categoryHint = [
                toStr(result.category_slug),
                toStr(result.category),
                toStr(result.category_name),
                toStr(result.category_id),
            ].find(Boolean);

            const normalize = (value: string) => value.trim().toLowerCase();
            let matchedCategory = categories.find((c) => normalize(c.slug) === normalize(categoryHint ?? ""));
            if (!matchedCategory && categoryHint) {
                matchedCategory = categories.find((c) => normalize(c.name) === normalize(categoryHint));
            }
            if (!matchedCategory && categoryHint) {
                matchedCategory = categories.find(
                    (c) => normalize(c.name).includes(normalize(categoryHint)) || normalize(categoryHint).includes(normalize(c.name))
                );
            }
            const skillCatalogByLower = new Map(skillsList.map((s) => [normalize(s.name), s]));
            const nextSkills = new Set(selectedSkills);
            const categoryVotes = new Map<string, number>();
            aiSkills.forEach((skill) => {
                const exact = skillCatalogByLower.get(normalize(skill));
                if (exact) {
                    nextSkills.add(exact.name);
                    if (exact.category_id) {
                        categoryVotes.set(exact.category_id, (categoryVotes.get(exact.category_id) ?? 0) + 2);
                    }
                    return;
                }
                const fuzzy = skillsList.find(
                    (catalogSkill) =>
                        normalize(catalogSkill.name).includes(normalize(skill)) ||
                        normalize(skill).includes(normalize(catalogSkill.name))
                );
                if (fuzzy) {
                    nextSkills.add(fuzzy.name);
                    if (fuzzy.category_id) {
                        categoryVotes.set(fuzzy.category_id, (categoryVotes.get(fuzzy.category_id) ?? 0) + 1);
                    }
                    return;
                }
                nextSkills.add(skill);
            });

            if (!matchedCategory && categoryVotes.size > 0) {
                const bestCategoryID = [...categoryVotes.entries()]
                    .sort((a, b) => b[1] - a[1])[0]?.[0];
                if (bestCategoryID) {
                    matchedCategory = categories.find((c) => c.id === bestCategoryID);
                }
            }

            if (matchedCategory) {
                patchDraft({ category_id: matchedCategory.id });
            }

            if (nextSkills.size > 0) {
                setSelectedSkills(nextSkills);
            }

            const parts: string[] = [];
            if (matchedCategory) parts.push(`категория: ${matchedCategory.name}`);
            if (aiSkills.length > 0) parts.push(`навыков: ${Math.min(aiSkills.length, nextSkills.size)}`);
            setAutoClassifyMessage(parts.length > 0 ? `ИИ определил ${parts.join(", ")}.` : "ИИ не нашёл уверенных совпадений.");
        } catch {
            setAutoClassifyError("Не удалось определить категорию и навыки автоматически.");
        } finally {
            setIsAutoClassifying(false);
        }
    }, [categories, draft.description, draft.title, patchDraft, selectedSkills, skillsList]);

    const handlePublish = async () => {
        const order = await createOrder.mutateAsync({
            title: draft.title,
            description: draft.description,
            category: draft.category_id ?? "other",
            skill_tags: draft.skill_tags,
            budget_min: draft.budget_min ?? 0,
            budget_max: draft.budget_max ?? 0,
            deadline: draft.deadline_at ?? "",
        });
        // TODO: integrate real escrow freeze via paymentsApi.escrow when backend is ready
        await publishOrder.mutateAsync(order.id);
        reset();
        router.push(`/dashboard/orders/${order.id}` as never);
    };

    const handleAIBudgetSuggest = useCallback(async () => {
        if (!draft.title.trim()) return;
        setIsAiBudgetLoading(true);
        setAiBudgetError("");
        try {
            const data = await apiClient.request<Record<string, unknown>>("/ai/orders/budget", {
                method: "POST",
                body: JSON.stringify({
                    title: draft.title.trim(),
                    description: draft.description.trim(),
                }),
            });

            const toNumber = (value: unknown) => {
                const num = typeof value === "number" ? value : Number(value);
                return Number.isFinite(num) && num > 0 ? Math.round(num) : undefined;
            };

            const min = toNumber(data.budget_min);
            const max = toNumber(data.budget_max);
            const deadlineDays = toNumber(data.deadline_days);
            setAiBudgetSuggestion({ min, max });

            const patch: Record<string, unknown> = {};
            if (min) {
                patch.budget_min = min;
            }
            if (max) {
                patch.budget_max = max;
            } else if (min) {
                patch.budget_max = min;
            }
            if (deadlineDays && !draft.deadline_at) {
                const deadline = new Date();
                deadline.setDate(deadline.getDate() + deadlineDays);
                patch.deadline_at = deadline.toISOString().slice(0, 10);
            }
            if (Object.keys(patch).length > 0) {
                patchDraft(patch as Parameters<typeof patchDraft>[0]);
            }
        } catch {
            setAiBudgetError("Не удалось получить рекомендацию бюджета от ИИ.");
        } finally {
            setIsAiBudgetLoading(false);
        }
    }, [draft.description, draft.title, patchDraft]);

    if (role === "freelancer") return null;

    const inputClasses = {
        inputWrapper: "bg-zinc-900/50 border-zinc-700/50 hover:border-emerald-500/40 group-data-[focus=true]:border-emerald-500/60 shadow-sm",
        label: "text-zinc-400",
        input: "text-zinc-200",
    };

    const budgetMin = draft.budget_min ?? 0;
    const budgetMax = draft.budget_max ?? 0;
    const formatBudgetRange = () => {
        if (budgetMin > 0 && budgetMax > 0) {
            if (budgetMin === budgetMax) {
                return `₽${budgetMax.toLocaleString("ru-RU")}`;
            }
            return `₽${budgetMin.toLocaleString("ru-RU")} - ₽${budgetMax.toLocaleString("ru-RU")}`;
        }
        if (budgetMax > 0) {
            return `до ₽${budgetMax.toLocaleString("ru-RU")}`;
        }
        return "—";
    };

    // Validation
    const isStepValid = useMemo(() => {
        if (step === 1) return draft.title.trim().length > 3 && draft.description.trim().length > 10;
        if (step === 2) return !!draft.category_id && draft.skill_tags.length > 0;
        if (step === 3) {
            return (draft.budget_min ?? 0) > 0
                && (draft.budget_max ?? 0) > 0
                && (draft.budget_min ?? 0) <= (draft.budget_max ?? 0)
                && !!draft.deadline_at;
        }
        if (step === 4) return true;
        return true; // step 5 is always valid (escrow confirmation)
    }, [step, draft]);

    const minCalendarDate = today(getLocalTimeZone());
    const selectedCalendarDate = draft.deadline_at ? parseDate(draft.deadline_at) : minCalendarDate;

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in-up">
            <PageHeader
                title="Создание заказа"
                description="Пройдите 5 простых шагов, чтобы опубликовать задачу на маркетплейсе"
            />

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {STEPS.map((label, i) => {
                    const stepNum = i + 1;
                    const isActive = step === stepNum;
                    const isPassed = step > stepNum;
                    return (
                        <div key={label} className="flex items-center shrink-0">
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${isActive ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30" : isPassed ? "text-zinc-300" : "text-zinc-600"}`}>
                                {isPassed ? <CheckCircle2 size={16} className="text-emerald-400" /> : <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${isActive ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-500"}`}>{stepNum}</span>}
                                {label}
                            </div>
                            {stepNum < STEPS.length && <div className={`w-8 h-px mx-2 ${isPassed ? "bg-emerald-500/50" : "bg-zinc-800"}`} />}
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 glass-card rounded-2xl p-6 md:p-8 space-y-8">
                    <div className="min-h-[300px]">
                        {step === 1 && (
                            <div className="space-y-6 animate-fade-in-up">
                                <div>
                                    <h2 className="text-xl font-semibold text-white mb-6">Опишите задачу</h2>
                                    <Input
                                        label="Название заказа"
                                        placeholder="Например: Разработать лендинг для фитнес-клуба"
                                        value={draft.title}
                                        onValueChange={(v) => patchDraft({ title: v })}
                                        variant="bordered"
                                        labelPlacement="outside"
                                        classNames={inputClasses}
                                        isRequired
                                        startContent={<Type size={16} className="text-zinc-500" />}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-medium text-zinc-200">Детальное описание<span className="text-danger ml-1">*</span></span>
                                        <Button
                                            size="sm"
                                            variant="flat"
                                            className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 h-7"
                                            startContent={<Sparkles size={14} />}
                                            onPress={() => { void handleAIGenerate(); }}
                                            isDisabled={!draft.title.trim() || draft.title.trim().length < 4}
                                        >
                                            AI Ассистент
                                        </Button>
                                    </div>
                                    <Textarea
                                        placeholder="Опишите требования, ожидания и стек технологий..."
                                        value={draft.description}
                                        onValueChange={(v) => patchDraft({ description: v })}
                                        variant="bordered"
                                        minRows={6}
                                        classNames={{ ...inputClasses, input: "text-zinc-200 text-base leading-relaxed" }}
                                    />
                                    <p className="text-xs text-zinc-500 flex justify-end">{draft.description.length} символов</p>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-8 animate-fade-in-up">
                                <div>
                                    <div className="mb-6 flex items-center justify-between gap-3">
                                        <h2 className="text-xl font-semibold text-white">Категория и навыки</h2>
                                        <Button
                                            size="sm"
                                            variant="flat"
                                            className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                                            startContent={isAutoClassifying ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                            onPress={() => { void handleAutoClassify(); }}
                                            isDisabled={!draft.title.trim() || !draft.description.trim() || isAutoClassifying}
                                        >
                                            AI: определить
                                        </Button>
                                    </div>
                                    {autoClassifyMessage && (
                                        <p className="mb-3 text-xs text-emerald-300">{autoClassifyMessage}</p>
                                    )}
                                    {autoClassifyError && (
                                        <p className="mb-3 text-xs text-red-400">{autoClassifyError}</p>
                                    )}
                                    <Select
                                        label="Сфера деятельности"
                                        placeholder="Выберите категорию из списка"
                                        selectedKeys={draft.category_id ? [draft.category_id] : []}
                                        onSelectionChange={(keys) => patchDraft({ category_id: Array.from(keys)[0] as string })}
                                        variant="bordered"
                                        labelPlacement="outside"
                                        isLoading={catLoading}
                                        classNames={{ trigger: "bg-zinc-900/50 border-zinc-700/50 hover:border-emerald-500/40", label: "text-zinc-400", value: "text-zinc-200" }}
                                        startContent={<LayoutList size={16} className="text-zinc-500" />}
                                    >
                                        {categories.map((c) => (
                                            <SelectItem key={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </Select>
                                </div>

                                <div>
                                    <p className="text-sm font-medium text-zinc-200 mb-3">Стек и технологии<span className="text-danger ml-1">*</span></p>
                                    {skillsLoading ? (
                                        <div className="h-14 bg-zinc-900/50 border border-zinc-700/50 rounded-xl animate-pulse" />
                                    ) : (
                                        <SkillAutoInput
                                            selectedKeys={selectedSkills}
                                            skillsList={skillsList}
                                            categoryId={draft.category_id}
                                            onSelectionChange={setSelectedSkills}
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-6 animate-fade-in-up">
                                <h2 className="text-xl font-semibold text-white mb-6">Бюджет и сроки</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Input
                                                label="Минимальный бюджет (₽)"
                                                type="number"
                                                placeholder="Например: 50000"
                                                value={String(draft.budget_min || "")}
                                                onValueChange={(v) => patchDraft({ budget_min: Number(v) || 0 })}
                                                variant="bordered"
                                                labelPlacement="outside"
                                                classNames={inputClasses}
                                                startContent={<Wallet size={16} className="text-zinc-500" />}
                                                isRequired
                                            />
                                            <Input
                                                label="Максимальный бюджет (₽)"
                                                type="number"
                                                placeholder="Например: 100000"
                                                value={String(draft.budget_max || "")}
                                                onValueChange={(v) => patchDraft({ budget_max: Number(v) || 0 })}
                                                variant="bordered"
                                                labelPlacement="outside"
                                                classNames={inputClasses}
                                                startContent={<Wallet size={16} className="text-zinc-500" />}
                                                isRequired
                                            />
                                        </div>
                                        {budgetMin > 0 && budgetMax > 0 && budgetMin > budgetMax && (
                                            <p className="text-xs text-red-400">Минимальный бюджет не может быть больше максимального.</p>
                                        )}
                                        <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-3 space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-xs text-teal-200">Цена по мнению ИИ</p>
                                                <Button
                                                    size="sm"
                                                    variant="flat"
                                                    className="h-7 bg-teal-500/20 text-teal-200 border border-teal-500/30"
                                                    startContent={isAiBudgetLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                    onPress={() => { void handleAIBudgetSuggest(); }}
                                                    isDisabled={isAiBudgetLoading || !draft.title.trim()}
                                                >
                                                    Рассчитать
                                                </Button>
                                            </div>
                                            {aiBudgetSuggestion?.max || aiBudgetSuggestion?.min ? (
                                                <p className="text-sm text-teal-100">
                                                    {aiBudgetSuggestion?.min ? `от ${aiBudgetSuggestion.min.toLocaleString("ru-RU")} ₽` : ""}
                                                    {aiBudgetSuggestion?.min && aiBudgetSuggestion?.max ? " " : ""}
                                                    {aiBudgetSuggestion?.max ? `до ${aiBudgetSuggestion.max.toLocaleString("ru-RU")} ₽` : ""}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-teal-300/80">Нажмите «Рассчитать», и ИИ предложит бюджет по вашему описанию.</p>
                                            )}
                                            {aiBudgetError && <p className="text-xs text-red-300">{aiBudgetError}</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-zinc-200">Желаемый дедлайн<span className="text-danger ml-1">*</span></p>
                                        <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/40 p-3">
                                            <HeroCalendar
                                                minValue={minCalendarDate}
                                                value={selectedCalendarDate}
                                                onChange={(value) => patchDraft({ deadline_at: value.toString() })}
                                                classNames={{
                                                    base: "w-full",
                                                    headerWrapper: "text-zinc-200",
                                                    title: "text-zinc-100",
                                                    gridHeaderCell: "text-zinc-500",
                                                    cellButton: "data-[hover=true]:bg-emerald-500/20 data-[selected=true]:bg-emerald-600 data-[selected=true]:text-white",
                                                }}
                                            />
                                        </div>
                                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                                            <Calendar size={12} />
                                            Выбрано: {draft.deadline_at ? new Date(draft.deadline_at).toLocaleDateString("ru-RU") : "—"}
                                        </p>
                                        <p className="text-xs text-zinc-500">Диапазон бюджета: {formatBudgetRange()}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-8 animate-fade-in-up">
                                <h2 className="text-xl font-semibold text-white mb-2">Проверка перед публикацией</h2>

                                <div className="bg-zinc-900/50 border border-white/[0.04] rounded-2xl p-6 space-y-6">
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-semibold text-zinc-100">{draft.title || "—"}</h3>
                                        <div className="flex flex-wrap items-center gap-3 text-sm">
                                            <span className="text-emerald-400 font-medium">{formatBudgetRange()}</span>
                                            <span className="text-zinc-600">•</span>
                                            <span className="text-zinc-400 bg-zinc-800/50 px-2 py-0.5 rounded flex items-center gap-1.5">
                                                <Calendar size={14} className="text-zinc-500" />
                                                До {draft.deadline_at ? new Date(draft.deadline_at).toLocaleDateString("ru-RU") : "—"}
                                            </span>
                                            <span className="text-zinc-600">•</span>
                                            <span className="text-zinc-400 capitalize bg-zinc-800/50 px-2 py-0.5 rounded flex items-center gap-1.5">
                                                <LayoutList size={14} className="text-zinc-500" />
                                                {categories.find((c) => c.id === draft.category_id)?.name ?? draft.category_id ?? "—"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-zinc-500 text-sm font-medium">Описание задачи</p>
                                        <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4 text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">
                                            {draft.description || "—"}
                                        </div>
                                    </div>

                                    {draft.skill_tags.length > 0 && (
                                        <div className="space-y-3">
                                            <p className="text-zinc-500 text-sm font-medium">Требуемые навыки</p>
                                            <div className="flex flex-wrap gap-2">
                                                {draft.skill_tags.map((tag) => (
                                                    <Chip key={tag} size="sm" variant="flat" classNames={{ base: "bg-emerald-500/10 border border-emerald-500/20", content: "text-emerald-300 font-medium" }}>
                                                        {tag}
                                                    </Chip>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {step === 5 && (
                            <div className="space-y-6 animate-fade-in-up">
                                <h2 className="text-xl font-semibold text-white mb-2">Оплата и Escrow</h2>
                                <p className="text-sm text-zinc-400">Средства будут заморожены на безопасном escrow-счёте до завершения работы</p>

                                <Card className="bg-zinc-900/50 border border-zinc-800">
                                    <CardBody className="p-6 space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                                <Shield size={24} className="text-emerald-400" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-zinc-100">Безопасная сделка</p>
                                                <p className="text-xs text-zinc-500">Гарантия для заказчика и исполнителя</p>
                                            </div>
                                        </div>

                                        <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-zinc-400">Бюджет заказа</span>
                                                <span className="text-lg font-bold text-white">{formatBudgetRange()}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-zinc-400">Комиссия сервиса</span>
                                                <span className="text-sm text-zinc-300">0 ₽</span>
                                            </div>
                                            <div className="h-px bg-zinc-800" />
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-zinc-200">Итого к заморозке</span>
                                                <span className="text-lg font-bold text-emerald-400">до ₽{budgetMax.toLocaleString("ru-RU")}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                                            <Lock size={16} className="text-amber-400 mt-0.5 shrink-0" />
                                            <p className="text-xs text-amber-200/80 leading-relaxed">
                                                Средства будут заморожены на escrow-счёте. Исполнитель получит оплату только после вашего подтверждения завершения работы. В случае спора — средства вернутся вам.
                                            </p>
                                        </div>
                                    </CardBody>
                                </Card>
                            </div>
                        )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between pt-6 border-t border-white/[0.06]">
                        <Button
                            variant="light"
                            className="text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                            onPress={() => step > 1 ? setStep((step - 1) as 1 | 2 | 3 | 4 | 5) : router.back()}
                            startContent={<ArrowLeft size={16} />}
                        >
                            {step > 1 ? "Назад" : "Отмена"}
                        </Button>

                        {step < 5 ? (
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 shadow-lg shadow-emerald-500/25 disabled:opacity-50"
                                onPress={() => setStep((step + 1) as 1 | 2 | 3 | 4 | 5)}
                                endContent={<ArrowRight size={16} />}
                                isDisabled={!isStepValid}
                            >
                                Далее
                            </Button>
                        ) : (
                            <Button
                                className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold px-8 shadow-lg shadow-emerald-500/30"
                                onPress={() => { void handlePublish(); }}
                                isLoading={createOrder.isPending || publishOrder.isPending}
                                startContent={!createOrder.isPending ? <Sparkles size={16} /> : null}
                            >
                                Заморозить и опубликовать
                            </Button>
                        )}
                    </div>
                </div>

                {/* Sidebar Tips */}
                <div className="hidden lg:block">
                    <div className="sticky top-24 glass-card rounded-2xl p-6 bg-gradient-to-b from-zinc-900/80 to-zinc-950/80">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                                <Sparkles size={16} />
                            </div>
                            <h3 className="font-semibold text-zinc-100">Совет</h3>
                        </div>
                        <ul className="space-y-4">
                            {TIPS[step as keyof typeof TIPS]?.map((tip, i) => (
                                <li key={i} className="flex gap-3 text-sm text-zinc-400 animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                    <span>{tip}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* AI Generation Modal */}
            <Modal
                isOpen={aiModal.isOpen}
                onOpenChange={aiModal.onOpenChange}
                size="2xl"
                classNames={{
                    base: "bg-zinc-900 border border-white/[0.06]",
                    header: "border-b border-white/[0.06]",
                    footer: "border-t border-white/[0.06]",
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Bot size={16} className="text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-base font-semibold text-zinc-100">AI генерирует описание</p>
                            <p className="text-xs text-zinc-500 font-normal">На основе заголовка: &ldquo;{draft.title}&rdquo;</p>
                        </div>
                    </ModalHeader>
                    <ModalBody className="py-4">
                        {!aiGenerated && aiAssistant.isStreaming ? (
                            <div className="flex items-center justify-center py-8 gap-3">
                                <Loader2 size={20} className="text-emerald-400 animate-spin" />
                                <span className="text-sm text-zinc-400">Генерация описания...</span>
                            </div>
                        ) : (
                            <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4 max-h-[400px] overflow-y-auto scrollbar-styled">
                                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                    {aiGenerated || "Описание пока не сгенерировано"}
                                </p>
                                {aiAssistant.isStreaming && (
                                    <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-0.5" />
                                )}
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            variant="light"
                            className="text-zinc-400"
                            onPress={aiModal.onClose}
                        >
                            Отмена
                        </Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                            onPress={handleApplyAI}
                            isDisabled={!aiGenerated || aiAssistant.isStreaming}
                            startContent={<CheckCircle2 size={14} />}
                        >
                            Вставить описание
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
};
