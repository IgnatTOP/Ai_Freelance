import { beforeEach, describe, expect, it, vi } from "vitest";
import { notificationsApi } from "@/shared/api/endpoints/notifications";

const mocks = vi.hoisted(() => ({
  request: vi.fn()
}));

vi.mock("@/shared/api/client", () => ({
  apiClient: {
    request: mocks.request
  }
}));

describe("notificationsApi.getPage", () => {
  beforeEach(() => {
    mocks.request.mockReset();
  });

  it("maps notification text from nested payload object", async () => {
    mocks.request.mockResolvedValueOnce({
      notifications: [
        {
          id: "n1",
          payload: {
            type: "chat.message.created",
            data: {
              title: "Новое сообщение",
              body: "Вам написал заказчик"
            }
          }
        }
      ],
      unread_count: 1
    });

    const page = await notificationsApi.getPage(20, 0);

    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      id: "n1",
      type: "message",
      title: "Новое сообщение",
      message: "Вам написал заказчик"
    });
  });

  it("parses JSON-string payload and uses event fallbacks", async () => {
    mocks.request.mockResolvedValueOnce({
      notifications: [
        {
          id: "n2",
          payload: JSON.stringify({
            event: "balance.updated"
          })
        }
      ],
      unread_count: 1
    });

    const page = await notificationsApi.getPage(20, 0);

    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      id: "n2",
      type: "payment",
      title: "Баланс обновлен",
      message: "Проверьте актуальное состояние баланса"
    });
  });
});
