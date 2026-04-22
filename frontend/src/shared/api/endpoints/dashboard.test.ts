import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardApi } from "@/shared/api/endpoints/dashboard";

const mocks = vi.hoisted(() => ({
  request: vi.fn()
}));

vi.mock("@/shared/api/client", () => ({
  apiClient: {
    request: mocks.request
  }
}));

describe("dashboardApi.getData", () => {
  beforeEach(() => {
    mocks.request.mockReset();
  });

  it("filters technical connection events from recent activity", async () => {
    mocks.request.mockResolvedValueOnce({
      activities: [
        {
          id: "a1",
          created_at: "2026-03-04T10:00:00.000Z",
          payload: { event: "connection.state", type: "connection.state", message: "recovered" }
        },
        {
          id: "a2",
          created_at: "2026-03-04T10:01:00.000Z",
          payload: { event: "proposal.created", title: "Новый отклик", message: "Входящие отклики обновлены" }
        }
      ]
    });

    const result = await dashboardApi.getData();

    expect(result.recentActivity).toHaveLength(1);
    expect(result.recentActivity[0]?.id).toBe("a2");
  });

  it("deduplicates identical activity cards", async () => {
    mocks.request.mockResolvedValueOnce({
      activities: [
        {
          id: "a1",
          created_at: "2026-03-04T10:00:00.000Z",
          payload: { event: "proposal.created", title: "Новый отклик", message: "Входящие отклики обновлены" }
        },
        {
          id: "a2",
          created_at: "2026-03-04T10:01:00.000Z",
          payload: { event: "proposal.created", title: "Новый отклик", message: "Входящие отклики обновлены" }
        }
      ]
    });

    const result = await dashboardApi.getData();

    expect(result.recentActivity).toHaveLength(1);
    expect(result.recentActivity[0]?.id).toBe("a1");
  });

  it("keeps one technical record when there are no other activities", async () => {
    mocks.request.mockResolvedValueOnce({
      activities: [
        {
          id: "a1",
          created_at: "2026-03-04T10:00:00.000Z",
          payload: { event: "connection.state", message: "recovered" }
        },
        {
          id: "a2",
          created_at: "2026-03-04T10:01:00.000Z",
          payload: { event: "connection.state", message: "recovered" }
        }
      ]
    });

    const result = await dashboardApi.getData();

    expect(result.recentActivity).toHaveLength(1);
    expect(result.recentActivity[0]?.id).toBe("a1");
  });
});
