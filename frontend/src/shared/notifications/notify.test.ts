import { beforeEach, describe, expect, it } from "vitest";
import { notify } from "@/shared/notifications/notify";
import { useRealtimeStore } from "@/shared/store/realtime.store";

describe("notify", () => {
  beforeEach(() => {
    useRealtimeStore.setState({
      isConnected: false,
      isReconnecting: false,
      unreadNotifications: 0,
      onlineCount: 0,
      pulseKey: 0,
      toasts: [],
      seenEventIds: [],
    });
  });

  it("deduplicates realtime toasts by event_id", () => {
    const event = {
      type: "proposal.created",
      version: 1 as const,
      event_id: "evt-1",
      ts: new Date().toISOString(),
      data: {},
    };

    notify.realtime(event);
    notify.realtime(event);

    const state = useRealtimeStore.getState();
    expect(state.toasts).toHaveLength(1);
    expect(state.seenEventIds).toContain("evt-1");
  });

  it("keeps only last 5 toasts", () => {
    for (let i = 0; i < 7; i++) {
      notify.info({ title: `toast-${i}`, message: "x" });
    }

    const state = useRealtimeStore.getState();
    expect(state.toasts).toHaveLength(5);
    expect(state.toasts[0]?.title).toBe("toast-2");
    expect(state.toasts[4]?.title).toBe("toast-6");
  });
});

