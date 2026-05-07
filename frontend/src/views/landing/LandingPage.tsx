"use client";

import Link from "next/link";
import { useSessionStore } from "@/shared/store/session.store";
import { usePublicLandingStats } from "@/features/dashboard-stats/usePublicLandingStats";
import { formatMoney } from "@/shared/lib/money";
import {
    FilkaAISphere,
    FilkaCard,
    FilkaChip,
    FilkaTypingDots,
    IconArrowRight,
    IconBook,
    IconBriefcase,
    IconCheck,
    IconChat,
    IconCompass,
    IconLogo,
    IconMic,
    IconPlus,
    IconSearch,
    IconShield,
    IconSpark,
    IconStar,
    IconStarFilled,
    IconUsers,
    IconWallet,
} from "@/shared/ui/filka";

interface NavItem {
    readonly label: string;
    readonly href: string;
    readonly icon: (props: { size?: number }) => React.ReactNode;
    readonly accent?: boolean;
}

const NAV_ITEMS: ReadonlyArray<NavItem> = [
    { label: "Заказы", href: "#market", icon: IconBriefcase as NavItem["icon"] },
    { label: "Исполнители", href: "#freelancers", icon: IconUsers as NavItem["icon"] },
    { label: "AI-ассистент", href: "#ai", icon: IconSpark as NavItem["icon"], accent: true },
    { label: "Эскроу", href: "#escrow", icon: IconShield as NavItem["icon"] },
    { label: "Блог", href: "#faq", icon: IconBook as NavItem["icon"] },
];

const HOW_STEPS = [
    {
        number: "01",
        title: "Опишите задачу словами",
        description: "Голос, текст или файл. AI сам превращает идею в техническое задание с бюджетом, сроком и нужным стеком.",
        icon: IconMic,
    },
    {
        number: "02",
        title: "AI подбирает исполнителей",
        description: "Система сравнивает рейтинг, опыт, загрузку и историю похожих задач. Вы видите 3–5 лучших, а не 200 случайных.",
        icon: IconCompass,
    },
    {
        number: "03",
        title: "Платите через эскроу",
        description: "Деньги резервируются до приёмки работы. Споры и возвраты проходят внутри платформы без ручного хаоса.",
        icon: IconShield,
    },
] as const;

const TRUSTED_BY = ["Восход", "Северная Волна", "Кварц.", "Атлас Платёж", "Нимбус", "Полюс", "Эхо.Лаб"] as const;

const USE_CASES = [
    {
        tag: "СТАРТАПЫ",
        title: "Запускаем продукт без штатной команды",
        description: "Лендинг, мобильный прототип, бот, дизайн-система — всё через одного AI-менеджера, который держит сроки.",
        color: "var(--mint-300)",
        stats: [
            ["7 дн", "до первого деплоя"],
            ["−40%", "к смете подрядчика"],
        ],
    },
    {
        tag: "АГЕНТСТВА",
        title: "Берём овертайм-нагрузку без боли",
        description:
            "Когда клиентов резко становится больше, передайте часть задач проверенным исполнителям через Филку — быстро и с эскроу.",
        color: "var(--accent-peach)",
        stats: [
            ["3.4×", "пиковая ёмкость"],
            ["94%", "сделок без споров"],
        ],
    },
    {
        tag: "ПРОДУКТОВЫЕ",
        title: "Закрываем точечные роли под спринт",
        description: "Нужен анимационный дизайнер на 2 недели или Go-разработчик на короткий цикл? AI находит, эскроу страхует, чат держит контекст.",
        color: "var(--info)",
        stats: [
            ["12 400+", "профилей"],
            ["4.9 ★", "медиана рейтинга"],
        ],
    },
] as const;

interface Testimonial {
    readonly large?: boolean;
    readonly gradient: string;
    readonly who: string;
    readonly role: string;
    readonly text: string;
    readonly metric?: string;
}

const TESTIMONIALS: ReadonlyArray<Testimonial> = [
    {
        large: true,
        gradient: "linear-gradient(135deg,#B6D9FC,#4F2BC7)",
        who: "Анна К.",
        role: "Руководитель продукта · Атлас Платёж",
        text: "За полтора часа Филка нашла нам фронтенд-разработчика, написала техзадание за нас и развела эскроу. То, на что я обычно тратила неделю переписки на трёх биржах сразу.",
        metric: "92% дешевле штатного найма",
    },
    {
        gradient: "linear-gradient(135deg,#FFB38A,#F5E27A)",
        who: "Илья С.",
        role: "Гендиректор · Нимбус",
        text: "Передали четыре спринта на Филку и закрыли всё в срок. Особенно ценно, что AI ловит риски в чате раньше, чем они становятся проблемой.",
    },
    {
        gradient: "linear-gradient(135deg,#7DD3FC,#0284C7)",
        who: "Мария В.",
        role: "Дизайнер-исполнитель",
        text: "Я больше не плачу 30% бирже за продвижение. Заказы приходят сами, эскроу гарантирует оплату, а спор за полгода был ровно один — и решён за день.",
    },
];

interface PricingPlan {
    readonly name: string;
    readonly price: string;
    readonly sub: string;
    readonly fee: string;
    readonly features: readonly string[];
    readonly cta: string;
    readonly primary: boolean;
    readonly badge?: string;
}

