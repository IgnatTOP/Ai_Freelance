"use client";

import { useEffect, useRef, useState } from "react";
import { useAIAssistant } from "@/features/ai-assistant";
import { useSessionStore } from "@/shared/store/session.store";
import {
    FilkaAISphere,
    FilkaButton,
    FilkaCard,
    FilkaChip,
    FilkaInput,
    FilkaSpinner,
    IconClose as Square,
    IconProfile as User,
    IconSend as Send,
    IconSpark as Bot,
    IconSpark as Sparkles,
    IconTrash as Trash2,
} from "@/shared/ui/filka";

void FilkaAISphere;
void FilkaSpinner;

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

const renderInline = (text: string, keyPrefix: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|`([^`]+)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[1]) {
      parts.push(<strong key={`${keyPrefix}-b${idx}`} className="font-semibold text-[var(--fg-0)]">{match[1]}</strong>);
    } else if (match[2]) {
      parts.push(<code key={`${keyPrefix}-c${idx}`} className="rounded bg-[var(--bg-3)] px-1.5 py-0.5 text-[11px] text-[var(--mint-200)]">{match[2]}</code>);
    }
    lastIndex = match.index + match[0].length;
    idx += 1;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
};

const renderMarkdown = (text: string) => {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (!line && i > 0 && !(lines[i - 1] ?? "")) continue;

    const headingMatch = line.match(/^#{1,6}\s+(.+)/);
    if (headingMatch) {
      elements.push(
        <div key={i} className="mt-2 text-[14px] font-semibold text-[var(--fg-0)]">
          {renderInline(headingMatch[1] ?? "", `${i}`)}
        </div>,
      );
      continue;
    }

    if (/^[-•]\s/.test(line)) {
      elements.push(
        <div key={i} className="ml-1 flex gap-2">
          <span className="mt-0.5 shrink-0 text-[var(--mint-300)]">•</span>
          <span>{renderInline(line.replace(/^[-•]\s/, ""), `${i}`)}</span>
        </div>,
      );
      continue;
    }

    const numMatch = line.match(/^(\d+)[.)]\s(.*)/);
    if (numMatch) {
      elements.push(
        <div key={i} className="ml-1 flex gap-2">
          <span className="w-5 shrink-0 text-right font-medium text-[var(--mint-300)]">{numMatch[1]}.</span>
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

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

export const AIAssistantPage = () => {
  const role = useSessionStore((state) => state.role);
  const { text: streamingText, isStreaming, start, stop } = useAIAssistant();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestions = role === "freelancer" ? FREELANCER_SUGGESTIONS : CLIENT_SUGGESTIONS;

  useEffect(() => {
    if (!streamingText) return;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant") {
        return [...prev.slice(0, -1), { ...last, content: streamingText }];
      }
      return [...prev, { role: "assistant", content: streamingText, timestamp: Date.now() }];
    });
  }, [streamingText]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const prompt = text ?? input.trim();
    if (!prompt) return;
    setMessages((prev) => [...prev, { role: "user", content: prompt, timestamp: Date.now() }]);
    setInput("");
    await start(prompt);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <div className="space-y-5">
          <div
            className="relative overflow-hidden rounded-[20px] border p-5"
            style={{
              background:
                "radial-gradient(ellipse 65% 85% at 85% 15%, rgba(52,211,153,0.18), transparent 65%)," +
                "linear-gradient(180deg, rgba(52,211,153,0.10), rgba(16,185,129,0.03)), var(--bg-1)",
              borderColor: "rgba(52,211,153,0.22)",
            }}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-[14px] bg-[var(--grad-ai-sphere)] shadow-[var(--shadow-glow-soft)]">
                <Sparkles size={20} className="text-[#062219]" />
              </div>
              <div>
                <div className="text-[15px] font-bold tracking-[-0.01em] text-[var(--fg-0)]">Филка · AI-ассистент</div>
                <div className="t-caption flex items-center gap-1.5">
                  <span className="dot-live h-[6px] w-[6px]" />
                  {isStreaming ? "анализирует вопрос" : "готов помочь"}
                </div>
              </div>
            </div>
            <div className="space-y-3 text-[13.5px] leading-[1.55] text-[var(--fg-1)]">
              <p>Ассистент помогает с брифами, бюджетами, откликами, рисками и формулировками прямо внутри платформы.</p>
              <p>Ответы учитывают роль пользователя: заказчик получает помощь по ТЗ и найму, исполнитель — по откликам и упаковке профиля.</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <FilkaChip>AI · contextual</FilkaChip>
              <FilkaChip tone="muted">briefing</FilkaChip>
              <FilkaChip tone="muted">pricing</FilkaChip>
            </div>
          </div>

          <FilkaCard className="p-5">
            <div className="t-eyebrow mb-3">БЫСТРЫЕ ЗАПРОСЫ</div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void handleSend(suggestion)}
                  className="inline-flex items-center gap-1 rounded-full border border-[rgba(52,211,153,0.18)] bg-[rgba(52,211,153,0.08)] px-3 py-2 text-[12px] text-[var(--mint-200)]"
                >
                  <Sparkles size={10} />
                  {suggestion}
                </button>
              ))}
            </div>
          </FilkaCard>

          <FilkaCard className="p-5">
            <div className="t-eyebrow mb-3">СЦЕНАРИИ</div>
            <div className="space-y-3 text-[13px] text-[var(--fg-1)]">
              <div className="rounded-[12px] border border-[var(--line)] bg-[var(--bg-1)] p-3">
                <div className="mb-1 font-semibold text-[var(--fg-0)]">Для заказчика</div>
                <div>Собрать ТЗ, оценить реалистичный бюджет, сравнить кандидатов, подготовить сообщение в чат.</div>
              </div>
              <div className="rounded-[12px] border border-[var(--line)] bg-[var(--bg-1)] p-3">
                <div className="mb-1 font-semibold text-[var(--fg-0)]">Для фрилансера</div>
                <div>Составить отклик, усилить портфолио, рассчитать ставку и подобрать аргументы под заказ.</div>
              </div>
            </div>
          </FilkaCard>
        </div>

        <FilkaCard className="flex h-[calc(100vh-11.5rem)] min-h-[720px] flex-col overflow-hidden p-0">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
            <div>
              <div className="text-[18px] font-bold tracking-[-0.02em] text-[var(--fg-0)]">AI Ассистент</div>
              <div className="text-[12px] text-[var(--fg-3)]">
                {role === "freelancer" ? "Помощь с откликами и профилем" : "Помощь с заказами и подбором"}
              </div>
            </div>
            {messages.length > 0 ? (
              <FilkaButton variant="ghost" size="sm" startContent={<Trash2 size={13} />} onClick={() => setMessages([])}>
                Очистить
              </FilkaButton>
            ) : null}
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-[20px] border border-[rgba(52,211,153,0.18)] bg-[rgba(52,211,153,0.08)] text-[var(--mint-300)]">
                  <Sparkles size={28} />
                </div>
                <div>
                  <h3 className="mb-2 text-[20px] font-semibold tracking-[-0.02em] text-[var(--fg-0)]">Чем могу помочь?</h3>
                  <p className="mx-auto max-w-[460px] text-[14px] leading-[1.6] text-[var(--fg-3)]">
                    Задайте вопрос в свободной форме. Я подскажу текст заказа, отклика, бюджет, структуру проекта или помогу разобрать риск по сделке.
                  </p>
                </div>
                <div className="flex max-w-[560px] flex-wrap justify-center gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void handleSend(suggestion)}
                      className="rounded-full border border-[var(--line)] bg-[var(--bg-2)] px-4 py-2 text-[13px] text-[var(--fg-1)] transition-colors hover:border-[rgba(52,211,153,0.22)] hover:bg-[rgba(52,211,153,0.08)] hover:text-[var(--mint-200)]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div key={`${message.timestamp}-${index}`} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    {message.role === "assistant" ? (
                      <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-[rgba(52,211,153,0.18)] bg-[rgba(52,211,153,0.08)] text-[var(--mint-300)]">
                        <Bot size={16} />
                      </div>
                    ) : null}
                    <div className="max-w-[78%]">
                      <div
                        className={`rounded-[16px] border px-4 py-3 text-[14px] leading-[1.6] ${
                          message.role === "user"
                            ? "border-[rgba(52,211,153,0.22)] bg-[rgba(52,211,153,0.14)] text-[var(--fg-0)]"
                            : "border-[var(--line)] bg-[var(--bg-2)] text-[var(--fg-1)]"
                        }`}
                      >
                        {message.role === "assistant" ? renderMarkdown(message.content) : message.content}
                      </div>
                      <div className={`mt-1 text-[10px] text-[var(--fg-3)] ${message.role === "user" ? "text-right" : "text-left"}`}>
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                    {message.role === "user" ? (
                      <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-[var(--line)] bg-[var(--bg-2)] text-[var(--fg-2)]">
                        <User size={15} />
                      </div>
                    ) : null}
                  </div>
                ))}

                {isStreaming && messages[messages.length - 1]?.role !== "assistant" ? (
                  <div className="flex gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-[10px] border border-[rgba(52,211,153,0.18)] bg-[rgba(52,211,153,0.08)] text-[var(--mint-300)]">
                      <Bot size={16} />
                    </div>
                    <div className="rounded-[14px] border border-[var(--line)] bg-[var(--bg-2)] px-4 py-3">
                      <div className="flex gap-1.5">
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="border-t border-[var(--line)] px-5 py-4">
            <div className="flex gap-2">
              <FilkaInput
                aria-label="Задайте вопрос AI"
                placeholder="Задайте вопрос AI..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                className="h-11 flex-1"
                disabled={isStreaming}
              />
              {isStreaming ? (
                <FilkaButton variant="danger" size="sm" className="h-11 w-11 px-0" onClick={() => void stop()}>
                  <Square size={16} />
                </FilkaButton>
              ) : (
                <FilkaButton size="sm" className="h-11 w-11 px-0" onClick={() => void handleSend()}>
                  <Send size={16} />
                </FilkaButton>
              )}
            </div>
          </div>
        </FilkaCard>
      </section>
    </div>
  );
};
