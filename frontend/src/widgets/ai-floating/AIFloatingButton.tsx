"use client";

import { useAIFloatingStore } from "./store";
import { IconSpark } from "@/shared/ui/filka";

export const AIFloatingButton = () => {
    const { isOpen, toggle } = useAIFloatingStore();
    if (isOpen) return null;
    return (
        <button
            type="button"
            onClick={toggle}
            className="ai-breathe fixed bottom-20 right-4 z-40 grid h-14 w-14 place-items-center rounded-full transition-transform hover:scale-105 lg:bottom-6 lg:right-6"
            style={{
                background: "linear-gradient(135deg, #B6D9FC 0%, #1a0e4a 100%)",
                color: "#05060f",
                boxShadow: "var(--shadow-glow), var(--shadow-md)",
                border: "1px solid rgba(186,215,247,0.32)",
            }}
            aria-label="Открыть AI-ассистента"
        >
            <IconSpark size={22} />
        </button>
    );
};
