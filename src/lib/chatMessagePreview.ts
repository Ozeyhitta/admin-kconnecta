const CALL_LOG_PREFIX = "__CALL_LOG__:";
const REPLY_PREFIX = "__REPLY__:";
const VOICE_MESSAGE_PREFIX = "__VOICE__:";
const IMAGE_MESSAGE_PREFIX = "__IMAGE__:";
const FILE_MESSAGE_PREFIX = "__FILE__:";
const VIDEO_SHARE_PREFIX = "__VIDEO_SHARE__:";
const CHAT_ACTION_PREFIX = "__CHAT_ACTION__:";
const STORY_REPLY_PREFIX = "__STORY_REPLY__:";
const POST_SHARE_PREFIX = "__POST_SHARE__:";

export function formatChatMessagePreview(content?: string | null): string {
  const raw = content?.trim();
  if (!raw) return "";

  if (raw.startsWith(VOICE_MESSAGE_PREFIX)) {
    return "Tin nhắn thoại";
  }

  if (raw.startsWith(IMAGE_MESSAGE_PREFIX)) {
    try {
      const payload = JSON.parse(raw.slice(IMAGE_MESSAGE_PREFIX.length));
      const caption = typeof payload?.caption === "string" ? payload.caption.trim() : "";
      return caption || "Ảnh";
    } catch {
      return "Ảnh";
    }
  }

  if (raw.startsWith(VIDEO_SHARE_PREFIX)) {
    return "Video";
  }

  if (raw.startsWith(FILE_MESSAGE_PREFIX)) {
    try {
      const payload = JSON.parse(raw.slice(FILE_MESSAGE_PREFIX.length));
      return typeof payload?.fileName === "string" && payload.fileName.trim()
        ? payload.fileName.trim()
        : "File";
    } catch {
      return "File";
    }
  }

  if (raw.startsWith(POST_SHARE_PREFIX)) {
    try {
      const payload = JSON.parse(raw.slice(POST_SHARE_PREFIX.length));
      const text = typeof payload?.content === "string" ? payload.content.trim() : "";
      return text || "Đã chia sẻ một bài viết";
    } catch {
      return "Đã chia sẻ một bài viết";
    }
  }

  if (raw.startsWith(CHAT_ACTION_PREFIX)) {
    return "";
  }

  if (raw.startsWith(STORY_REPLY_PREFIX) || raw.includes("STORY_REPLY")) {
    try {
      const rawPayload = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : "";
      const payload = rawPayload ? JSON.parse(rawPayload) : null;
      if (typeof payload?.text === "string" && payload.text.trim()) {
        return payload.text.trim();
      }
    } catch {
      // ignore invalid payload
    }
    return "Đã trả lời tin";
  }

  if (raw.startsWith(REPLY_PREFIX)) {
    try {
      const payload = JSON.parse(raw.slice(REPLY_PREFIX.length));
      return typeof payload?.text === "string" ? payload.text.trim() : raw;
    } catch {
      return raw;
    }
  }

  if (!raw.startsWith(CALL_LOG_PREFIX)) {
    return raw;
  }

  try {
    const payload = JSON.parse(raw.slice(CALL_LOG_PREFIX.length));
    const mediaType: "audio" | "video" =
      payload?.mediaType === "video" || String(payload?.label || "").toLowerCase().includes("video")
        ? "video"
        : "audio";

    if (typeof payload?.label === "string" && payload.label.trim()) {
      return payload.label.trim();
    }
    if (payload?.kind === "completed") {
      return mediaType === "video" ? "Cuộc gọi video hoàn thành" : "Cuộc gọi thoại hoàn thành";
    }
    return mediaType === "video" ? "Đã bỏ lỡ cuộc gọi video" : "Đã bỏ lỡ cuộc gọi thoại";
  } catch {
    return "Đã bỏ lỡ cuộc gọi thoại";
  }
}
