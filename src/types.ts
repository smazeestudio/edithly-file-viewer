import type { CSSProperties } from "react";

export type FileViewerTheme = "light" | "dark";

export type FileKind =
  | "pdf"
  | "docx"
  | "pptx"
  | "txt"
  | "code"
  | "html"
  | "md"
  | "csv"
  | "excel"
  | "json"
  | "image"
  | "unknown";

export interface FileViewerProps {
  src: string | File;
  fileName: string;
  height?: string;
  theme?: FileViewerTheme;
}

export interface ViewerComponentProps extends Required<FileViewerProps> {
  style: CSSProperties;
}
