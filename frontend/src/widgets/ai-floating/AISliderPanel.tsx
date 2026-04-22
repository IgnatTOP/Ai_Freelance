"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input, Button, ScrollShadow, Chip } from "@heroui/react";
import { Send, X, Sparkles, Bot, User, Square, Trash2 } from "lucide-react";
import { useSessionStore } from "@/shared/store/session.store";
import { useAIAssistant } from "@/features/ai-assistant";
import { useAIFloatingStore } from "./store";

type ChatMessage = { role: "user" | "assistant"; content: string; timestamp: number };

const CLIENT_SUGGESTIONS = [
    "Помоги составить описание заказа",
    "Как выбрать фрилансера?",
    "Оптимальный бюджет для проекта",
];

const FREELANCER_SUGGESTIONS = [
    "Помоги написать отклик",
    "Как составить портфолио?",
    "Советы по ценообразованию",
];

/* ── Safe markdown renderer (no dangerouslySetInnerHTML) ── */
const renderInline = (text: string, keyPrefix: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const regex = /\*\*(.+?)\*\*|`([^`]+)`/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let idx = 0;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }
        if (match[1]) {
            parts.push(<strong key={`${keyPrefix}-b${idx}`} className="font-semibold text-zinc-100">{match[1]}</strong>);
        } else if (match[2]) {
            parts.push(<code key={`${keyPrefix}-c${idx}`} className="bg-zinc-800 text-emerald-300 px-1 py-0.5 rounded text-xs font-mono">{match[2]}</code>);
        }
        lastIndex = match.index + match[0].length;
        idx++;
    }
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }
    return parts;
};

const renderMarkdown = (text: string) => {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";
        if (!line && i > 0 && !(lines[i - 1] ?? "")) continue;

        if (/^[-•]\s/.test(line)) {
            elements.push(
                <div key={i} className="flex gap-2 ml-1">
                    <span className="text-emerald-400 mt-0.5 shrink-0">•</span>
                    <span>{renderInline(line.replace(/^[-•]\s/, ""), `${i}`)}</span>
                </div>
            );
            continue;
        }

        const numMatch = line.match(/^(\d+)[.)]\s(.*)/);
        if (numMatch) {
            elements.push(
                <div key={i} className="flex gap-2 ml-1">
                    <span className="text-emerald-400 font-medium shrink-0 tabular-nums w-5 text-right">{numMatch[1]}.</span>
                    <span>{renderInline(numMatch[2] ?? "", `${i}`)}</span>
                </div>
            );
            continue;
        }

        if (!line.trim()) {
            elements.push(<div key={i} className="h-2" />);
            continue;
        }

        elements.push(<span key={i}>{renderInline(line, `${i}`)}</span>);
        if (i < lines.length - 1 && lines[i + 1]?.trim()) {
            elements.push(<br key={`br-${i}`} />);
        }
    }

    return elements;
};

const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

export const AISliderPanel = () => {
    const { isOpen, close } = useAIFloatingStore();
    const role = useSessionStore((s) => s.role);
    const { text: streamingText, isStreaming, start, stop } = useAIAssistant();

    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    const suggestions = role === "freelancer" ? FREELANCER_SUGGESTIONS : CLIENT_SUGGESTIONS;

    useEffect(() => {
        if (streamingText) {
            setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                    return [...prev.slice(0, -1), { ...last, content: streamingText }];
                }
                return [...prev, { role: "assistant", content: streamingText, timestamp: Date.now() }];
            });
        }
    }, [streamingText]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages]);

    const handleSend = async (text?: string) => {
        const prompt = text ?? input.trim();
        if (!prompt) return;
        setMessages((prev) => [...prev, { role: "user", content: prompt, timestamp: Date.now() }]);
        setInput("");
        await start(prompt);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void handleSend();
        }
    };

    const handleClear = () => setMessages([]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop for mobile */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm lg:hidden"
                        onClick={close}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed top-0 right-0 z-[61] flex h-full w-[380px] max-w-[90vw] flex-col border-l border-white/[0.06] bg-[#0c0c14]/95 backdrop-blur-xl shadow-2xl shadow-emerald-900/10"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                    <Sparkles size={18} className="text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-zinc-100">AI Ассистент</h3>
                                    <p className="text-xs text-zinc-500">
                                        {role === "freelancer" ? "Помощь с откликами" : "Помощь с заказами"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {messages.length > 0 && (
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        variant="light"
                                        className="text-zinc-500 hover:text-zinc-300"
                                        onPress={handleClear}
                                        aria-label="Очистить"
                                    >
                                        <Trash2 size={14} />
                                    </Button>
                                )}
                                <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    className="text-zinc-500 hover:text-zinc-300"
                                    onPress={close}
                                    aria-label="Закрыть"
                                >
                                    <X size={16} />
                                </Button>
                            </div>
                        </div>

                        {/* Messages */}
                        <ScrollShadow ref={scrollRef} className="flex-1 p-4 space-y-3 overflow-y-auto scrollbar-styled">
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full gap-4 px-2">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                        <Sparkles size={22} className="text-emerald-400" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-base font-semibold text-white mb-1">Чем могу помочь?</h3>
                                        <p className="text-zinc-500 text-xs">Выберите подсказку или задайте вопрос</p>
                                    </div>
                                    <div className="flex flex-col gap-2 w-full">
                                        {suggestions.map((s, i) => (
                                            <Chip
                                                key={s}
                                                variant="bordered"
                                                className="cursor-pointer w-full justify-start hover:bg-emerald-600/15 hover:border-emerald-500/40 hover:text-emerald-300 transition-all duration-200 border-zinc-700/60 text-zinc-300 text-xs px-1 animate-fade-in-up"
                                                style={{ animationDelay: `${i * 80}ms` }}
                                                onClick={() => { void handleSend(s); }}
                                            >
                                                {s}
                                            </Chip>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {messages.map((msg, i) => (
                                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                    {msg.role === "assistant" && (
                                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-1">
                                            <Bot size={14} className="text-emerald-400" />
                                        </div>
                                    )}
                                    <div className="max-w-[80%]">
                                        <div
                                            className={`rounded-2xl px-3 py-2 ${msg.role === "user"
                                                ? "bg-emerald-600/20 border border-emerald-500/20 text-zinc-200"
                                                : "bg-zinc-800/50 border border-zinc-700/30 text-zinc-300"
                                                }`}
                                        >
                                            <div className="text-xs whitespace-pre-wrap leading-relaxed space-y-1">
                                                {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
                                            </div>
                                        </div>
                                        <p className={`text-[9px] text-zinc-600 mt-0.5 ${msg.role === "user" ? "text-right" : "text-left"}`}>
                                            {formatTime(msg.timestamp)}
                                        </p>
                                    </div>
                                    {msg.role === "user" && (
                                        <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0 mt-1">
                                            <User size={14} className="text-zinc-400" />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                                <div className="flex gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                        <Bot size={14} className="text-emerald-400" />
                                    </div>
                                    <div className="bg-zinc-800/50 border border-zinc-700/30 rounded-2xl px-3 py-2">
                                        <div className="flex gap-1.5">
                                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </ScrollShadow>

                        {/* Input */}
                        <div className="p-3 border-t border-white/[0.06]">
                            <div className="flex gap-2">
                                <Input
                                    aria-label="Задайте вопрос AI"
                                    placeholder="Задайте вопрос..."
                                    value={input}
                                    onValueChange={setInput}
                                    onKeyDown={handleKeyDown}
                                    variant="bordered"
                                    size="sm"
                                    classNames={{
                                        inputWrapper: "bg-zinc-900/50 border-zinc-700/50 hover:border-emerald-500/40",
                                        input: "text-zinc-200 placeholder:text-zinc-600 text-xs",
                                    }}
                                    className="flex-1"
                                    isDisabled={isStreaming}
                                />
                                {isStreaming ? (
                                    <Button isIconOnly size="sm" className="bg-red-600/20 text-red-400 border border-red-600/30" onPress={() => { void stop(); }} aria-label="Остановить">
                                        <Square size={14} />
                                    </Button>
                                ) : (
                                    <Button isIconOnly size="sm" className="bg-emerald-600 text-white hover:bg-emerald-500" onPress={() => { void handleSend(); }} aria-label="Отправить">
                                        <Send size={14} />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
