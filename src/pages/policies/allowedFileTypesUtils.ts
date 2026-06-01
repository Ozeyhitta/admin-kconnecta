export type FileTypeCategory = "images" | "videos" | "documents";

export interface FileTypePreset {
  ext: string;
  label: string;
  category: FileTypeCategory;
}

export const FILE_TYPE_PRESETS: FileTypePreset[] = [
  { ext: "jpg", label: "JPG", category: "images" },
  { ext: "jpeg", label: "JPEG", category: "images" },
  { ext: "png", label: "PNG", category: "images" },
  { ext: "gif", label: "GIF", category: "images" },
  { ext: "webp", label: "WebP", category: "images" },
  { ext: "svg", label: "SVG", category: "images" },
  { ext: "heic", label: "HEIC", category: "images" },
  { ext: "mp4", label: "MP4", category: "videos" },
  { ext: "mov", label: "MOV", category: "videos" },
  { ext: "webm", label: "WebM", category: "videos" },
  { ext: "mkv", label: "MKV", category: "videos" },
  { ext: "pdf", label: "PDF", category: "documents" },
  { ext: "doc", label: "DOC", category: "documents" },
  { ext: "docx", label: "DOCX", category: "documents" },
  { ext: "txt", label: "TXT", category: "documents" },
];

const CATEGORY_LABEL: Record<FileTypeCategory, string> = {
  images: "Images",
  videos: "Videos",
  documents: "Documents",
};

export const getCategoryLabel = (c: FileTypeCategory) => CATEGORY_LABEL[c];

export const parseAllowedFileTypes = (raw: string): string[] => {
  if (!raw?.trim()) return [];
  return [
    ...new Set(
      raw
        .split(/[,;\s]+/)
        .map((s) => normalizeExtension(s))
        .filter(Boolean)
    ),
  ];
};

export const serializeAllowedFileTypes = (exts: string[]): string =>
  exts.map(normalizeExtension).filter(Boolean).join(",");

export const normalizeExtension = (raw: string): string => {
  const t = raw.trim().toLowerCase().replace(/^\./, "");
  if (!t) return "";
  return t.replace(/[^a-z0-9]/g, "");
};

export const getPresetCategory = (ext: string): FileTypeCategory | "custom" => {
  const found = FILE_TYPE_PRESETS.find((p) => p.ext === ext);
  return found?.category ?? "custom";
};

const EXT_PATTERN = /^[a-z0-9]{1,10}$/;

export type FileTypesValidation = {
  valid: boolean;
  message: string | null;
  tone: "success" | "warning" | "error" | "neutral";
};

export const validateAllowedFileTypes = (exts: string[]): FileTypesValidation => {
  if (exts.length === 0) {
    return {
      valid: false,
      message: "Chọn ít nhất một định dạng file được phép upload.",
      tone: "warning",
    };
  }

  const invalid = exts.filter((e) => !EXT_PATTERN.test(e));
  if (invalid.length > 0) {
    return {
      valid: false,
      message: `Định dạng không hợp lệ: ${invalid.join(", ")} (chỉ a-z, 0-9, tối đa 10 ký tự).`,
      tone: "error",
    };
  }

  if (exts.length > 24) {
    return {
      valid: false,
      message: "Tối đa 24 định dạng để tránh cấu hình quá rộng.",
      tone: "error",
    };
  }

  const hasImage = exts.some((e) => getPresetCategory(e) === "images");
  const hasVideo = exts.some((e) => getPresetCategory(e) === "videos");
  if (!hasImage && !hasVideo) {
    return {
      valid: true,
      message: "Chưa có ảnh/video — người dùng có thể không upload media.",
      tone: "warning",
    };
  }

  return {
    valid: true,
    message: `${exts.length} định dạng đang được phép.`,
    tone: "success",
  };
};

export const presetsByCategory = (category: FileTypeCategory) =>
  FILE_TYPE_PRESETS.filter((p) => p.category === category);
