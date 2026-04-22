"use client";

import { Divider, Link } from "@heroui/react";
import { Send, Github } from "lucide-react";
import { Logo } from "@/shared/ui/logo/Logo";

const FOOTER_LINKS = {
    "О платформе": [
        { label: "О нас", href: "#" },
        { label: "Блог", href: "#" },
        { label: "Карьера", href: "#" },
        { label: "Пресса", href: "#" },
    ],
    "Для клиентов": [
        { label: "Как разместить заказ", href: "#" },
        { label: "Поиск фрилансеров", href: "#" },
        { label: "Escrow-защита", href: "#" },
        { label: "Тарифы", href: "#" },
    ],
    "Для фрилансеров": [
        { label: "Как начать", href: "#" },
        { label: "Поиск заказов", href: "#" },
        { label: "AI-ассистент", href: "#" },
        { label: "Выплаты", href: "#" },
    ],
    "Поддержка": [
        { label: "Центр помощи", href: "#" },
        { label: "Связаться с нами", href: "#" },
        { label: "Условия", href: "#" },
        { label: "Конфиденциальность", href: "#" },
    ],
} as const;

const SOCIAL_LINKS = [
    { label: "Telegram", Icon: Send },
    { label: "GitHub", Icon: Github },
] as const;

export const Footer = () => (
    <footer className="bg-[#0a0a0f] border-t border-transparent" style={{ borderImage: "linear-gradient(90deg, transparent, rgba(139,92,246,0.2), transparent) 1" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 md:py-20">
            {/* Links grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-14">
                {/* Brand column */}
                <div className="col-span-2 md:col-span-1">
                    <Logo size="sm" />
                    <p className="mt-4 text-zinc-500 text-sm leading-relaxed max-w-xs">
                        Фриланс-биржа нового поколения с AI-подбором и безопасным escrow.
                    </p>
                </div>

                {/* Link columns */}
                {Object.entries(FOOTER_LINKS).map(([title, links]) => (
                    <div key={title}>
                        <h4 className="text-sm font-semibold text-zinc-300 mb-4">{title}</h4>
                        <ul className="space-y-2.5">
                            {links.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        color="foreground"
                                        className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <Divider className="bg-zinc-800/50" />

            {/* Bottom bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8">
                <p className="text-sm text-zinc-500">
                    © {new Date().getFullYear()} НейроБиржа. Все права защищены.
                </p>
                <div className="flex items-center gap-4">
                    {SOCIAL_LINKS.map((social) => (
                        <Link
                            key={social.label}
                            href="#"
                            aria-label={social.label}
                            className="text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            <social.Icon size={18} strokeWidth={1.8} />
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    </footer>
);
