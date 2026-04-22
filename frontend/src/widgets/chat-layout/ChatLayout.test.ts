import { describe, expect, it } from "vitest";
import { sortMessagesByDate } from "@/widgets/chat-layout/ChatLayout";

describe("sortMessagesByDate", () => {
  it("returns messages in chronological order", () => {
    const messages = [
      {
        id: "msg-3",
        conversation_id: "conv-1",
        author_type: "other",
        content: "third",
        created_at: "2026-03-26T10:03:00.000Z",
      },
      {
        id: "msg-1",
        conversation_id: "conv-1",
        author_type: "other",
        content: "first",
        created_at: "2026-03-26T10:01:00.000Z",
      },
      {
        id: "msg-2",
        conversation_id: "conv-1",
        author_type: "other",
        content: "second",
        created_at: "2026-03-26T10:02:00.000Z",
      },
    ];

    const sorted = sortMessagesByDate(messages);

    expect(sorted.map((message) => message.id)).toEqual(["msg-1", "msg-2", "msg-3"]);
  });
});
