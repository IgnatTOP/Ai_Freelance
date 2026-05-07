"use client";

import type { DragEvent, ReactNode } from "react";
import { useRef, useState } from "react";
import { cn } from "@/shared/lib/cn";
import { IconUpload, IconClose, IconFile } from "./icons";

interface FilkaFileDropzoneProps {
  readonly onFiles: (files: File[]) => void;
  readonly accept?: string;
  readonly multiple?: boolean;
  readonly maxSizeMB?: number;
  readonly className?: string;
  readonly hint?: ReactNode;
  readonly title?: ReactNode;
  readonly disabled?: boolean;
}

export const FilkaFileDropzone = ({
  onFiles,
  accept,
  multiple = false,
  maxSizeMB,
  className,
  hint = "Перетащите файлы сюда или нажмите, чтобы выбрать",
  title = "Загрузить файлы",
  disabled,
}: FilkaFileDropzoneProps) => {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filterAndEmit = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const filtered = maxSizeMB
      ? arr.filter((f) => f.size / 1024 / 1024 <= maxSizeMB)
      : arr;
    if (filtered.length) onFiles(filtered);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDrag(false);
    if (disabled) return;
    if (e.dataTransfer.files?.length) filterAndEmit(e.dataTransfer.files);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--r-lg)] border-2 border-dashed px-6 py-8 text-center transition-all",
        drag && "border-[var(--mint-400)] bg-[rgba(52,211,153,0.06)]",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      style={{
        borderColor: drag ? "var(--mint-400)" : "var(--line-2)",
        background: drag ? "rgba(52,211,153,0.06)" : "var(--bg-1)",
      }}
    >
      <span
        className="grid h-10 w-10 place-items-center rounded-full"
        style={{ background: "rgba(52,211,153,0.1)", color: "var(--mint-300)" }}
      >
        <IconUpload size={18} />
      </span>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs" style={{ color: "var(--fg-2)" }}>
        {hint}
      </div>
      {maxSizeMB ? (
        <div className="text-[11px]" style={{ color: "var(--fg-3)" }}>
          Максимум {maxSizeMB} МБ на файл
        </div>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files) filterAndEmit(e.target.files);
          e.target.value = "";
        }}
        className="hidden"
      />
    </div>
  );
};

interface FilePreviewItem {
  readonly id?: string | number;
  readonly name: string;
  readonly size?: number;
}

export const FilkaFileList = ({
  files,
  onRemove,
}: {
  readonly files: ReadonlyArray<FilePreviewItem>;
  readonly onRemove?: (idx: number) => void;
}) => {
  if (files.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2">
      {files.map((f, i) => (
        <li
          key={f.id ?? i}
          className="flex items-center gap-2 rounded-[var(--r-md)] border px-3 py-2 text-sm"
          style={{ background: "var(--bg-1)", borderColor: "var(--line)" }}
        >
          <IconFile size={14} className="shrink-0 text-[var(--fg-2)]" />
          <span className="flex-1 truncate">{f.name}</span>
          {typeof f.size === "number" ? (
            <span className="t-mono text-xs shrink-0" style={{ color: "var(--fg-3)" }}>
              {(f.size / 1024 / 1024).toFixed(2)} МБ
            </span>
          ) : null}
          {onRemove ? (
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="shrink-0 rounded p-1 text-[var(--fg-2)] hover:text-[var(--fg-0)]"
              aria-label="Удалить файл"
            >
              <IconClose size={14} />
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
};
