"use client";

import { useEffect, useState } from "react";
import { useSessionStore } from "./session.store";

type PersistApi = {
  hasHydrated: () => boolean;
  onHydrate: (listener: () => void) => () => void;
  onFinishHydration: (listener: () => void) => () => void;
};

export const useSessionHydrated = (): boolean => {
  const persist = (useSessionStore as typeof useSessionStore & { persist?: PersistApi }).persist;
  // Keep the first render deterministic between SSR and client hydration.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!persist) {
      setHydrated(true);
      return;
    }

    setHydrated(persist.hasHydrated());
    const offHydrate = persist.onHydrate(() => setHydrated(false));
    const offFinishHydrate = persist.onFinishHydration(() => setHydrated(true));

    return () => {
      offHydrate();
      offFinishHydrate();
    };
  }, [persist]);

  return hydrated;
};
