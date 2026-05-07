"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSessionStore } from "@/shared/store/session.store";
import { useAIAssistant } from "@/features/ai-assistant";
import { useAIFloatingStore } from "./store";
import {
    FilkaAISphere,
    FilkaSpinner,
    FilkaTypingDots,
    IconClose,
    IconMic,
    IconSend,
    IconSpark,
    IconTrash,
} from "@/shared/ui/filka";

type ChatMessage = { role: "user" | "assistant"; content: string; timestamp: number };

const CLIENT_SUGGESTIONS = [
    "Помоги составить описание заказа",
    "Как выбрать исполнителя?",
    "Оптимальный бюджет для проекта",
];

const FREELANCER_SUGGESTIONS = [
    "Помоги написать отклик",
    "Как составить портфолио?",
    "Советы по ценообразованию",
];

const renderInline = (text: string, keyPrefix: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const regex = /\*\*(.+?)\*\*|`([^`]+)`/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let idx = 0;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
        if (match[1]) {
            parts.push(
                <strong key={`${keyPrefix}-b${idx}`} className="font-semibold">
                    {match[1]}
                </strong>,
            );
        } else if (match[2]) {
            parts.push(
                <code
                    key={`${keyPrefix}-c${idx}`}
                    className="t-mono rounded px-1 py-0.5 text-[12px]"
                    style={{ background: "var(--bg-3)", color: "var(--mint-300)" }}
                >
                    {match[2]}
                </code>,
            );
        }
        lastIndex = match.index + match[0].length;
        idx++;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
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
                <div key={i} className="ml-1 flex gap-2">
                    <span className="mt-0.5 shrink-0" style={{ color: "var(--mint-300)" }}>
                        •
                    </span>
                    <span>{renderInline(line.replace(/^[-•]\s/, ""), `${i}`)}</span>
                </div>,
            );
            continue;
        }
        const numMatch = line.match(/^(\d+)[.)]\s(.*)/);
        if (numMatch) {
            elements.push(
                <div key={i} className="ml-1 flex gap-2">
                    <span
                        className="t-mono w-5 shrink-0 text-right font-medium tabular-nums"
                        style={{ color: "var(--mint-300)" }}
                    >
                        {numMatch[1]}.
                    </span>
                    <span>{renderInline(numMatch[2] ?? "", `${i}`)}</span>
                </div>,
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

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [isOpen, close]);

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

    if (!isOpen || typeof document === "undefined") return null;

    return createPortal(
        <>
            <div
                className="fixed inset-0 z-[60] lg:hidden"
                style={{ background: "rgba(5,6,15,0.6)", backdropFilter: "blur(4px)" }}
                onClick={close}
                role="presentation"
            />
            <aside
                className="fixed right-0 top-0 z-[61] flex h-full w-[400px] max-w-[92vw] flex-col border-l shadow-[var(--shadow-lg)]"
                style={{ background: "rgba(10,11,20,0.95)", borderColor: "var(--line-2)", backdropFilter: "blur(20px)" }}
                role="dialog"
                aria-label="AI-ассистент"
            >
                <header className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--line)" }}>
                    <div className="flex items-center gap-3">
                        <FilkaAISphere size={36} speaking={isStreaming} />
                        <div>
                            <div className="text-sm font-semibold">AI-ассистент</div>
                            <div className="t-caption flex items-center gap-1.5 text-[11px]">
                                {isStreaming ? (
                                    <>
                                        <FilkaTypingDots />
                                        думает…
                                    </>
                                ) : (
                                    "готов помочь"
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {messages.length > 0 ? (
                            <button
                                type="button"
                                onClick={() => setMessages([])}
                                className="grid h-8 w-8 place-items-center rounded-md text-[var(--fg-2)] hover:bg-[var(--bg-3)] hover:text-[var(--fg-0)]"
                                aria-label="Очистить диалог"
                            >
                                <IconTrash size={14} />
                            </button>
                        ) : null}
                        <button
                            type="button"
                            onClick={close}
                            className="grid h-8 w-8 place-items-center rounded-md text-[var(--fg-2)] hover:bg-[var(--bg-3)] hover:text-[var(--fg-0)]"
                            aria-label="Закрыть"
                        >
                            <IconClose size={16} />
                        </button>
                    </div>
                </header>

                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 f-scroll">
                    {messages.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center gap-4 px-2 text-center">
                            <div
                                className="grid h-12 w-12 place-items-center rounded-[var(--r-md)]"
                                style={{
                                    background: "rgba(102,58,243,0.1)",
                                    border: "1px solid rgba(102,58,243,0.22)",
                                    color: "var(--mint-300)",
                                }}
                            >
                                <IconSpark size={22} />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold">Чем могу помочь?</h3>
                                <p className="text-xs" style={{ color: "var(--fg-2)" }}>
                                    Задайте вопрос или выберите подсказку
                                </p>
                            </div>
                            <div className="flex w-full flex-col gap-2">
                                {suggestions.map((s, i) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => void handleSend(s)}
                                        className="filka-chip filka-chip-muted animate-fade-in-up cursor-pointer justify-start"
                                        style={{ animationDelay: `${i * 80}ms` }}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {messages.map((msg, i) => (
                        <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                            {msg.role === "assistant" ? (
                                <div
                                    className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-md"
                                    style={{ background: "var(--grad-ai-sphere)" }}
                                />
                            ) : null}
                            <div className="max-w-[80%]">
                                <div
                                    className="rounded-[12px] px-3 py-2 text-[13px] leading-relaxed"
                                    style={{
                                        background:
                                            msg.role === "user" ? "rgba(102,58,243,0.14)" : "var(--bg-3)",
                                        border: `1px solid ${msg.role === "user" ? "rgba(102,58,243,0.22)" : "var(--line)"}`,
                                        color: "var(--fg-0)",
                                        borderTopLeftRadius: msg.role === "assistant" ? 4 : undefined,
                                        borderTopRightRadius: msg.role === "user" ? 4 : undefined,
                                    }}
                                >
                                    <div className="space-y-1 whitespace-pre-wrap">
                                        {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
                                    </div>
                                </div>
                                <p
                                    className="mt-0.5 text-[10px]"
                                    style={{
                                        color: "var(--fg-3)",
                                        textAlign: msg.role === "user" ? "right" : "left",
                                    }}
                                >
                                    {formatTime(msg.timestamp)}
                                </p>
                            </div>
                        </div>
                    ))}

                    {isStreaming && messages[messages.length - 1]?.role !== "assistant" ? (
                        <div className="flex gap-2">
                            <div
                                className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-md"
                                style={{ background: "var(--grad-ai-sphere)" }}
                            />
                            <div
                                className="rounded-[12px] px-3 py-2"
                                style={{
                                    background: "var(--bg-3)",
                                    border: "1px solid var(--line)",
                                    borderTopLeftRadius: 4,
                                }}
                            >
                                <FilkaTypingDots />
                            </div>
                        </div>
                    ) : null}
                </div>

                <footer className="border-t p-3" style={{ borderColor: "var(--line)" }}>
                    <div className="flex items-end gap-2">
                        <button
                            type="button"
                            className="grid h-10 w-10 place-items-center rounded-[var(--r-md)] border"
                            style={{ background: "var(--bg-1)", borderColor: "var(--line-2)", color: "var(--fg-2)" }}
                            aria-label="Голос (скоро)"
                            disabled
                        >
                            <IconMic size={16} />
                        </button>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Задайте вопрос…"
                            disabled={isStreaming}
                            rows={1}
                            className="filka-textarea flex-1 resize-none"
                            style={{ minHeight: 40, maxHeight: 120 }}
                        />
                        {isStreaming ? (
                            <button
                                type="button"
                                onClick={() => void stop()}
                                className="grid h-10 w-10 place-items-center rounded-[var(--r-md)]"
                                style={{
                                    background: "rgba(248,113,113,0.14)",
                                    border: "1px solid rgba(248,113,113,0.32)",
                                    color: "var(--err)",
                                }}
                                aria-label="Остановить"
                            >
                                <FilkaSpinner size={14} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => void handleSend()}
                                disabled={!input.trim()}
                                className="filka-btn filka-btn-primary"
                                style={{ height: 40, width: 40, padding: 0 }}
                                aria-label="Отправить"
                            >
                                <IconSend size={16} />
                            </button>
                        )}
                    </div>
                </footer>
            </aside>
        </>,
        document.body,
    );
};
