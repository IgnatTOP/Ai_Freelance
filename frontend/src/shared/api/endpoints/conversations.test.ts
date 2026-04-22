import { describe, expect, it } from "vitest";
import { mapMessage } from "@/shared/api/endpoints/conversations";

describe("mapMessage", () => {
  it("normalizes attachment file fields from nested media", () => {
    const message = mapMessage(
      {
        id: "msg-1",
        conversation_id: "conv-1",
        author_id: "user-1",
        author_type: "user",
        content: "",
        attachments: [
          {
            id: "att-1",
            message_id: "msg-1",
            media_id: "media-1",
            media: {
              id: "media-1",
              file_path: "folder/image.webp",
              file_type: "image/webp",
              file_size: 42,
            },
          },
        ],
        created_at: "2026-03-26T10:00:00.000Z",
      },
      "user-1",
    );

    expect(message.attachments).toHaveLength(1);
    expect(message.attachments?.[0]).toMatchObject({
      file_path: "folder/image.webp",
      file_type: "image/webp",
      file_size: 42,
      media: {
        id: "media-1",
        file_path: "folder/image.webp",
      },
    });
  });

  it("normalizes attachment file fields from top-level attachment shape", () => {
    const message = mapMessage(
      {
        id: "msg-2",
        conversation_id: "conv-1",
        sender_id: "user-2",
        content: "",
        attachments: [
          {
            id: "att-2",
            message_id: "msg-2",
            media_id: "media-2",
            file_path: "folder/fallback.png",
            file_type: "image/png",
          },
        ],
        created_at: "2026-03-26T10:01:00.000Z",
      },
      "user-1",
    );

    expect(message.attachments).toHaveLength(1);
    expect(message.attachments?.[0]).toMatchObject({
      file_path: "folder/fallback.png",
      file_type: "image/png",
      media: {
        id: "media-2",
        file_path: "folder/fallback.png",
        file_type: "image/png",
      },
    });
  });
});
