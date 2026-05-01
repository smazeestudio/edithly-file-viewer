import { lazy, Suspense } from "react";
import type { ComponentType } from "react";
import type { FileKind, FileViewerProps, ViewerComponentProps } from "../types";
import { detectFileType } from "../utils/detectFileType";
import { UnsupportedViewer } from "./UnsupportedViewer";
import { getPanelStyle, getViewerStyle, getMutedColor } from "./shared";

const PdfViewer = lazy(() => import("./viewers/PdfViewer").then((m) => ({ default: m.PdfViewer })));
const DocxViewer = lazy(() =>
  import("./viewers/DocxViewer").then((m) => ({ default: m.DocxViewer })),
);
const PptxViewer = lazy(() =>
  import("./viewers/PptxViewer").then((m) => ({ default: m.PptxViewer })),
);
const TextViewer = lazy(() =>
  import("./viewers/TextViewer").then((m) => ({ default: m.TextViewer })),
);
const CodeViewer = lazy(() =>
  import("./viewers/CodeViewer").then((m) => ({ default: m.CodeViewer })),
);
const HtmlViewer = lazy(() =>
  import("./viewers/HtmlViewer").then((m) => ({ default: m.HtmlViewer })),
);
const MarkdownViewer = lazy(() =>
  import("./viewers/MarkdownViewer").then((m) => ({ default: m.MarkdownViewer })),
);
const CsvViewer = lazy(() => import("./viewers/CsvViewer").then((m) => ({ default: m.CsvViewer })));
const ExcelViewer = lazy(() =>
  import("./viewers/ExcelViewer").then((m) => ({ default: m.ExcelViewer })),
);
const JsonViewer = lazy(() =>
  import("./viewers/JsonViewer").then((m) => ({ default: m.JsonViewer })),
);
const ImageViewer = lazy(() =>
  import("./viewers/ImageViewer").then((m) => ({ default: m.ImageViewer })),
);

const viewerMap: Record<FileKind, ComponentType<ViewerComponentProps>> = {
  pdf: PdfViewer,
  docx: DocxViewer,
  pptx: PptxViewer,
  txt: TextViewer,
  code: CodeViewer,
  html: HtmlViewer,
  md: MarkdownViewer,
  csv: CsvViewer,
  excel: ExcelViewer,
  json: JsonViewer,
  image: ImageViewer,
  unknown: UnsupportedViewer,
};

export function FileViewer({
  src,
  fileName,
  height = "800px",
  theme = "light",
}: FileViewerProps) {
  const type = detectFileType(fileName);
  const style = getViewerStyle(theme, height);
  const Viewer = viewerMap[type] ?? UnsupportedViewer;

  return (
    <div style={getPanelStyle(theme)}>
      <Suspense
        fallback={
          <div
            style={{
              ...style,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: getMutedColor(theme),
            }}
          >
            Loading viewer...
          </div>
        }
      >
        <Viewer src={src} fileName={fileName} height={height} theme={theme} style={style} />
      </Suspense>
    </div>
  );
}
