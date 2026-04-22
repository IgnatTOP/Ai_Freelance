import { env } from "@/shared/config/env";
import { authTokenStorage } from "@/shared/api/client";

export type UploadedMedia = {
  id: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
};

export const mediaApi = {
  async uploadPhoto(file: File): Promise<UploadedMedia> {
    const token = authTokenStorage.get();
    const formData = new FormData();
    formData.append("file", file);
    const init: RequestInit = {
      method: "POST",
      body: formData
    };
    if (token) {
      init.headers = { Authorization: `Bearer ${token}` };
    }

    const response = await fetch(`${env.API_URL}/media/photos`, init);

    const json = await response.json();
    if (!response.ok) {
      const errMsg =
        (json && typeof json === "object" && "error" in json && typeof json.error === "object" && json.error?.message) ||
        (json && typeof json === "object" && "error" in json && typeof json.error === "string" && json.error) ||
        "Не удалось загрузить файл";
      throw new Error(errMsg as string);
    }

    // Backend may wrap response in { success: true, data: {...} }
    const media: UploadedMedia =
      (json && typeof json === "object" && "data" in json && json.data && typeof json.data === "object" && "id" in json.data)
        ? json.data as UploadedMedia
        : json as UploadedMedia;

    if (!media.id) {
      throw new Error("Upload succeeded but response missing media id");
    }
    return media;
  }
};
