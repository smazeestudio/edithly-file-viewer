import { useEffect, useMemo, useRef, useState } from "react";
import type { ViewerComponentProps } from "../../types";
import { readFileAsArrayBuffer } from "../../utils/fetchFile";
import { ErrorState } from "../ErrorState";
import { getMutedColor } from "../shared";

type PdfDocumentProxyLike = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageProxyLike>;
  destroy?: () => void;
};

type PdfPageProxyLike = {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  getTextContent: () => Promise<unknown>;
  render: (params: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
    canvas: HTMLCanvasElement;
  }) => { promise: Promise<void> };
};

type PdfLibraryLike = {
  version?: string;
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (options: { data: ArrayBuffer }) => { promise: Promise<unknown> };
  TextLayer: new (options: {
    textContentSource: unknown;
    container: HTMLElement;
    viewport: unknown;
  }) => PdfTextLayerLike;
};

type PdfTextLayerLike = {
  render: () => Promise<unknown>;
  cancel?: () => void;
};

type ViewMode = "single" | "continuous" | "two-column";

const pdfScale = 1.2;

export function PdfViewer({ src, style, theme }: ViewerComponentProps) {
  const [pdfLibrary, setPdfLibrary] = useState<PdfLibraryLike | null>(null);
  const [documentProxy, setDocumentProxy] = useState<PdfDocumentProxyLike | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>("1");
  const [viewMode, setViewMode] = useState<ViewMode>("continuous");
  const [error, setError] = useState<string | null>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const isDark = theme === "dark";

  useEffect(() => {
    let cancelled = false;
    let activeDocument: PdfDocumentProxyLike | null = null;

    async function loadPdf() {
      const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as PdfLibraryLike;
      const version = pdfjs.version ?? "latest";
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/legacy/build/pdf.worker.min.mjs`;

      const data = await readFileAsArrayBuffer(src);
      const loadedDocument = (await pdfjs.getDocument({ data }).promise) as unknown as PdfDocumentProxyLike;
      activeDocument = loadedDocument;

      if (!cancelled) {
        setPdfLibrary(pdfjs);
        setDocumentProxy(loadedDocument);
        setPageCount(loadedDocument.numPages);
        setCurrentPage(1);
        setPageInput("1");
        setError(null);
      }
    }

    loadPdf().catch((err: unknown) => {
      if (!cancelled) {
        setPdfLibrary(null);
        setDocumentProxy(null);
        setPageCount(0);
        setError(err instanceof Error ? err.message : "Unable to load PDF.");
      }
    });

    return () => {
      cancelled = true;
      activeDocument?.destroy?.();
    };
  }, [src]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    if (viewMode === "single") {
      return;
    }

    const target = pageRefs.current[currentPage];
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentPage, viewMode]);

  const pagesToRender = useMemo(() => {
    if (!pageCount) return [];
    if (viewMode === "single") return [currentPage];
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }, [currentPage, pageCount, viewMode]);

  if (error) {
    return <ErrorState error={error} style={style} theme={theme} />;
  }

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < pageCount;

  return (
    <div
      style={{
        ...style,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          borderBottom: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
          backgroundColor: isDark ? "#0f172a" : "#ffffff",
        }}
      >
        <ToolbarButton
          label="Previous"
          disabled={!canGoPrev}
          onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          theme={theme}
        />
        <ToolbarButton
          label="Next"
          disabled={!canGoNext}
          onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
          theme={theme}
        />

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: getMutedColor(theme),
          }}
        >
          Page
          <input
            type="number"
            min={1}
            max={pageCount || 1}
            value={pageInput}
            onChange={(event) => setPageInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                jumpToPage(pageInput, pageCount, setCurrentPage, setPageInput);
              }
            }}
            onBlur={() => jumpToPage(pageInput, pageCount, setCurrentPage, setPageInput)}
            style={{
              width: 68,
              border: `1px solid ${isDark ? "#334155" : "#cbd5e1"}`,
              borderRadius: 8,
              padding: "6px 8px",
              backgroundColor: isDark ? "#111827" : "#ffffff",
              color: isDark ? "#e2e8f0" : "#0f172a",
            }}
          />
          <span>of {pageCount || "..."}</span>
        </label>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <ViewModeButton
            active={viewMode === "single"}
            label="Single"
            onClick={() => setViewMode("single")}
            theme={theme}
          />
          <ViewModeButton
            active={viewMode === "continuous"}
            label="Continuous"
            onClick={() => setViewMode("continuous")}
            theme={theme}
          />
          <ViewModeButton
            active={viewMode === "two-column"}
            label="2 Column"
            onClick={() => setViewMode("two-column")}
            theme={theme}
          />
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: 16,
          backgroundColor: isDark ? "#0b1220" : "#f8fafc",
        }}
      >
        {!documentProxy ? (
          <div style={{ color: getMutedColor(theme) }}>Loading PDF...</div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: viewMode === "two-column" ? "repeat(2, minmax(0, 1fr))" : "1fr",
              alignItems: "start",
            }}
          >
            {pagesToRender.map((pageNumber) => (
              <div
                key={pageNumber}
                ref={(node) => {
                  pageRefs.current[pageNumber] = node;
                }}
                data-file-viewer-page-number={pageNumber}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div style={{ color: getMutedColor(theme), fontSize: 13 }}>
                  Page {pageNumber}
                </div>
                <PdfPageCanvas
                  pdfLibrary={pdfLibrary}
                  documentProxy={documentProxy}
                  pageNumber={pageNumber}
                  theme={theme}
                  onVisible={() => {
                    if (viewMode !== "single") {
                      setCurrentPage((page) => (page === pageNumber ? page : pageNumber));
                    }
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PdfPageCanvas({
  pdfLibrary,
  documentProxy,
  pageNumber,
  theme,
  onVisible,
}: {
  pdfLibrary: PdfLibraryLike | null;
  documentProxy: PdfDocumentProxyLike;
  pageNumber: number;
  theme: ViewerComponentProps["theme"];
  onVisible: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const isDark = theme === "dark";

  useEffect(() => {
    let cancelled = false;
    let textLayerInstance: PdfTextLayerLike | null = null;

    async function renderPage() {
      if (!pdfLibrary) {
        return;
      }

      const page = await documentProxy.getPage(pageNumber);
      const viewport = page.getViewport({ scale: pdfScale });
      const canvas = canvasRef.current;
      const textLayerContainer = textLayerRef.current;

      if (!canvas || !textLayerContainer || cancelled) {
        return;
      }

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas context unavailable.");
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setPageSize({ width: viewport.width, height: viewport.height });
      textLayerContainer.innerHTML = "";

      await page.render({ canvasContext: context, viewport, canvas }).promise;
      const textContent = await page.getTextContent();
      textLayerInstance = new pdfLibrary.TextLayer({
        textContentSource: textContent,
        container: textLayerContainer,
        viewport,
      });
      await textLayerInstance.render();

      if (!cancelled) {
        setRenderError(null);
      }
    }

    renderPage().catch((err: unknown) => {
      if (!cancelled) {
        setRenderError(err instanceof Error ? err.message : `Unable to render page ${pageNumber}.`);
      }
    });

    return () => {
      cancelled = true;
      textLayerInstance?.cancel?.();
    };
  }, [documentProxy, pageNumber, pdfLibrary]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            onVisible();
            break;
          }
        }
      },
      { threshold: 0.6 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [onVisible]);

  if (renderError) {
    return (
      <div
        style={{
          width: "100%",
          padding: 16,
          color: isDark ? "#fca5a5" : "#b91c1c",
          backgroundColor: isDark ? "#2b1215" : "#fef2f2",
          border: `1px solid ${isDark ? "#7f1d1d" : "#fecaca"}`,
          borderRadius: 12,
        }}
      >
        {renderError}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        overflowX: "auto",
      }}
    >
      <div
        style={{
          position: "relative",
          width: pageSize?.width ?? 0,
          minWidth: pageSize?.width ?? 0,
          height: pageSize?.height ?? 0,
          backgroundColor: "#ffffff",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: isDark
            ? "0 10px 30px rgba(15, 23, 42, 0.55)"
            : "0 8px 24px rgba(15, 23, 42, 0.08)",
        }}
      >
        <style>{getPdfTextLayerCss(theme)}</style>
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            width: pageSize?.width ?? 0,
            height: pageSize?.height ?? 0,
          }}
        />
        <div
          ref={textLayerRef}
          className={`fv-pdf-text-layer ${theme === "dark" ? "dark" : "light"}`}
        />
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  disabled,
  onClick,
  theme,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  theme: ViewerComponentProps["theme"];
}) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        border: `1px solid ${isDark ? "#334155" : "#cbd5e1"}`,
        borderRadius: 8,
        padding: "6px 10px",
        backgroundColor: disabled ? (isDark ? "#111827" : "#f8fafc") : isDark ? "#1e293b" : "#ffffff",
        color: disabled ? getMutedColor(theme) : isDark ? "#e2e8f0" : "#0f172a",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {label}
    </button>
  );
}

function ViewModeButton({
  active,
  label,
  onClick,
  theme,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  theme: ViewerComponentProps["theme"];
}) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${active ? (isDark ? "#64748b" : "#94a3b8") : isDark ? "#334155" : "#cbd5e1"}`,
        borderRadius: 8,
        padding: "6px 10px",
        backgroundColor: active ? (isDark ? "#1e293b" : "#e2e8f0") : "transparent",
        color: isDark ? "#e2e8f0" : "#0f172a",
        cursor: "pointer",
        fontWeight: active ? 600 : 500,
      }}
    >
      {label}
    </button>
  );
}

function jumpToPage(
  value: string,
  pageCount: number,
  setCurrentPage: (page: number) => void,
  setPageInput: (value: string) => void,
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    setPageInput("1");
    return;
  }

  const nextPage = Math.min(Math.max(1, Math.trunc(parsed)), Math.max(pageCount, 1));
  setCurrentPage(nextPage);
  setPageInput(String(nextPage));
}

function getPdfTextLayerCss(theme: ViewerComponentProps["theme"]): string {
  const selectionBackground =
    theme === "dark" ? "rgba(96, 165, 250, 0.35)" : "rgba(37, 99, 235, 0.2)";

  return `
    .fv-pdf-text-layer {
      position: absolute;
      inset: 0;
      overflow: hidden;
      line-height: 1;
      opacity: 1;
      z-index: 1;
      forced-color-adjust: none;
      text-size-adjust: none;
      transform-origin: 0 0;
    }

    .fv-pdf-text-layer span,
    .fv-pdf-text-layer br {
      position: absolute;
      white-space: pre;
      color: transparent;
      cursor: text;
      transform-origin: 0 0;
    }

    .fv-pdf-text-layer::selection,
    .fv-pdf-text-layer span::selection {
      background: ${selectionBackground};
    }
  `;
}
