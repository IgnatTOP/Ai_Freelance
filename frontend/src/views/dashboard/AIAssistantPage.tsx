"use client";

import { useState, useRef, useEffect } from "react";
import { Input, Button, ScrollShadow, Chip } from "@heroui/react";
import { Send, Sparkles, Bot, User, Square, Trash2 } from "lucide-react";
import { useSessionStore } from "@/shared/store/session.store";
import { useAIAssistant } from "@/features/ai-assistant";
import { PageHeader } from "@/shared/ui/page-header/PageHeader";

type ChatMessage = { role: "user" | "assistant"; content: string; timestamp: number };

const CLIENT_SUGGESTIONS = [
    "Помоги составить описание заказа",
    "Как выбрать фрилансера?",
    "Оптимальный бюджет для веб-сайта",
];

const FREELANCER_SUGGESTIONS = [
    "Помоги написать отклик",
    "Как составить портфолио?",
    "Советы по ценообразованию",
];

/* ── Safe markdown renderer (no dangerouslySetInnerHTML) ── */
const renderInline = (text: string, keyPrefix: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    // Split by bold (**text**) and inline code (`text`)
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
            parts.push(<code key={`${keyPrefix}-c${idx}`} className="bg-zinc-800 text-emerald-300 px-1.5 py-0.5 rounded text-xs font-mono">{match[2]}</code>);
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

        // Bullet lists
        if (/^[-•]\s/.test(line)) {
            elements.push(
                <div key={i} className="flex gap-2 ml-1">
                    <span className="text-emerald-400 mt-0.5 shrink-0">•</span>
                    <span>{renderInline(line.replace(/^[-•]\s/, ""), `${i}`)}</span>
                </div>
            );
            continue;
        }

        // Numbered lists
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

        // Empty line = paragraph break
        if (!line.trim()) {
            elements.push(<div key={i} className="h-2" />);
            continue;
        }

        elements.push(
            <span key={i}>{renderInline(line, `${i}`)}</span>
        );
        if (i < lines.length - 1 && lines[i + 1]?.trim()) {
            elements.push(<br key={`br-${i}`} />);
        }
    }

    return elements;
};

const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

export const AIAssistantPage = () => {
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

    const handleClear = () => {
        setMessages([]);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] animate-fade-in-up">
            <div className="flex items-center justify-between gap-4 mb-4">
                <PageHeader
                    title="AI Ассистент"
                    description={role === "freelancer" ? "Помощь с откликами и портфолио" : "Помощь с заказами и подбором"}
                />
                {messages.length > 0 && (
                    <Button
                        size="sm"
                        variant="flat"
                        className="text-zinc-400 hover:text-zinc-200 shrink-0"
                        startContent={<Trash2 size={14} />}
                        onPress={handleClear}
                    >
                        Очистить
                    </Button>
                )}
            </div>

            {/* Chat area */}
            <div className="flex-1 glass-card rounded-2xl flex flex-col overflow-hidden">
                <ScrollShadow ref={scrollRef} className="flex-1 p-6 space-y-4 overflow-y-auto scrollbar-styled">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <Sparkles size={28} className="text-emerald-400" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-white mb-2">Чем могу помочь?</h3>
                                <p className="text-zinc-500 text-sm max-w-md">Задайте вопрос или выберите одну из подсказок ниже</p>
                            </div>
                            <div className="flex flex-wrap gap-3 justify-center max-w-lg">
                                {suggestions.map((s, i) => (
                                    <Chip
                                        key={s}
                                        variant="bordered"
                                        size="lg"
                                        className="cursor-pointer hover:bg-emerald-600/15 hover:border-emerald-500/40 hover:text-emerald-300 hover:shadow-[0_0_12px_rgba(168,85,247,0.15)] transition-all duration-300 border-zinc-700/60 text-zinc-300 px-1 animate-fade-in-up"
                                        style={{ animationDelay: `${i * 120}ms` }}
                                        onClick={() => { void handleSend(s); }}
                                    >
                                        {s}
                                    </Chip>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                            {msg.role === "assistant" && (
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-1">
                                    <Bot size={16} className="text-emerald-400" />
                                </div>
                            )}
                            <div className="max-w-[75%]">
                                <div
                                    className={`rounded-2xl px-4 py-3 ${msg.role === "user"
                                        ? "bg-emerald-600/20 border border-emerald-500/20 text-zinc-200"
                                        : "bg-zinc-800/50 border border-zinc-700/30 text-zinc-300"
                                        }`}
                                >
                                    <div className="text-sm whitespace-pre-wrap leading-relaxed space-y-1">
                                        {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
                                    </div>
                                </div>
                                <p className={`text-[10px] text-zinc-600 mt-1 ${msg.role === "user" ? "text-right" : "text-left"}`}>
                                    {formatTime(msg.timestamp)}
                                </p>
                            </div>
                            {msg.role === "user" && (
                                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0 mt-1">
                                    <User size={16} className="text-zinc-400" />
                                </div>
                            )}
                        </div>
                    ))}

                    {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <Bot size={16} className="text-emerald-400" />
                            </div>
                            <div className="bg-zinc-800/50 border border-zinc-700/30 rounded-2xl px-4 py-3">
                                <div className="flex gap-1.5">
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" />
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                                </div>
                            </div>
                        </div>
                    )}
                </ScrollShadow>

                {/* Input */}
                <div className="p-4 border-t border-white/[0.06]">
                    <div className="flex gap-2">
                        <Input
                            aria-label="Задайте вопрос AI"
                            placeholder="Задайте вопрос AI..."
                            value={input}
                            onValueChange={setInput}
                            onKeyDown={handleKeyDown}
                            variant="bordered"
                            classNames={{
                                inputWrapper: "bg-zinc-900/50 border-zinc-700/50 hover:border-emerald-500/40",
                                input: "text-zinc-200 placeholder:text-zinc-600",
                            }}
                            className="flex-1"
                            isDisabled={isStreaming}
                        />
                        {isStreaming ? (
                            <Button isIconOnly className="bg-red-600/20 text-red-400 border border-red-600/30" onPress={() => { void stop(); }} aria-label="Остановить">
                                <Square size={16} />
                            </Button>
                        ) : (
                            <Button isIconOnly className="bg-emerald-600 text-white hover:bg-emerald-500" onPress={() => { void handleSend(); }} aria-label="Отправить">
                                <Send size={18} />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
