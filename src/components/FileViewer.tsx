import { lazy, Suspense, useEffect, useRef } from "react";
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
  fileId,
  height = "800px",
  theme = "light",
  onTextSelect,
}: FileViewerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const type = detectFileType(fileName);
  const style = getViewerStyle(theme, height);
  const Viewer = viewerMap[type] ?? UnsupportedViewer;

  useEffect(() => {
    if (!onTextSelect) {
      return;
    }

    const emitTextSelection = onTextSelect;

    function handleSelectionChange() {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();
      if (!selection || !selectedText || selection.rangeCount === 0) {
        return;
      }

      const root = rootRef.current;
      const anchorNode = selection.anchorNode;
      if (!root || !anchorNode || !root.contains(anchorNode)) {
        return;
      }

      const pageNumber = getSelectionPageNumber(anchorNode);
      const lineNumber = getSelectionLineNumber(selection.getRangeAt(0));

      emitTextSelection({
        file_name: fileName,
        file_id: fileId,
        text: selectedText,
        page_number: pageNumber,
        line_number: lineNumber,
      });
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [fileId, fileName, onTextSelect]);

  return (
    <div ref={rootRef} style={getPanelStyle(theme)}>
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

function getSelectionPageNumber(node: Node): number | undefined {
  return getClosestNumericAttribute(node, "data-file-viewer-page-number");
}

function getSelectionLineNumber(range: Range): string | undefined {
  const startLine = getClosestNumericAttribute(range.startContainer, "data-file-viewer-line-number");
  const endLine = getClosestNumericAttribute(range.endContainer, "data-file-viewer-line-number");

  if (!startLine && !endLine) {
    return undefined;
  }

  if (!startLine) {
    return String(endLine);
  }

  if (!endLine) {
    return String(startLine);
  }

  const rangeStart = Math.min(startLine, endLine);
  const rangeEnd = Math.max(startLine, endLine);
  return rangeStart === rangeEnd ? String(rangeStart) : `${rangeStart}-${rangeEnd}`;
}

function getClosestNumericAttribute(node: Node, attributeName: string): number | undefined {
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  const value = element?.closest(`[${attributeName}]`)?.getAttribute(attributeName);
  if (!value) {
    return undefined;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}