const PRICING: ReadonlyArray<PricingPlan> = [
    {
        name: "Базовый",
        price: "0 ₽",
        sub: "вечно бесплатно",
        fee: "8% от сделки",
        features: ["AI-ассистент для брифов", "Поиск исполнителей", "Эскроу", "Чат с подсказками", "Споры за 24 часа"],
        cta: "Начать",
        primary: false,
    },
    {
        name: "Команда",
        price: "1 990 ₽",
        sub: "за пользователя в месяц",
        fee: "5% от сделки",
        badge: "ПОПУЛЯРНЫЙ",
        features: [
            "Всё из «Базового»",
            "Бюджеты и роли",
            "AI-метрики команды",
            "Шаблоны техзаданий",
            "Приоритетный мэтчинг",
            "Юрлицо и счета-фактуры",
        ],
        cta: "Попробовать 14 дней",
        primary: true,
    },
    {
        name: "Корпоратив",
        price: "По запросу",
        sub: "от 50 пользователей",
        fee: "от 3% от сделки",
        features: ["Всё из «Команды»", "Единый вход и каталог", "Свой арбитраж", "Кастомный AI-агент", "Выделенный менеджер", "Локальный эскроу"],
        cta: "Связаться",
        primary: false,
    },
];

const FAQS = [
    {
        q: "Что если исполнитель пропадёт после получения аванса?",
        a: "Ничего — деньги остаются в эскроу, не у него. Если исполнитель выпадает надолго, мы возвращаем средства или помогаем быстро подобрать замену.",
    },
    {
        q: "Как AI понимает, кто мне подойдёт?",
        a: "Модель смотрит на стек, опыт в похожих задачах, рейтинг, текущую загрузку, скорость ответов и историю споров. Каждый кандидат получает объяснение, почему он в шорт-листе.",
    },
    {
        q: "Платформа удерживает НДС и формирует закрывающие документы?",
        a: "Да. Для самозанятых формируются чеки, для ИП и юрлиц доступны документы и сценарии оплаты для командных тарифов.",
    },
    {
        q: "Можно ли работать со своими исполнителями через Филку?",
        a: "Да, есть приватный режим: вы зовёте конкретных людей по ссылке и всё равно пользуетесь эскроу, AI-подсказками и прозрачным контуром сделки.",
    },
    {
        q: "Какие есть гарантии по срокам?",
        a: "Каждый заказ можно разбить на этапы с дедлайнами. При риске просрочки AI заранее подсвечивает проблему и предлагает план действий.",
    },
] as const;

const FOOTER_COLUMNS = [
    { title: "Продукт", items: ["AI-ассистент", "Эскроу", "Безопасные сделки", "API", "Интеграции"] },
    { title: "Для кого", items: ["Стартапам", "Агентствам", "Корпорациям", "Исполнителям", "Командам"] },
    { title: "Компания", items: ["О нас", "Карьера", "Блог", "Пресс-кит", "Контакты"] },
    { title: "Поддержка", items: ["База знаний", "Арбитраж", "Документы", "Безопасность", "Статус"] },
] as const;

