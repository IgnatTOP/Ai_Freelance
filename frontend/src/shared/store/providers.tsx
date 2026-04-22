"use client";

import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { HeroUIProvider } from "@heroui/react";
import { queryClient } from "@/shared/store/query-client";
import { useRealtimeSync } from "@/processes/realtime-sync/use-realtime-sync";

const Bootstrap = (): null => {
  useRealtimeSync();
  return null;
};

export const AppProviders = ({ children }: { children: ReactNode }) => (
  <HeroUIProvider>
    <QueryClientProvider client={queryClient}>
      <Bootstrap />
      {children}
    </QueryClientProvider>
  </HeroUIProvider>
);
