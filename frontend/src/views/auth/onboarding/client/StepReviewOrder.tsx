"use client";

import { useEffect, useState } from "react";
import { useOnboardingStore } from "@/features/onboarding/model";
import { catalogApi, type Category } from "@/shared/api/endpoints/catalog";
import {
    FilkaButton,
    FilkaCard,
    FilkaDatePicker,
    FilkaField,
    FilkaInput,
    FilkaSelect,
    FilkaTagInput,
    FilkaTextarea,
    IconArrowLeft,
    IconSend,
} from "@/shared/ui/filka";

interface Props {
    readonly onPublish: () => void;
    readonly isPublishing: boolean;
}

const dateToIso = (d: Date) => d.toISOString().slice(0, 10);
const isoToDate = (s: string) => (s ? new Date(s) : null);

export const StepReviewOrder = ({ onPublish, isPublishing }: Props) => {
    const { clientData, updateClient, prevStep } = useOnboardingStore();
    const [categories, setCategories] = useState<Category[]>([]);

    useEffect(() => {
        catalogApi.listCategories().then(setCategories).catch(() => {});
    }, []);

    return (
        <FilkaCard className="p-6 sm:p-8">
            <h2 className="t-h3 mb-1">Проверка заказа</h2>
            <p className="t-body-sm mb-6" style={{ color: "var(--fg-2)" }}>
                Проверьте и отредактируйте сгенерированное AI техническое задание
            </p>

            <div className="space-y-4">
                <FilkaField label="Название">
                    <FilkaInput
                        value={clientData.generatedTitle}
                        onChange={(e) => updateClient({ generatedTitle: e.target.value })}
                    />
                </FilkaField>

                <FilkaField label="Описание">
                    <FilkaTextarea
                        value={clientData.generatedDescription}
                        onChange={(e) => updateClient({ generatedDescription: e.target.value })}
                        className="min-h-[120px]"
                    />
                </FilkaField>

                {categories.length > 0 ? (
                    <FilkaField label="Категория">
                        <FilkaSelect
                            options={categories.map((c) => ({ value: c.id, label: c.name }))}
                            value={clientData.generatedCategoryId ?? null}
                            onChange={(val) => updateClient({ generatedCategoryId: val ?? "" })}
                            placeholder="Выберите категорию"
                            searchable
                        />
                    </FilkaField>
                ) : null}

                <FilkaField label="Навыки">
                    <FilkaTagInput
                        value={clientData.generatedSkills}
                        onChange={(skills) => updateClient({ generatedSkills: skills })}
                        placeholder="Добавьте навык и нажмите Enter"
                    />
                </FilkaField>

                <div className="grid grid-cols-2 gap-4">
                    <FilkaField label="Бюджет, ₽">
                        <FilkaInput
                            type="number"
                            inputMode="numeric"
                            value={String(clientData.generatedBudgetMax || "")}
                            onChange={(e) => updateClient({ generatedBudgetMax: Number(e.target.value) || 0 })}
                        />
                    </FilkaField>
                    <FilkaField label="Дедлайн">
                        <FilkaDatePicker
                            value={isoToDate(clientData.generatedDeadline)}
                            onChange={(d) => updateClient({ generatedDeadline: dateToIso(d) })}
                            minDate={new Date()}
                        />
                    </FilkaField>
                </div>
            </div>

            <div className="mt-8 flex justify-between gap-3">
                <FilkaButton variant="ghost" startContent={<IconArrowLeft size={14} />} onClick={prevStep}>
                    Назад
                </FilkaButton>
                <FilkaButton
                    variant="primary"
                    loading={isPublishing}
                    disabled={!clientData.generatedTitle.trim()}
                    startContent={<IconSend size={14} />}
                    onClick={onPublish}
                >
                    Опубликовать заказ
                </FilkaButton>
            </div>
        </FilkaCard>
    );
};
