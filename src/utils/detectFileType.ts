import type { FileKind } from "../types";

const codeExtensions = new Set([
  "js",
  "ts",
  "tsx",
  "jsx",
  "py",
  "java",
  "cpp",
  "c",
  "go",
  "rs",
  "php",
  "rb",
  "css",
  "scss",
  "sql",
  "yaml",
  "yml",
  "xml",
]);

const imageExtensions = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"]);
const videoExtensions = new Set(["mp4", "webm", "ogg", "mov", "avi", "mkv", "m4v", "ogv"]);

const youtubeHostnames = new Set([
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "m.youtube.com",
]);

export function detectFileType(fileName: string): FileKind {
  if (fileName.startsWith("http://") || fileName.startsWith("https://")) {
    try {
      const { hostname } = new URL(fileName);
      if (youtubeHostnames.has(hostname)) return "youtube";
    } catch {
      // not a valid URL — fall through
    }
    return "url";
  }

  const ext = fileName.split(".").pop()?.toLowerCase();

  if (!ext) return "unknown";
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (["ppt", "pptx"].includes(ext)) return "pptx";
  if (["txt", "log"].includes(ext)) return "txt";
  if (["html", "htm"].includes(ext)) return "html";
  if (["md", "markdown"].includes(ext)) return "md";
  if (ext === "csv") return "csv";
  if (["xls", "xlsx"].includes(ext)) return "excel";
  if (ext === "json") return "json";
  if (imageExtensions.has(ext)) return "image";
  if (videoExtensions.has(ext)) return "video";
  if (codeExtensions.has(ext)) return "code";
  return "unknown";
}
