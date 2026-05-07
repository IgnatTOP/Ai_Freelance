"use client";

import { useState } from "react";
import { useOnboardingStore } from "@/features/onboarding/model";
import { mediaApi } from "@/shared/api/endpoints/media";
import {
    FilkaAvatarUploader,
    FilkaButton,
    FilkaCard,
    IconArrowLeft,
    IconArrowRight,
} from "@/shared/ui/filka";

export const StepAvatarUpload = () => {
    const { clientData, updateClient, nextStep, prevStep } = useOnboardingStore();
    const [preview, setPreview] = useState(clientData.avatarPreviewUrl ?? "");
    const [photoId, setPhotoId] = useState<string | null>(clientData.avatarPhotoId ?? null);
    const [isUploading, setIsUploading] = useState(false);

    const handleSelect = async (file: File) => {
        setIsUploading(true);
        try {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const url = evt.target?.result as string;
                setPreview(url);
            };
            reader.readAsDataURL(file);

            const result = await mediaApi.uploadPhoto(file);
            setPhotoId(result.id);
            updateClient({ avatarPhotoId: result.id, avatarPreviewUrl: preview });
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemove = () => {
        setPreview("");
        setPhotoId(null);
        updateClient({ avatarPhotoId: "", avatarPreviewUrl: "" });
    };

    const handleContinue = () => {
        if (photoId) updateClient({ avatarPhotoId: photoId, avatarPreviewUrl: preview });
        nextStep();
    };

    return (
        <FilkaCard className="p-6 sm:p-8">
            <h2 className="t-h3 mb-1">Ваш аватар</h2>
            <p className="t-body-sm mb-6" style={{ color: "var(--fg-2)" }}>
                Загрузите фото — оно повышает доверие исполнителей
            </p>

            <div className="flex justify-center py-2">
                <FilkaAvatarUploader
                    src={preview || undefined}
                    initials={(clientData.company || clientData.name || "?")
                        .split(" ")
                        .map((s) => s[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    onSelect={handleSelect}
                    onRemove={handleRemove}
                    size={140}
                    loading={isUploading}
                />
            </div>

            <div className="mt-8 flex justify-between gap-3">
                <FilkaButton variant="ghost" startContent={<IconArrowLeft size={14} />} onClick={prevStep}>
                    Назад
                </FilkaButton>
                <FilkaButton variant="primary" endContent={<IconArrowRight size={14} />} onClick={handleContinue}>
                    {photoId ? "Далее" : "Пропустить"}
                </FilkaButton>
            </div>
        </FilkaCard>
    );
};
