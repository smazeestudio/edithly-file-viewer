import type { CSSProperties } from "react";

export type FileViewerTheme = "light" | "dark";

export type TextSelectionPayload = {
  file_name: string;
  file_id?: string;
  text: string;
  page_number?: number;
  line_number?: string;
};

export type FileViewerSearchMode = {
  text: string;
};

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
  fileId?: string;
  height?: string;
  theme?: FileViewerTheme;
  searchMode?: FileViewerSearchMode;
  onTextSelect?: (payload: TextSelectionPayload) => void;
}

export interface ViewerComponentProps
  extends Required<Pick<FileViewerProps, "src" | "fileName" | "height" | "theme">> {
  searchQuery?: string;
  style: CSSProperties;
}
