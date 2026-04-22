import React from "react";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRealtimeSync } from "@/processes/realtime-sync/use-realtime-sync";
import { useRealtimeStore } from "@/shared/store/realtime.store";
import { useSessionStore } from "@/shared/store/session.store";

type Envelope = {
  type: string;
  version: 1;
  event_id: string;
  ts: string;
  data: unknown;
};

const mocks = vi.hoisted(() => {
  return {
    invalidateQueries: vi.fn(async () => undefined),
    setQueriesData: vi.fn(),
    mockConnect: vi.fn(),
    mockDisconnect: vi.fn(),
    callback: null as ((event: Envelope) => void) | null
  };
});

vi.mock("@/shared/ws/manager", () => ({
  wsManager: {
    connect: () => mocks.mockConnect(),
    disconnect: () => mocks.mockDisconnect(),
    subscribe: (handler: (event: Envelope) => void) => {
      mocks.callback = handler;
      return () => {
        mocks.callback = null;
      };
    }
  }
}));

vi.mock("@/shared/store/query-client", () => ({
  queryClient: {
    invalidateQueries: mocks.invalidateQueries,
    setQueriesData: mocks.setQueriesData
  }
}));

vi.mock("@/shared/store/use-session-hydrated", () => ({
  useSessionHydrated: () => true
}));

const HookHost = (): null => {
  useRealtimeSync();
  return null;
};

describe("useRealtimeSync", () => {
  beforeEach(() => {
    mocks.mockConnect.mockClear();
    mocks.mockDisconnect.mockClear();
    mocks.invalidateQueries.mockClear();
    mocks.setQueriesData.mockClear();
    mocks.callback = null;
    window.localStorage.setItem("vb_access_token", "test-token");
    useRealtimeStore.setState({
      isConnected: false,
      onlineCount: 0,
      unreadNotifications: 0
    });
    useSessionStore.setState({
      userId: "user-1",
      role: "client",
      pendingPhone: null,
      isPhoneVerified: true,
      onboardingCompleted: true
    });
  });

  it("connects and updates store from realtime events", () => {
    render(<HookHost />);
    expect(mocks.mockConnect).toHaveBeenCalledTimes(1);
    expect(mocks.callback).toBeTruthy();

    mocks.callback?.({
      type: "presence.online_count.updated",
      version: 1,
      event_id: "e1",
      ts: new Date().toISOString(),
      data: { online_count: 11 }
    });
    mocks.callback?.({
      type: "notification.unread_count.updated",
      version: 1,
      event_id: "e2",
      ts: new Date().toISOString(),
      data: { unread_count: 7 }
    });
    mocks.callback?.({
      type: "connection.state",
      version: 1,
      event_id: "e3",
      ts: new Date().toISOString(),
      data: { state: "recovered" }
    });

    const state = useRealtimeStore.getState();
    expect(state.onlineCount).toBe(11);
    expect(state.unreadNotifications).toBe(7);
    expect(state.isConnected).toBe(true);
  });

  it("invalidates query keys for top RT events", () => {
    render(<HookHost />);
    expect(mocks.callback).toBeTruthy();

    mocks.callback?.({
      type: "transaction.created",
      version: 1,
      event_id: "e4",
      ts: new Date().toISOString(),
      data: {}
    });
    mocks.callback?.({
      type: "order.application_closed",
      version: 1,
      event_id: "e5",
      ts: new Date().toISOString(),
      data: {}
    });

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["transactions"] });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["balance"] });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["orders"] });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["proposals"] });
  });

  it("does not connect without an auth token", () => {
    window.localStorage.removeItem("vb_access_token");

    render(<HookHost />);

    expect(mocks.mockConnect).not.toHaveBeenCalled();
    expect(mocks.mockDisconnect).toHaveBeenCalledTimes(1);
  });
});
