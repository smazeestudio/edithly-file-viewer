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

export function detectFileType(fileName: string): FileKind {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (!ext) return "unknown";
  if (ext === "pdf") return "pdf";
  if (["txt", "log"].includes(ext)) return "txt";
  if (["html", "htm"].includes(ext)) return "html";
  if (["md", "markdown"].includes(ext)) return "md";
  if (ext === "csv") return "csv";
  if (["xls", "xlsx"].includes(ext)) return "excel";
  if (ext === "json") return "json";
  if (imageExtensions.has(ext)) return "image";
  if (codeExtensions.has(ext)) return "code";
  return "unknown";
}