export const LandingPage = () => {
    const userId = useSessionStore((state) => state.userId);
    const { data: stats } = usePublicLandingStats();

    const totalUsers = stats?.freelancers_total ?? 12_400;
    const completed = stats?.completed_projects ?? 0;
    const volume = stats?.marketplace_volume ?? 0;
    const avgRating = stats?.average_rating ?? 4.9;

    const heroStats = [
        [
            `${totalUsers.toLocaleString("ru-RU")}+`,
            "исполнителей на платформе",
        ],
        ["94%", "заказов с мэтчем от AI"],
        ["2.4 мин", "до первого отклика"],
    ];

    return (
        <main
            className="relative min-h-screen overflow-hidden text-[var(--fg-0)]"
            style={{ background: "var(--bg-0)" }}
        >
            <div className="pointer-events-none absolute inset-0" style={{ background: "var(--grad-hero)" }} />

            <div className="relative z-10 mx-auto max-w-[1440px]">
                <div className="px-5 pt-5 sm:px-8 lg:hidden">
                    <div
                        className="flex items-center justify-between rounded-full border bg-[rgba(12,24,18,0.55)] px-4 py-3 backdrop-blur-xl"
                        style={{ borderColor: "rgba(186,215,247,0.14)" }}
                    >
                        <Link href="/" className="flex items-center gap-2">
                            <IconLogo size={26} />
                            <span className="text-[15px] font-bold tracking-[-0.015em]">Филка</span>
                        </Link>
                        {userId ? (
                            <Link href="/dashboard" className="filka-btn filka-btn-primary filka-btn-sm">
                                Кабинет
                            </Link>
                        ) : (
                            <Link href="/register" className="filka-btn filka-btn-primary filka-btn-sm">
                                Начать
                            </Link>
                        )}
                    </div>
                </div>

                <div className="hidden justify-center px-8 pt-5 lg:flex lg:px-14">
                    <nav
                        className="flex items-center gap-1 overflow-x-auto rounded-full border px-2 py-2"
                        style={{
                            background: "rgba(12, 24, 18, 0.55)",
                            backdropFilter: "blur(28px) saturate(1.6)",
                            WebkitBackdropFilter: "blur(28px) saturate(1.6)",
                            borderColor: "rgba(186,215,247,0.14)",
                            boxShadow:
                                "0 1px 0 rgba(255,255,255,0.06) inset, 0 -1px 0 rgba(0,0,0,0.4) inset, 0 18px 50px rgba(0,0,0,0.45), 0 6px 18px rgba(0,0,0,0.3)",
                        }}
                    >
                        <Link href="/" className="mr-1 flex h-9 items-center gap-2 border-r pl-1 pr-4" style={{ borderColor: "rgba(186,215,247,0.1)" }}>
                            <IconLogo size={26} />
                            <span className="text-[15px] font-bold tracking-[-0.015em]">Филка</span>
                        </Link>

                        {NAV_ITEMS.map((item) => {
                            const Icon = item.icon;
                            return (
                                <a
                                    key={item.label}
                                    href={item.href}
                                    className="flex h-9 items-center gap-2 rounded-full px-4 text-[13.5px] font-medium transition-all"
                                    style={{
                                        color: item.accent ? "var(--mint-200)" : "var(--fg-1)",
                                        background: item.accent ? "rgba(102,58,243,0.12)" : "transparent",
                                        border: item.accent ? "1px solid rgba(102,58,243,0.22)" : "1px solid transparent",
                                    }}
                                >
                                    <Icon size={15} />
                                    {item.label}
                                </a>
                            );
                        })}

                        <div className="mx-2 h-[22px] w-px" style={{ background: "rgba(186,215,247,0.12)" }} />

                        <button type="button" className="grid h-9 w-9 place-items-center rounded-full" style={{ color: "var(--fg-1)" }} aria-label="Поиск">
                            <IconSearch size={16} />
                        </button>

                        {userId ? (
                            <Link href="/dashboard" className="filka-btn filka-btn-primary filka-btn-sm">
                                Кабинет <IconArrowRight size={13} />
                            </Link>
                        ) : (
                            <>
                                <Link href="/login" className="filka-btn filka-btn-ghost filka-btn-sm">
                                    Войти
                                </Link>
                                <Link href="/register" className="filka-btn filka-btn-primary filka-btn-sm">
                                    Начать <IconArrowRight size={13} />
                                </Link>
                            </>
                        )}
                    </nav>
                </div>

                <section className="grid items-center gap-12 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:px-14 lg:pb-20 lg:pt-14">
                    <div>
                        <FilkaChip className="mb-5">
                            <IconSpark size={12} /> Встроенный AI · Версия 0.4
                        </FilkaChip>
                        <h1 className="t-display mb-5">
                            Фриланс, который <br />
                            <span className="gradient-text">сам находит своих.</span>
                        </h1>
                        <p
                            className="t-body mb-7 max-w-[520px] text-[17px] leading-[1.55]"
                            style={{ color: "var(--fg-1)" }}
                        >
                            Филка — биржа с AI-ассистентом, который за вас пишет техзадание, подбирает исполнителей и
                            охраняет деньги в эскроу. Меньше переписки, больше результата.
                        </p>
                        <div className="mb-10 flex flex-col gap-3 sm:flex-row">
                            {userId ? (
                                <Link href="/dashboard/orders/new" className="filka-btn filka-btn-primary filka-btn-lg">
                                    Создать заказ через AI <IconArrowRight size={16} />
                                </Link>
                            ) : (
                                <Link href="/register" className="filka-btn filka-btn-primary filka-btn-lg">
                                    Опишите задачу — AI поможет <IconArrowRight size={16} />
                                </Link>
                            )}
                            <Link
                                href={userId ? "/dashboard/orders" : "/login"}
                                className="filka-btn filka-btn-ghost filka-btn-lg"
                            >
                                Я исполнитель
                            </Link>
                        </div>
                        <div className="grid max-w-[640px] gap-5 sm:grid-cols-3 sm:gap-8">
                            {heroStats.map(([value, label], index) => (
                                <div key={label} className="relative">
                                    {index > 0 ? (
                                        <div
                                            className="absolute -left-4 top-1 hidden h-8 w-px sm:block"
                                            style={{ background: "var(--line)" }}
                                        />
                                    ) : null}
                                    <div className="text-[22px] font-bold tracking-[-0.02em]">{value}</div>
                                    <div className="t-caption mt-1">{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative min-h-[520px]">
                        <div className="absolute left-1/2 top-14 -translate-x-1/2">
                            <FilkaAISphere size={300} />
                        </div>

                        <div className="absolute left-1/2 top-[400px] -translate-x-1/2 text-center">
                            <div className="t-mono" style={{ color: "var(--mint-300)" }}>
                                АГЕНТ · ДУМАЕТ
                            </div>
                            <div className="mt-1 flex justify-center">
                                <FilkaTypingDots />
                            </div>
                        </div>

                        <FilkaCard glass className="absolute left-0 top-0 max-w-[220px] p-3">
                            <div
                                className="mb-2 grid h-7 w-7 place-items-center rounded-[8px]"
                                style={{ background: "rgba(245,226,122,0.15)", color: "var(--accent-sun)" }}
                            >
                                <IconCompass size={14} />
                            </div>
                            <div className="t-caption mb-1" style={{ color: "var(--mint-300)" }}>
                                AI подбирает
                            </div>
                            <div className="text-[13px] font-medium">5 релевантных исполнителей</div>
                        </FilkaCard>

                        <FilkaCard glass className="absolute right-0 top-40 max-w-[240px] p-3">
                            <div className="t-caption mb-2">ЗАДАЧА ПОЛЬЗОВАТЕЛЯ</div>
                            <div className="text-[13.5px] leading-[1.5]">
                                «Нужен лендинг на Next.js с анимациями, бюджет 80 000 ₽…»
                            </div>
                        </FilkaCard>

                        <FilkaCard glass className="absolute bottom-7 left-5 w-[260px] p-3.5">
                            <div className="mb-3 flex items-center gap-3">
                                <div
                                    className="grid h-9 w-9 place-items-center rounded-[10px] text-[13px] font-bold"
                                    style={{ background: "linear-gradient(135deg,#B6D9FC,#4F2BC7)", color: "#05060f" }}
                                >
                                    МК
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[13px] font-semibold">Максим К.</div>
                                    <div className="t-caption text-[11px]">Frontend · 4.9 ★ · 67 заказов</div>
                                </div>
                                <FilkaChip>97%</FilkaChip>
                            </div>
                            <div className="h-1 overflow-hidden rounded-full" style={{ background: "var(--bg-3)" }}>
                                <div className="h-full" style={{ width: "97%", background: "var(--grad-brand)" }} />
                            </div>
                        </FilkaCard>

                        <FilkaCard glass className="absolute bottom-28 right-5 flex w-[200px] items-center gap-3 p-3">
                            <div
                                className="grid h-8 w-8 place-items-center rounded-[8px]"
                                style={{ background: "rgba(102,58,243,0.12)", border: "1px solid rgba(102,58,243,0.22)", color: "var(--mint-300)" }}
                            >
                                <IconShield size={15} />
                            </div>
                            <div>
                                <div className="text-[13px] font-semibold">{formatMoney(80_000)}</div>
                                <div className="t-caption text-[11px]">в эскроу · защищено</div>
                            </div>
                        </FilkaCard>
                    </div>
                </section>

                <section className="px-5 pb-16 sm:px-8 lg:px-14">
                    <div className="mb-9">
                        <div className="t-eyebrow">Как это работает</div>
                        <h2 className="t-h2 mt-2">Три шага — и команда уже собрана</h2>
                    </div>
                    <div className="grid gap-5 lg:grid-cols-3">
                        {HOW_STEPS.map((step) => {
                            const Icon = step.icon;
                            return (
                                <FilkaCard key={step.number} className="overflow-hidden p-6">
                                    <div className="t-mono mb-5 text-[13px]" style={{ color: "var(--mint-400)" }}>
                                        {step.number}
                                    </div>
                                    <div
                                        className="mb-4 grid h-11 w-11 place-items-center rounded-[12px]"
                                        style={{
                                            background: "rgba(102,58,243,0.1)",
                                            border: "1px solid rgba(102,58,243,0.22)",
                                            color: "var(--mint-300)",
                                        }}
                                    >
                                        <Icon size={20} />
                                    </div>
                                    <h3 className="mb-2 text-[19px] font-bold tracking-[-0.015em]">{step.title}</h3>
                                    <p className="text-[14px] leading-[1.5]" style={{ color: "var(--fg-1)" }}>
                                        {step.description}
                                    </p>
                                </FilkaCard>
                            );
                        })}
                    </div>
                </section>

                <section id="ai" className="px-5 pb-16 sm:px-8 lg:px-14">
                    <div
                        className="grid gap-8 rounded-[20px] border p-8 lg:grid-cols-[1fr_360px]"
                        style={{
                            background: "linear-gradient(135deg, rgba(102,58,243,0.10), rgba(79,43,199,0.04))",
                            borderColor: "rgba(102,58,243,0.22)",
                        }}
                    >
                        <div>
                            <div className="t-eyebrow">AI в действии</div>
                            <h2 className="t-h2 mb-3 mt-2">Пока вы описываете — AI уже ищет</h2>
                            <p
                                className="max-w-[520px] text-[15px] leading-[1.55]"
                                style={{ color: "var(--fg-1)" }}
                            >
                                Агент разбирает запрос на сущности, строит профиль задачи и запускает поиск параллельно. Через
                                секунды вы уже видите шорт-лист и реалистичную оценку рынка.
                            </p>
                            <div className="mt-6 flex gap-3">
                                <Link
                                    href={userId ? "/dashboard/orders/new" : "/register"}
                                    className="filka-btn filka-btn-primary"
                                >
                                    Попробовать AI <IconSpark size={14} />
                                </Link>
                            </div>
                        </div>
                        <div
                            className="rounded-[14px] border p-4 font-mono text-[12px]"
                            style={{ background: "var(--bg-2)", borderColor: "var(--line)", color: "var(--fg-1)" }}
                        >
                            <div className="mb-2" style={{ color: "var(--mint-400)" }}>
                                агент.план()
                            </div>
                            <div>
                                → стек: <span style={{ color: "var(--fg-0)" }}>React, Next.js</span>
                            </div>
                            <div>
                                → бюджет: <span style={{ color: "var(--fg-0)" }}>80 000 ₽</span>
                            </div>
                            <div>
                                → срок: <span style={{ color: "var(--fg-0)" }}>14 дней</span>
                            </div>
                            <div className="mt-3" style={{ color: "var(--mint-400)" }}>
                                агент.поиск()
                            </div>
                            <div>→ фильтр {totalUsers.toLocaleString("ru-RU")} → 87 совпадений</div>
                            <div>
                                → сортировка по рейтингу →{" "}
                                <span style={{ color: "var(--mint-300)" }}>5 финалистов</span>
                            </div>
                            <div className="mt-3" style={{ color: "var(--mint-400)" }}>
                                агент.оценка()
                            </div>
                            <div>
                                → диапазон: <span style={{ color: "var(--fg-0)" }}>68 000–92 000 ₽</span>
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                                <FilkaTypingDots />
                                <span style={{ color: "var(--fg-3)" }}>пишу бриф…</span>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="escrow" className="px-5 pb-16 sm:px-8 lg:px-14">
                    <div className="mb-9 flex flex-col gap-4 lg:flex-row lg:items-end">
                        <div>
                            <div className="t-eyebrow">Функционал</div>
                            <h2 className="t-h2 mt-2 max-w-[720px]">Всё для сделки в одном окне — от техзадания до выплаты</h2>
                        </div>
                        <div className="lg:ml-auto lg:max-w-[360px] lg:text-right">
                            <p className="text-[14px] leading-[1.55]" style={{ color: "var(--fg-1)" }}>
                                Никаких разрозненных инструментов. AI пишет, эскроу хранит, чат связывает, вы только подтверждаете результат.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:auto-rows-[200px] lg:grid-cols-12">
                        <div
                            className="relative flex flex-col overflow-hidden rounded-[18px] border p-7 lg:col-span-7 lg:row-span-2"
                            style={{
                                background: "linear-gradient(135deg, rgba(102,58,243,0.10), rgba(79,43,199,0.02))",
                                borderColor: "rgba(102,58,243,0.20)",
                            }}
                        >
                            <FilkaChip className="mb-4 self-start">
                                <IconSpark size={12} /> AI · ядро
                            </FilkaChip>
                            <h3 className="mb-3 max-w-[390px] text-[26px] font-bold tracking-[-0.02em]">
                                Голос → техзадание → шорт-лист за 90 секунд
                            </h3>
                            <p className="max-w-[420px] text-[14.5px] leading-[1.55]" style={{ color: "var(--fg-1)" }}>
                                Скажите «нужен лендинг для SaaS, бюджет 80 000 ₽, 2 недели». AI извлечёт стек, оценит рынок, подберёт 5 исполнителей и напишет приглашения за вас.
                            </p>
                            <div className="flex-1" />
                            <div
                                className="mt-5 flex items-center gap-3 rounded-[10px] border px-4 py-3 font-mono text-[12.5px]"
                                style={{ background: "var(--bg-2)", borderColor: "var(--line)", color: "var(--mint-300)" }}
                            >
                                <IconMic size={16} />
                                <span className="flex-1">«нужен лендинг next.js, бюджет 80к…»</span>
                                <div className="flex gap-0.5">
                                    {Array.from({ length: 8 }).map((_, index) => (
                                        <span
                                            key={index}
                                            className="w-1 rounded-full"
                                            style={{
                                                background: "var(--mint-300)",
                                                height: `${10 + (index % 4) * 3}px`,
                                                opacity: 0.75 + (index % 3) * 0.08,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div
                                className="pointer-events-none absolute -right-14 -top-10 h-[220px] w-[220px] rounded-full opacity-40 blur-[8px]"
                                style={{ background: "var(--grad-ai-sphere)" }}
                            />
                        </div>

                        <FilkaCard className="flex flex-col p-7 lg:col-span-5 lg:row-span-2">
                            <div
                                className="mb-4 grid h-12 w-12 place-items-center rounded-[12px]"
                                style={{ background: "rgba(102,58,243,0.10)", border: "1px solid rgba(102,58,243,0.22)", color: "var(--mint-300)" }}
                            >
                                <IconShield size={22} />
                            </div>
                            <h3 className="mb-2 text-[22px] font-bold tracking-[-0.015em]">Эскроу как банковский сейф</h3>
                            <p className="text-[14px] leading-[1.55]" style={{ color: "var(--fg-1)" }}>
                                Деньги резервируются на счёте платформы и переводятся исполнителю только после вашего «принять». Споры — через арбитраж за 24 часа.
                            </p>
                            <div className="flex-1" />
                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                <div
                                    className="rounded-[10px] border px-3 py-3"
                                    style={{ background: "var(--bg-1)", borderColor: "var(--line)" }}
                                >
                                    <div className="text-[22px] font-bold tracking-[-0.02em]">0 ₽</div>
                                    <div className="t-caption text-[11px]">комиссия за хранение</div>
                                </div>
                                <div
                                    className="rounded-[10px] border px-3 py-3"
                                    style={{ background: "var(--bg-1)", borderColor: "var(--line)" }}
                                >
                                    <div className="text-[22px] font-bold tracking-[-0.02em]" style={{ color: "var(--mint-300)" }}>
                                        2 часа
                                    </div>
                                    <div className="t-caption text-[11px]">средняя выплата</div>
                                </div>
                            </div>
                        </FilkaCard>

                        {[
                            {
                                icon: IconCompass,
                                title: "Умный мэтчинг",
                                description: "Система видит загрузку, рейтинг и опыт — показывает только тех, кто реально подходит под задачу.",
                                color: "var(--mint-300)",
                            },
                            {
                                icon: IconChat,
                                title: "Чат с подсказками",
                                description: "AI предлагает, как сформулировать правки, оценить дедлайны и не терять контекст внутри сделки.",
                                color: "var(--mint-300)",
                            },
                            {
                                icon: IconWallet,
                                title: "Мгновенные выплаты",
                                description: "СБП, карта, юрлицо. Деньги уходят исполнителю за минуты после подтверждения результата.",
                                color: "var(--accent-sun)",
                            },
                        ].map((item) => {
                            const Icon = item.icon;
                            return (
                                <FilkaCard key={item.title} className="p-6 lg:col-span-4">
                                    <Icon size={20} style={{ color: item.color, marginBottom: 10 }} />
                                    <h3 className="mb-2 text-[17px] font-semibold tracking-[-0.01em]">{item.title}</h3>
                                    <p className="text-[13px] leading-[1.5]" style={{ color: "var(--fg-1)" }}>
                                        {item.description}
                                    </p>
                                </FilkaCard>
                            );
                        })}
                    </div>
                </section>

                <section className="px-5 pb-16 sm:px-8 lg:px-14">
                    <div
                        className="rounded-[16px] border px-8 py-8"
                        style={{ background: "var(--bg-1)", borderColor: "var(--line)" }}
                    >
                        <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
                            <div className="min-w-[200px]">
                                <div className="t-eyebrow mb-2">Нам доверяют</div>
                                <div className="text-[14px] leading-[1.4]" style={{ color: "var(--fg-1)" }}>
                                    {Math.max(420, Math.round((completed || 420) / 10))}+ команд закрывают
                                    <br className="hidden sm:block" /> задачи через Филку
                                </div>
                            </div>
                            <div className="flex flex-1 flex-wrap items-center justify-between gap-6 text-[18px] font-bold tracking-[-0.02em]" style={{ color: "var(--fg-2)" }}>
                                {TRUSTED_BY.map((item) => (
                                    <div key={item} className="opacity-80">
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section id="market" className="px-5 pb-16 sm:px-8 lg:px-14">
                    <div className="mb-9">
                        <div className="t-eyebrow">Для кого</div>
                        <h2 className="t-h2 mt-2">Кто получает максимум от Филки</h2>
                    </div>
                    <div className="grid gap-5 lg:grid-cols-3">
                        {USE_CASES.map((item) => (
                            <FilkaCard key={item.tag} className="p-6">
                                <div className="t-eyebrow mb-4" style={{ color: item.color, letterSpacing: "0.16em" }}>
                                    {item.tag}
                                </div>
                                <h3 className="mb-3 text-[19px] font-bold leading-[1.25] tracking-[-0.015em]">{item.title}</h3>
                                <p className="text-[13.5px] leading-[1.55]" style={{ color: "var(--fg-1)" }}>
                                    {item.description}
                                </p>
                                <div
                                    className="mt-5 grid gap-3 border-t pt-4 sm:grid-cols-2"
                                    style={{ borderColor: "var(--line)" }}
                                >
                                    {item.stats.map(([value, label]) => (
                                        <div key={label}>
                                            <div className="text-[20px] font-bold tracking-[-0.02em]" style={{ color: item.color }}>
                                                {value}
                                            </div>
                                            <div className="t-caption text-[11px]">{label}</div>
                                        </div>
                                    ))}
                                </div>
                            </FilkaCard>
                        ))}
                    </div>
                </section>

                <section id="freelancers" className="px-5 pb-16 sm:px-8 lg:px-14">
                    <div className="mb-9 flex flex-col gap-4 lg:flex-row lg:items-end">
                        <div>
                            <div className="t-eyebrow">Отзывы</div>
                            <h2 className="t-h2 mt-2">Что говорят те, кто закрыл первую сделку</h2>
                        </div>
                        <div className="lg:ml-auto">
                            <div
                                className="flex items-center gap-2 rounded-full border px-4 py-2"
                                style={{ background: "var(--bg-2)", borderColor: "var(--line)" }}
                            >
                                <div className="flex gap-0.5" style={{ color: "var(--accent-sun)" }}>
                                    {Array.from({ length: 5 }).map((_, index) => (
                                        <IconStarFilled key={index} size={13} />
                                    ))}
                                </div>
                                <span className="text-[13px] font-semibold">{avgRating.toFixed(2)}</span>
                                <span className="t-caption text-[11px]">· 1 240 отзывов</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr_1fr]">
                        {TESTIMONIALS.map((item) => (
                            <div
                                key={item.who}
                                className="flex flex-col gap-4 rounded-[16px] p-6"
                                style={{
                                    background: item.large
                                        ? "linear-gradient(180deg, rgba(102,58,243,0.14), rgba(79,43,199,0.04))"
                                        : "var(--bg-2)",
                                    border: item.large ? "1px solid rgba(102,58,243,0.28)" : "1px solid var(--line)",
                                }}
                            >
                                <div className="flex gap-1" style={{ color: "var(--accent-sun)" }}>
                                    {Array.from({ length: 5 }).map((_, index) => (
                                        <IconStarFilled key={index} size={14} />
                                    ))}
                                </div>
                                <p
                                    className={`leading-[1.55] ${item.large ? "text-[17px] font-medium" : "text-[14.5px]"}`}
                                    style={{ color: "var(--fg-0)" }}
                                >
                                    «{item.text}»
                                </p>
                                <div className="flex-1" />
                                {item.metric ? (
                                    <div
                                        className="self-start rounded-[10px] border px-3 py-2 text-[13px] font-semibold"
                                        style={{
                                            background: "rgba(102,58,243,0.10)",
                                            borderColor: "rgba(102,58,243,0.18)",
                                            color: "var(--mint-200)",
                                        }}
                                    >
                                        {item.metric}
                                    </div>
                                ) : null}
                                <div
                                    className="flex items-center gap-3 border-t pt-4"
                                    style={{ borderColor: "var(--line)" }}
                                >
                                    <div
                                        className="grid h-10 w-10 place-items-center rounded-[12px] text-[13px] font-bold"
                                        style={{ background: item.gradient, color: "#05060f" }}
                                    >
                                        {item.who.split(" ").map((part) => part[0]).join("")}
                                    </div>
                                    <div>
                                        <div className="text-[14px] font-semibold">{item.who}</div>
                                        <div className="t-caption text-[11px]">{item.role}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section id="pricing" className="px-5 pb-16 sm:px-8 lg:px-14">
                    <div className="mb-9 text-center">
                        <div className="t-eyebrow inline-block">Тарифы</div>
                        <h2 className="t-h2 mb-2 mt-2">Без подписок. Платите только за результат.</h2>
                        <p className="text-[14.5px]" style={{ color: "var(--fg-1)" }}>
                            Создавать заказы и получать AI-помощь — бесплатно. Комиссия только при успешной сделке.
                        </p>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr_1fr]">
                        {PRICING.map((item) => (
                            <div
                                key={item.name}
                                className="relative flex flex-col gap-4 rounded-[18px] p-7"
                                style={{
                                    background: item.primary
                                        ? "linear-gradient(180deg, rgba(102,58,243,0.14), rgba(79,43,199,0.04))"
                                        : "var(--bg-2)",
                                    border: item.primary ? "1px solid rgba(102,58,243,0.32)" : "1px solid var(--line)",
                                    boxShadow: item.primary ? "var(--shadow-glow-soft)" : "none",
                                }}
                            >
                                {item.badge ? (
                                    <div
                                        className="absolute left-6 top-[-10px] rounded-full px-3 py-1 text-[10.5px] font-bold tracking-[0.06em]"
                                        style={{ background: "var(--mint-400)", color: "#05060f" }}
                                    >
                                        {item.badge}
                                    </div>
                                ) : null}
                                <div>
                                    <div className="mb-3 text-[16px] font-bold tracking-[-0.01em]">{item.name}</div>
                                    <div className="text-[38px] font-bold tracking-[-0.025em]">{item.price}</div>
                                    <div className="t-caption mt-1 text-[12px]">{item.sub}</div>
                                    <div className="t-mono mt-2 text-[12px]" style={{ color: "var(--mint-300)" }}>
                                        комиссия · {item.fee}
                                    </div>
                                </div>
                                <Link
                                    href={userId ? "/dashboard" : item.primary ? "/register" : "/login"}
                                    className={item.primary ? "filka-btn filka-btn-primary" : "filka-btn filka-btn-ghost"}
                                    style={{ height: 42, justifyContent: "center" }}
                                >
                                    {item.cta} <IconArrowRight size={14} />
                                </Link>
                                <div className="flex-1" />
                                <div
                                    className="space-y-2 border-t pt-4"
                                    style={{ borderColor: "var(--line)" }}
                                >
                                    {item.features.map((feature) => (
                                        <div
                                            key={feature}
                                            className="flex items-center gap-2.5 text-[13.5px]"
                                            style={{ color: "var(--fg-1)" }}
                                        >
                                            <IconCheck size={14} className="shrink-0" style={{ color: "var(--mint-300)" }} />
                                            {feature}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section id="faq" className="grid gap-10 px-5 pb-16 sm:px-8 lg:grid-cols-[1fr_1.4fr] lg:px-14">
                    <div>
                        <div className="t-eyebrow">Вопросы</div>
                        <h2 className="t-h2 mb-4 mt-2">Часто спрашивают</h2>
                        <p className="mb-5 text-[14.5px] leading-[1.55]" style={{ color: "var(--fg-1)" }}>
                            Не нашли ответ? Напишите нам — отвечаем в среднем за 12 минут.
                        </p>
                        <button type="button" className="filka-btn filka-btn-ghost filka-btn-sm">
                            <IconChat size={14} /> Спросить у поддержки
                        </button>
                    </div>

                    <div
                        className="overflow-hidden rounded-[14px] border"
                        style={{ background: "var(--line)", borderColor: "var(--line)" }}
                    >
                        {FAQS.map((item, index) => (
                            <details key={item.q} className="px-5 py-4" open={index === 0} style={{ background: "var(--bg-2)" }}>
                                <summary
                                    style={{ listStyle: "none" }}
                                    className="flex cursor-pointer items-center gap-4 text-[15.5px] font-semibold tracking-[-0.005em]"
                                >
                                    <span className="flex-1">{item.q}</span>
                                    <span
                                        className="grid h-7 w-7 place-items-center rounded-full"
                                        style={{ background: "var(--bg-3)", color: "var(--mint-300)" }}
                                    >
                                        <IconPlus size={14} />
                                    </span>
                                </summary>
                                <div className="pt-3 text-[14px] leading-[1.6]" style={{ color: "var(--fg-1)" }}>
                                    {item.a}
                                </div>
                            </details>
                        ))}
                    </div>
                </section>

                <section className="px-5 pb-16 sm:px-8 lg:px-14">
                    <div
                        className="relative grid gap-10 overflow-hidden rounded-[24px] px-8 py-12 lg:grid-cols-[1.4fr_1fr] lg:px-14"
                        style={{
                            background:
                                "radial-gradient(ellipse 70% 90% at 80% 50%, rgba(102,58,243,0.18), transparent 70%)," +
                                "radial-gradient(ellipse 60% 80% at 0% 50%, rgba(186,215,247,0.10), transparent 65%)," +
                                "var(--bg-1)",
                            border: "1px solid rgba(102,58,243,0.20)",
                        }}
                    >
                        <div>
                            <div className="t-eyebrow mb-3">Присоединяйтесь к Филке</div>
                            <h2 className="t-display mb-4 text-[44px] leading-[1.06]">
                                Скажите задачу — <br />
                                <span className="gradient-text">остальное на нас.</span>
                            </h2>
                            <p
                                className="mb-6 max-w-[480px] text-[15.5px] leading-[1.55]"
                                style={{ color: "var(--fg-1)" }}
                            >
                                Регистрация — 30 секунд. Первый AI-бриф и поиск исполнителей — бесплатно. Платите только если работа принята.
                            </p>
                            <div className="mb-5 flex flex-col gap-3 sm:flex-row">
                                <Link
                                    href={userId ? "/dashboard/orders/new" : "/register"}
                                    className="filka-btn filka-btn-primary filka-btn-lg"
                                >
                                    Создать заказ через AI <IconArrowRight size={16} />
                                </Link>
                                <Link
                                    href={userId ? "/dashboard/orders" : "/login"}
                                    className="filka-btn filka-btn-ghost filka-btn-lg"
                                >
                                    Я хочу брать заказы
                                </Link>
                            </div>
                            <div className="flex flex-wrap gap-4 text-[12.5px]" style={{ color: "var(--fg-2)" }}>
                                {["Без карты", "Без подписки", "Эскроу включено"].map((item) => (
                                    <span key={item} className="inline-flex items-center gap-1.5">
                                        <IconCheck size={14} style={{ color: "var(--mint-300)" }} />
                                        {item}
                                    </span>
                                ))}
                                {volume > 0 ? (
                                    <span className="inline-flex items-center gap-1.5">
                                        <IconWallet size={14} style={{ color: "var(--mint-300)" }} />
                                        Оборот: {formatMoney(volume)}
                                    </span>
                                ) : null}
                            </div>
                        </div>

                        <div className="relative grid min-h-[280px] place-items-center">
                            <FilkaAISphere size={260} />
                            <FilkaCard glass className="absolute left-0 top-6 w-[220px] p-3">
                                <div className="t-mono mb-1 text-[11px]" style={{ color: "var(--mint-300)" }}>
                                    АГЕНТ · БРИФИНГ
                                </div>
                                <div className="text-[13px] font-medium">
                                    «Мобильное приложение для доставки еды, бюджет 350 000 ₽, 6 недель»
                                </div>
                            </FilkaCard>
                            <FilkaCard glass className="absolute bottom-6 right-0 flex w-[220px] items-center gap-3 p-3">
                                <div
                                    className="grid h-9 w-9 place-items-center rounded-[10px] text-[13px] font-bold"
                                    style={{ background: "linear-gradient(135deg,#B6D9FC,#1a0e4a)", color: "#05060f" }}
                                >
                                    ЕС
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[13px] font-semibold">Елена С.</div>
                                    <div className="t-caption text-[10.5px]">iOS · 4.9 ★ · 41 заказ</div>
                                </div>
                                <FilkaChip>96%</FilkaChip>
                            </FilkaCard>
                        </div>
                    </div>
                </section>

                <footer
                    className="border-t px-5 py-12 sm:px-8 lg:px-14"
                    style={{ borderColor: "var(--line)", background: "var(--bg-1)" }}
                >
                    <div className="mb-10 grid gap-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
                        <div>
                            <div className="mb-4 flex items-center gap-3">
                                <IconLogo size={28} />
                                <span className="text-[18px] font-bold tracking-[-0.02em]">Филка</span>
                            </div>
                            <p
                                className="mb-4 max-w-[320px] text-[13.5px] leading-[1.55]"
                                style={{ color: "var(--fg-2)" }}
                            >
                                AI-биржа фриланса с эскроу. Москва · 2026. Делаем сделки между заказчиками и исполнителями быстрее, безопаснее и спокойнее.
                            </p>
                            <div className="flex gap-2">
                                {["TG", "VK", "YT", "X"].map((item) => (
                                    <div
                                        key={item}
                                        className="t-mono grid h-9 w-9 place-items-center rounded-[10px] border text-[11px] font-bold"
                                        style={{ background: "var(--bg-2)", borderColor: "var(--line)", color: "var(--fg-1)" }}
                                    >
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {FOOTER_COLUMNS.map((column) => (
                            <div key={column.title}>
                                <div className="t-eyebrow mb-4" style={{ color: "var(--fg-2)" }}>
                                    {column.title}
                                </div>
                                <div className="flex flex-col gap-2.5">
                                    {column.items.map((item) => (
                                        <a
                                            key={item}
                                            href="#"
                                            className="text-[13.5px]"
                                            style={{ color: "var(--fg-1)" }}
                                        >
                                            {item}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div
                        className="flex flex-col gap-3 border-t pt-5 text-[12.5px] sm:flex-row sm:items-center"
                        style={{ borderColor: "var(--line)", color: "var(--fg-3)" }}
                    >
                        <span>© 2026 Филка · ООО «Нейробиржа»</span>
                        <span className="hidden sm:inline">·</span>
                        <span>ИНН 7700112233</span>
                        <div className="sm:ml-auto" />
                        <div className="flex flex-wrap gap-4">
                            <a href="#">Политика данных</a>
                            <a href="#">Условия использования</a>
                            <a href="#">Куки</a>
                        </div>
                    </div>
                </footer>
            </div>
        </main>
    );
};
