"use client";

import { useRef, useState } from "react";
import { cn } from "@/shared/lib/cn";
import { IconUpload, IconClose } from "./icons";
import { FilkaSpinner } from "./visuals";

interface FilkaAvatarUploaderProps {
  readonly src?: string | null | undefined;
  readonly initials?: string;
  readonly onSelect: (file: File) => void | Promise<void>;
  readonly onRemove?: () => void;
  readonly size?: number;
  readonly maxSizeMB?: number;
  readonly className?: string;
  readonly disabled?: boolean;
  readonly loading?: boolean;
}

export const FilkaAvatarUploader = ({
  src,
  initials = "?",
  onSelect,
  onRemove,
  size = 96,
  maxSizeMB = 5,
  className,
  disabled,
  loading,
}: FilkaAvatarUploaderProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [hover, setHover] = useState(false);

  return (
    <div
      className={cn("relative inline-flex flex-col items-center gap-2", className)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        onClick={() => !disabled && inputRef.current?.click()}
        disabled={disabled || loading}
        className="relative grid place-items-center overflow-hidden rounded-full"
        style={{
          width: size,
          height: size,
          background: src ? "var(--bg-3)" : "linear-gradient(135deg,#B6D9FC,#1a0e4a)",
          color: "#05060f",
          border: "2px solid var(--line-2)",
          fontSize: Math.round(size * 0.32),
          fontWeight: 700,
        }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Аватар" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span>{initials}</span>
        )}
        {(hover || loading) && !disabled ? (
          <span
            className="absolute inset-0 grid place-items-center text-white"
            style={{ background: "rgba(7,17,12,0.55)" }}
          >
            {loading ? <FilkaSpinner size={20} /> : <IconUpload size={Math.round(size * 0.22)} />}
          </span>
        ) : null}
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => !disabled && inputRef.current?.click()}
          disabled={disabled || loading}
          className="filka-btn filka-btn-soft filka-btn-sm"
        >
          {src ? "Сменить фото" : "Загрузить фото"}
        </button>
        {src && onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled || loading}
            className="filka-btn filka-btn-ghost filka-btn-sm"
          >
            <IconClose size={14} />
            Удалить
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && file.size / 1024 / 1024 <= maxSizeMB) {
            void onSelect(file);
          }
          e.target.value = "";
        }}
      />
    </div>
  );
};
