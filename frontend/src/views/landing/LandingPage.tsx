"use client";

import { HeroSection } from "./ui/HeroSection";
import { FeaturesSection } from "./ui/FeaturesSection";
import { HowItWorksSection } from "./ui/HowItWorksSection";
import { StatsSection } from "./ui/StatsSection";
import { TestimonialsSection } from "./ui/TestimonialsSection";
import { CtaSection } from "./ui/CtaSection";

export const LandingPage = () => (
    <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <StatsSection />
        <TestimonialsSection />
        <CtaSection />
    </main>
);
