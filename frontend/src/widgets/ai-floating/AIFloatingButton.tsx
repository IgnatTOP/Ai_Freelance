"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useAIFloatingStore } from "./store";

export const AIFloatingButton = () => {
    const { isOpen, hasPulse, toggle } = useAIFloatingStore();

    return (
        <AnimatePresence>
            {!isOpen && (
                <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    onClick={toggle}
                    className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg shadow-emerald-900/30 transition-all hover:shadow-xl hover:shadow-emerald-800/40 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                    style={{ backgroundColor: "#7B2FFF" }}
                    aria-label="Открыть AI ассистент"
                >
                    <Sparkles size={24} className="text-white" />

                    {/* Pulse ring */}
                    {hasPulse && (
                        <motion.span
                            className="absolute inset-0 rounded-full border-2 border-emerald-400"
                            initial={{ scale: 1, opacity: 0.6 }}
                            animate={{ scale: 1.8, opacity: 0 }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                        />
                    )}
                </motion.button>
            )}
        </AnimatePresence>
    );
};
