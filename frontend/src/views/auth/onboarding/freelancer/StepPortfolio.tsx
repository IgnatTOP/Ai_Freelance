"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Image as ImageIcon, Link as LinkIcon, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useOnboardingStore, type PortfolioEntry } from "@/features/onboarding/model";
import { mediaApi } from "@/shared/api/endpoints/media";
import { FilkaButton, FilkaField, FilkaInput, FilkaTextarea } from "@/shared/ui/filka/FilkaPrimitives";

const MAX_ITEMS = 3;
const MAX_FILE_MB = 10;

const emptyEntry = (): PortfolioEntry => ({
  title: "",
  description: "",
  link: "",
});

interface PortfolioCardProps {
  readonly index: number;
  readonly item: PortfolioEntry;
  readonly canRemove: boolean;
  readonly onChange: (patch: Partial<PortfolioEntry>) => void;
  readonly onRemove: () => void;
}

const PortfolioCard = ({ index, item, canRemove, onChange, onRemove }: PortfolioCardProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const upload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setUploadError("Можно загружать только изображения");
        return;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        setUploadError(`Файл больше ${MAX_FILE_MB} МБ`);
        return;
      }
      setUploadError(null);
      setIsUploading(true);

      // Локальное превью сразу
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onChange({ imagePreview: reader.result });
        }
      };
      reader.readAsDataURL(file);

      try {
        const media = await mediaApi.uploadPhoto(file);
        onChange({ imageId: media.id });
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Не удалось загрузить файл");
        onChange({ imagePreview: undefined, imageId: undefined });
      } finally {
        setIsUploading(false);
      }
    },
    [onChange],
  );

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  const removePhoto = () => {
    onChange({ imageId: undefined, imagePreview: undefined });
    setUploadError(null);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-xl border p-4"
      style={{
        background: "rgba(199,211,234,0.025)",
        borderColor: "var(--line)",
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{
            background: "rgba(102,58,243,0.12)",
            color: "var(--celestial-light)",
            border: "1px solid rgba(102,58,243,0.28)",
          }}
        >
          Работа · {index + 1}
        </span>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Удалить работу"
            className="grid h-7 w-7 place-items-center rounded-full transition-colors hover:bg-[rgba(248,113,113,0.12)] hover:text-[var(--err)]"
            style={{ color: "var(--fg-3)" }}
          >
            <Trash2 size={13} />
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        {/* Photo dropzone */}
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPick}
          />
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              if (!isDragOver) setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={onDrop}
            className="relative flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-all"
            style={{
              background: isDragOver
                ? "rgba(102,58,243,0.10)"
                : item.imagePreview
                ? "var(--bg-1)"
                : "rgba(199,211,234,0.03)",
              borderColor: isDragOver
                ? "rgba(102,58,243,0.55)"
                : item.imagePreview
                ? "transparent"
                : "rgba(186,215,247,0.18)",
            }}
          >
            {item.imagePreview ? (
              <>
                <img
                  src={item.imagePreview}
                  alt={item.title || `Работа ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                {isUploading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-[rgba(5,6,15,0.55)] backdrop-blur-sm">
                    <Loader2 size={20} className="animate-spin" style={{ color: "var(--celestial-light)" }} />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePhoto();
                    }}
                    aria-label="Удалить фото"
                    className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full"
                    style={{
                      background: "rgba(5,6,15,0.78)",
                      color: "var(--ghost-white)",
                      border: "1px solid rgba(186,215,247,0.18)",
                    }}
                  >
                    <X size={13} />
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 px-3 text-center">
                {isUploading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" style={{ color: "var(--celestial-light)" }} />
                    <span className="text-[11px]" style={{ color: "var(--fg-2)" }}>
                      Загружаем…
                    </span>
                  </>
                ) : (
                  <>
                    <div
                      className="grid h-9 w-9 place-items-center rounded-full"
                      style={{
                        background: "rgba(102,58,243,0.12)",
                        color: "var(--celestial-light)",
                      }}
                    >
                      <ImageIcon size={16} />
                    </div>
                    <span className="text-[12px] font-medium" style={{ color: "var(--fg-1)" }}>
                      Перетащите фото
                    </span>
                    <span className="text-[10.5px]" style={{ color: "var(--fg-3)" }}>
                      или кликните · до {MAX_FILE_MB} МБ
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
          {!item.imagePreview && !isUploading ? (
            <FilkaButton
              variant="soft"
              size="sm"
              startContent={<Upload size={12} />}
              onClick={() => inputRef.current?.click()}
            >
              Выбрать файл
            </FilkaButton>
          ) : null}
          {uploadError ? (
            <span className="text-[11px]" style={{ color: "var(--err)" }}>
              {uploadError}
            </span>
          ) : null}
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-3">
          <FilkaField label="Название проекта">
            <FilkaInput
              value={item.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Например: Лендинг для финтех-стартапа"
              maxLength={80}
            />
          </FilkaField>
          <FilkaField label="Что сделано · в одном абзаце">
            <FilkaTextarea
              value={item.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Опишите задачу, технологии, результат и роль в проекте."
              className="min-h-[88px]"
              maxLength={400}
            />
            <div
              className="mt-1 flex justify-end text-[10.5px] tabular-nums"
              style={{ color: "var(--fg-3)" }}
            >
              {item.description.length}/400
            </div>
          </FilkaField>
          <FilkaField label="Ссылка · Behance, GitHub, Figma">
            <div className="relative">
              <LinkIcon
                size={13}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--fg-3)" }}
              />
              <FilkaInput
                className="pl-9"
                value={item.link ?? ""}
                onChange={(e) => onChange({ link: e.target.value })}
                placeholder="https://"
                inputMode="url"
              />
            </div>
          </FilkaField>
        </div>
      </div>
    </motion.div>
  );
};

export const StepPortfolio = () => {
  const { freelancerData, updateFreelancer, nextStep, prevStep } = useOnboardingStore();
  const items = freelancerData.portfolioItems;

  const updateItem = (index: number, patch: Partial<PortfolioEntry>) => {
    const updated = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    updateFreelancer({ portfolioItems: updated });
  };

  const addItem = () => {
    if (items.length < MAX_ITEMS) {
      updateFreelancer({ portfolioItems: [...items, emptyEntry()] });
    }
  };

  const removeItem = (index: number) => {
    updateFreelancer({ portfolioItems: items.filter((_, i) => i !== index) });
  };

  const filledCount = items.filter((it) => it.title.trim() && it.description.trim()).length;

  return (
    <motion.div
      className="glass-card rounded-2xl p-6 sm:p-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="mb-1 text-2xl font-bold text-[var(--fg-0)]">Портфолио</h2>
          <p className="text-sm" style={{ color: "var(--fg-3)" }}>
            Добавьте до {MAX_ITEMS} работ с фото — их увидят заказчики на вашем профиле.
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold tabular-nums"
          style={{
            background: "rgba(102,58,243,0.12)",
            color: "var(--celestial-light)",
            border: "1px solid rgba(102,58,243,0.26)",
          }}
        >
          {filledCount} / {MAX_ITEMS}
        </span>
      </div>

      <div className="space-y-4">
        {items.length === 0 ? (
          <button
            type="button"
            onClick={addItem}
            className="group flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 transition-all"
            style={{
              borderColor: "rgba(186,215,247,0.18)",
              background: "rgba(199,211,234,0.025)",
            }}
          >
            <div
              className="grid h-12 w-12 place-items-center rounded-full transition-transform group-hover:scale-110"
              style={{
                background: "rgba(102,58,243,0.14)",
                color: "var(--celestial-light)",
              }}
            >
              <ImageIcon size={20} />
            </div>
            <span className="text-sm font-semibold" style={{ color: "var(--fg-0)" }}>
              Добавьте первую работу
            </span>
            <span className="text-xs" style={{ color: "var(--fg-3)" }}>
              Фото, название и описание — всё на одном экране
            </span>
          </button>
        ) : (
          items.map((item, i) => (
            <PortfolioCard
              key={i}
              index={i}
              item={item}
              canRemove={items.length > 0}
              onChange={(patch) => updateItem(i, patch)}
              onRemove={() => removeItem(i)}
            />
          ))
        )}

        {items.length > 0 && items.length < MAX_ITEMS && (
          <FilkaButton
            variant="ghost"
            className="w-full"
            startContent={<Plus size={14} />}
            onClick={addItem}
          >
            Добавить ещё работу
          </FilkaButton>
        )}
      </div>

      <div className="mt-8 flex justify-between">
        <FilkaButton variant="ghost" startContent={<ArrowLeft size={16} />} onClick={prevStep}>
          Назад
        </FilkaButton>
        <FilkaButton variant="primary" endContent={<ArrowRight size={16} />} onClick={nextStep}>
          {filledCount === 0 ? "Пропустить" : "Далее"}
        </FilkaButton>
      </div>
    </motion.div>
  );
};
