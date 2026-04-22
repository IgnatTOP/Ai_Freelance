"use client";

import { Avatar, Card, CardBody, Button } from "@heroui/react";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { SectionHeading } from "@/shared/ui/section-heading/SectionHeading";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TESTIMONIALS = [
    {
        name: "Алексей Петров",
        role: "CEO в TechStart",
        initials: "АП",
        content:
            "Филка полностью изменила наш подход к поиску разработчиков. AI-подбор сэкономил нам десятки часов. Нашли идеального фрилансера за 2 дня вместо обычных 2 недель.",
        rating: 5,
    },
    {
        name: "Мария Соколова",
        role: "Фронтенд-разработчик",
        initials: "МС",
        content:
            "Как фрилансер, я ценю прозрачность и безопасность. Escrow-система работает безупречно, а AI-ассистент помогает составлять лучшие предложения на заказы.",
        rating: 5,
    },
    {
        name: "Дмитрий Волков",
        role: "Продакт-менеджер",
        initials: "ДВ",
        content:
            "Интерфейс платформы — лучший среди фриланс-бирж. Чат в реальном времени, мгновенные уведомления, удобная система заказов. Рекомендую всем!",
        rating: 5,
    },
] as const;

const StarRating = ({ rating }: { readonly rating: number }) => (
    <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                size={14}
                fill={i < rating ? "#f59e0b" : "none"}
                stroke={i < rating ? "#f59e0b" : "#3f3f46"}
                strokeWidth={1.5}
            />
        ))}
    </div>
);

export const TestimonialsSection = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);

    const nextSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, []);

    const prevSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
    }, []);

    useEffect(() => {
        if (!isAutoPlaying) return;
        const interval = setInterval(nextSlide, 5000); // 5 sec per slide
        return () => clearInterval(interval);
    }, [isAutoPlaying, nextSlide]);

    return (
        <section id="for-freelancers" className="py-24 md:py-32 px-4 sm:px-6 relative section-alt overflow-hidden">
            <div className="max-w-4xl mx-auto relative">
                <SectionHeading
                    badge="Отзывы"
                    title="Что говорят наши пользователи"
                    subtitle="Реальные истории от клиентов и фрилансеров, которые уже пользуются Филкой."
                />

                <div
                    className="relative mt-12"
                    onMouseEnter={() => setIsAutoPlaying(false)}
                    onMouseLeave={() => setIsAutoPlaying(true)}
                >
                    <div className="overflow-hidden relative px-4 md:px-12 py-4">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentIndex}
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.4, ease: "easeInOut" }}
                            >
                                {(() => {
                                    const t = TESTIMONIALS[currentIndex];
                                    if (!t) return null;
                                    return (
                                        <Card className="glass-card card-hover-glow transition-all duration-300">
                                            <CardBody className="p-8 md:p-10 flex flex-col gap-6 items-center text-center">
                                                <div className="flex items-center justify-center">
                                                    <StarRating rating={t.rating} />
                                                </div>
                                                <Quote size={32} className="text-emerald-500/20 absolute top-6 right-6" />
                                                <p className="text-zinc-300 text-lg md:text-xl leading-relaxed italic max-w-2xl">
                                                    &ldquo;{t.content}&rdquo;
                                                </p>
                                                <div className="flex flex-col items-center gap-3 pt-4 border-t border-zinc-800/50 w-full mt-2">
                                                    <Avatar
                                                        name={t.initials}
                                                        size="md"
                                                        classNames={{
                                                            base: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
                                                            name: "font-bold",
                                                        }}
                                                    />
                                                    <div>
                                                        <p className="text-base font-semibold text-zinc-100">{t.name}</p>
                                                        <p className="text-sm text-zinc-500">{t.role}</p>
                                                    </div>
                                                </div>
                                            </CardBody>
                                        </Card>
                                    );
                                })()}
                            </motion.div>
                        </AnimatePresence>

                        {/* Pagination dots */}
                        <div className="flex justify-center gap-2 mt-8">
                            {TESTIMONIALS.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentIndex(i)}
                                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === currentIndex
                                        ? "bg-emerald-500 w-8"
                                        : "bg-zinc-700 hover:bg-zinc-500"
                                        }`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Navigation Buttons */}
                    <Button
                        isIconOnly
                        variant="flat"
                        size="sm"
                        onPress={prevSlide}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -ml-2 md:-ml-8 bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
                    >
                        <ChevronLeft size={20} />
                    </Button>
                    <Button
                        isIconOnly
                        variant="flat"
                        size="sm"
                        onPress={nextSlide}
                        className="absolute right-0 top-1/2 -translate-y-1/2 -mr-2 md:-mr-8 bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
                    >
                        <ChevronRight size={20} />
                    </Button>
                </div>
            </div>
        </section>
    );
};
