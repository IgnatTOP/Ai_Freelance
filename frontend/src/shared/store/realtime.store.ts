import { create } from "zustand";

export type RealtimeToastType =
  | "message"
  | "proposal"
  | "order"
  | "balance"
  | "review"
  | "ai"
  | "system";

export type RealtimeToast = {
  id: string;
  eventId?: string;
  type: RealtimeToastType;
  title: string;
  message: string;
  createdAt: number;
};

type RealtimeState = {
  isConnected: boolean;
  isReconnecting: boolean;
  unreadNotifications: number;
  onlineCount: number;
  pulseKey: number;
  toasts: RealtimeToast[];
  seenEventIds: string[];
  setConnected: (value: boolean) => void;
  setReconnecting: (value: boolean) => void;
  setUnreadNotifications: (count: number) => void;
  setOnlineCount: (count: number) => void;
  bumpPulse: () => void;
  addToast: (toast: Omit<RealtimeToast, "createdAt">) => void;
  removeToast: (id: string) => void;
};

export const useRealtimeStore = create<RealtimeState>((set) => ({
  isConnected: false,
  isReconnecting: false,
  unreadNotifications: 0,
  onlineCount: 0,
  pulseKey: 0,
  toasts: [],
  seenEventIds: [],
  setConnected: (value) => set({ isConnected: value, isReconnecting: value ? false : true }),
  setReconnecting: (value) => set({ isReconnecting: value, isConnected: value ? false : true }),
  setUnreadNotifications: (count) => set({ unreadNotifications: count }),
  setOnlineCount: (count) => set({ onlineCount: count }),
  bumpPulse: () => set((state) => ({ pulseKey: state.pulseKey + 1 })),
  addToast: (toast) =>
    set((state) => {
      if (toast.eventId && state.seenEventIds.includes(toast.eventId)) {
        return state;
      }

      const seenEventIds = toast.eventId
        ? [...state.seenEventIds, toast.eventId].slice(-100)
        : state.seenEventIds;

      return {
        ...state,
        seenEventIds,
        toasts: [
          ...state.toasts,
          {
            ...toast,
            createdAt: Date.now()
          }
        ].slice(-5)
      };
    }),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id)
    }))
}));
