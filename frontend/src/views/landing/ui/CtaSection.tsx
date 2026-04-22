"use client";

import { Button, Link, Input } from "@heroui/react";
import { ArrowRight, CheckCircle, Phone } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export const CtaSection = () => {
    const [phone, setPhone] = useState("");
    const router = useRouter();

    const handleRegister = () => {
        if (phone.length > 5) {
            router.push(`/register?phone=${encodeURIComponent(phone)}`);
        } else {
            router.push("/register");
        }
    };

    return (
        <section id="pricing" className="py-24 md:py-32 px-4 sm:px-6 section-grid">
            <div className="max-w-4xl mx-auto relative">
                {/* CTA Card */}
                <div className="relative rounded-3xl overflow-hidden gradient-bg-cta border border-purple-500/10 p-10 md:p-16 text-center glow-purple">
                    {/* Background accents + particles */}
                    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-purple-600/[0.08] blur-[100px]" />
                        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-indigo-600/[0.05] blur-[100px]" />
                        {/* Floating particles */}
                        <div className="absolute top-[20%] left-[15%] w-1 h-1 rounded-full bg-purple-400/40 animate-float" />
                        <div className="absolute top-[60%] right-[20%] w-1.5 h-1.5 rounded-full bg-indigo-400/30 animate-float-delay" />
                        <div className="absolute top-[30%] right-[30%] w-1 h-1 rounded-full bg-fuchsia-400/30 animate-float-delay-2" />
                        <div className="absolute bottom-[25%] left-[25%] w-1.5 h-1.5 rounded-full bg-purple-300/20 animate-float" />
                        <div className="absolute top-[45%] left-[50%] w-1 h-1 rounded-full bg-blue-400/25 animate-float-delay" />
                    </div>

                    <div className="relative z-10">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-5 tracking-tight text-zinc-100">
                            Готовы <span className="gradient-text">начать?</span>
                        </h2>
                        <p className="text-zinc-400 text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
                            Присоединяйтесь к тысячам профессионалов. Регистрация бесплатна,
                            а первый заказ можно разместить за 5 минут.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 max-w-lg mx-auto">
                            <Input
                                placeholder="+7 (999) 000-00-00"
                                value={phone}
                                onValueChange={setPhone}
                                size="lg"
                                startContent={<Phone size={18} className="text-zinc-500" />}
                                classNames={{
                                    base: "w-full sm:w-64",
                                    inputWrapper: "bg-zinc-900/80 border-purple-500/30 hover:border-purple-500/50 focus-within:!border-purple-500/70 h-[48px]",
                                    input: "text-zinc-100",
                                }}
                            />
                            <Button
                                size="lg"
                                onPress={handleRegister}
                                className="bg-purple-600 text-white font-semibold px-8 shadow-lg shadow-purple-600/25 hover:shadow-purple-600/35 hover:bg-purple-500 transition-all duration-300 w-full sm:w-auto h-[48px]"
                                endContent={<ArrowRight size={18} />}
                            >
                                Начать
                            </Button>
                        </div>

                        {/* Trust badges */}
                        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                            {["Без кредитной карты", "Бесплатный план", "Отмена в любой момент"].map((text) => (
                                <div key={text} className="flex items-center gap-1.5 text-zinc-500 text-xs">
                                    <CheckCircle size={12} className="text-emerald-500" />
                                    <span>{text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
