"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Button, Slider } from "@heroui/react";
import { ArrowRight, ArrowLeft, Camera, ZoomIn } from "lucide-react";
import { useOnboardingStore } from "@/features/onboarding/model";
import { mediaApi } from "@/shared/api/endpoints/media";

export const StepAvatarUpload = () => {
    const { clientData, updateClient, nextStep, prevStep } = useOnboardingStore();

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState(clientData.avatarPreviewUrl || "");
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isUploading, setIsUploading] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;
        setFile(selected);
        setZoom(1);
        setOffset({ x: 0, y: 0 });

        const reader = new FileReader();
        reader.onload = (evt) => {
            const url = evt.target?.result as string;
            setPreview(url);
            const img = new Image();
            img.onload = () => { imgRef.current = img; };
            img.src = url;
        };
        reader.readAsDataURL(selected);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!preview) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };

    const handleMouseUp = () => setIsDragging(false);

    const getCroppedBlob = useCallback((): Promise<Blob | null> => {
        return new Promise((resolve) => {
            const canvas = canvasRef.current;
            const img = imgRef.current;
            if (!canvas || !img) { resolve(null); return; }

            const size = 300; // output size
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
            if (!ctx) { resolve(null); return; }

            // Calculate crop from the 200px preview viewport
            const viewportSize = 200;
            const scale = img.naturalWidth / (viewportSize * zoom);

            const srcX = ((viewportSize / 2 - offset.x) * scale) - (size * scale) / 2;
            const srcY = ((viewportSize / 2 - offset.y) * scale) - (size * scale) / 2;
            const srcSize = size * scale;

            ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, size, size);
            canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
        });
    }, [zoom, offset]);

    const handleUploadAndContinue = async () => {
        if (!file && !clientData.avatarPhotoId) {
            // Skip without avatar
            nextStep();
            return;
        }

        if (!file) {
            nextStep();
            return;
        }

        setIsUploading(true);
        try {
            const blob = await getCroppedBlob();
            const uploadFile = blob
                ? new File([blob], "avatar.jpg", { type: "image/jpeg" })
                : file;

            const result = await mediaApi.uploadPhoto(uploadFile);
            updateClient({
                avatarPhotoId: result.id,
                avatarPreviewUrl: preview,
            });
            nextStep();
        } catch {
            // Allow retry
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <motion.div
            className="glass-card rounded-2xl p-6 sm:p-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
        >
            <h2 className="mb-1 text-2xl font-bold text-zinc-100">
                Ваш аватар
            </h2>
            <p className="mb-6 text-sm text-zinc-500">
                Загрузите фото — оно поможет повысить доверие
            </p>

            <div className="flex flex-col items-center gap-6">
                {/* Preview circle with crop */}
                <div
                    className="relative h-[200px] w-[200px] overflow-hidden rounded-full border-2 border-dashed border-zinc-700 bg-zinc-900/50 cursor-move"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {preview ? (
                        <img
                            src={preview}
                            alt="Avatar preview"
                            loading="lazy"
                            decoding="async"
                            className="pointer-events-none absolute select-none"
                            style={{
                                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                                transformOrigin: "center center",
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                            }}
                            draggable={false}
                        />
                    ) : (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors"
                            type="button"
                        >
                            <Camera size={32} />
                            <span className="text-sm">Загрузить фото</span>
                        </button>
                    )}
                </div>

                {/* Zoom slider */}
                {preview && (
                    <div className="flex w-full max-w-[260px] items-center gap-3">
                        <ZoomIn size={16} className="text-zinc-500 shrink-0" />
                        <Slider
                            aria-label="Zoom"
                            size="sm"
                            minValue={1}
                            maxValue={3}
                            step={0.05}
                            value={zoom}
                            onChange={(v) => setZoom(v as number)}
                            classNames={{
                                track: "bg-zinc-800",
                                filler: "bg-purple-500",
                            }}
                        />
                    </div>
                )}

                {/* File input + change button */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                />
                {preview && (
                    <Button
                        size="sm"
                        variant="flat"
                        onPress={() => fileInputRef.current?.click()}
                    >
                        Выбрать другое фото
                    </Button>
                )}

                {/* Hidden canvas for cropping */}
                <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="mt-8 flex justify-between">
                <Button variant="light" startContent={<ArrowLeft size={16} />} onPress={prevStep}>
                    Назад
                </Button>
                <Button
                    color="secondary"
                    endContent={<ArrowRight size={16} />}
                    isLoading={isUploading}
                    onPress={handleUploadAndContinue}
                >
                    {file ? "Загрузить и продолжить" : "Пропустить"}
                </Button>
            </div>
        </motion.div>
    );
};
