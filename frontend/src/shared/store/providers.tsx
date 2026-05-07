"use client";

import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/shared/store/query-client";
import { useRealtimeSync } from "@/processes/realtime-sync/use-realtime-sync";
import { FilkaToastProvider } from "@/shared/ui/filka";

const Bootstrap = (): null => {
  useRealtimeSync();
  return null;
};

export const AppProviders = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <FilkaToastProvider>
      <Bootstrap />
      {children}
    </FilkaToastProvider>
  </QueryClientProvider>
);
