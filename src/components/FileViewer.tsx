import { lazy, Suspense, useDeferredValue, useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import type { MutableRefObject } from "react";
import type { FileKind, FileViewerProps, ViewerComponentProps } from "../types";
import { detectFileType } from "../utils/detectFileType";
import {
  clearSearchMatches,
  collectSearchRoots,
  createSearchMatches,
  setActiveSearchMatch,
} from "./search";
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
  searchMode,
  onTextSelect,
}: FileViewerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const type = detectFileType(fileName);
  const style = getViewerStyle(theme, height);
  const Viewer = viewerMap[type] ?? UnsupportedViewer;
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const searchRootsRef = useRef<HTMLElement[]>([]);
  const searchMatchesRef = useRef<HTMLElement[]>([]);
  const lastSelectionSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!onTextSelect) {
      return;
    }

    const emitTextSelection = onTextSelect;

    function handleSelectionChange() {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();
      if (!selection || !selectedText || selection.rangeCount === 0) {
        lastSelectionSignatureRef.current = null;
        return;
      }

      const root = rootRef.current;
      const anchorNode = selection.anchorNode;
      const focusNode = selection.focusNode;
      const range = selection.getRangeAt(0);
      const commonAncestorNode = range.commonAncestorContainer;

      if (
        !root ||
        !anchorNode ||
        !focusNode ||
        !root.contains(anchorNode) ||
        !root.contains(focusNode) ||
        !root.contains(commonAncestorNode)
      ) {
        lastSelectionSignatureRef.current = null;
        return;
      }

      const pageNumber = getSelectionPageNumber(anchorNode);
      const lineNumber = getSelectionLineNumber(range);
      const signature = JSON.stringify({
        file_name: fileName,
        file_id: fileId,
        text: selectedText,
        page_number: pageNumber,
        line_number: lineNumber,
      });

      if (lastSelectionSignatureRef.current === signature) {
        return;
      }

      lastSelectionSignatureRef.current = signature;

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

  useEffect(() => {
    lastSelectionSignatureRef.current = null;
    setSearchQuery("");
    setMatchCount(0);
    setActiveMatchIndex(0);
    setIsSearchOpen(false);
    clearCurrentSearchHighlights(searchRootsRef, searchMatchesRef);
  }, [fileId, fileName, src]);

  useEffect(() => {
    if (searchMode === undefined) {
      return;
    }

    const nextSearchText = searchMode.text.trim();
    if (!nextSearchText) {
      setSearchQuery("");
      setMatchCount(0);
      setActiveMatchIndex(0);
      return;
    }

    setSearchQuery(nextSearchText);
    setActiveMatchIndex(0);
  }, [searchMode?.text]);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, [isSearchOpen]);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) {
      return;
    }
    const searchContainer = container;

    const normalizedQuery = deferredSearchQuery.trim();
    let disposed = false;
    let animationFrame = 0;
    let observer: MutationObserver | null = null;
    const iframeCleanups: Array<() => void> = [];

    function clearIFrameListeners() {
      while (iframeCleanups.length > 0) {
        iframeCleanups.pop()?.();
      }
    }

    function rebuildMatches() {
      const roots = collectSearchRoots(searchContainer);
      searchRootsRef.current = roots;
      clearCurrentSearchHighlights(searchRootsRef, searchMatchesRef);

      if (!normalizedQuery) {
        if (matchCount !== 0) {
          setMatchCount(0);
        }
        if (activeMatchIndex !== 0) {
          setActiveMatchIndex(0);
        }
        return;
      }

      const matches = createSearchMatches(roots, normalizedQuery, theme);
      searchMatchesRef.current = matches;

      const resolvedIndex = matches.length === 0 ? 0 : Math.min(activeMatchIndex, matches.length - 1);
      if (matchCount !== matches.length) {
        setMatchCount(matches.length);
      }
      if (activeMatchIndex !== resolvedIndex) {
        setActiveMatchIndex(resolvedIndex);
      }
      if (matches.length > 0) {
        setActiveSearchMatch(roots, matches, resolvedIndex, theme);
      }
    }

    function scheduleRebuild() {
      observer?.disconnect();
      clearIFrameListeners();
      cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        if (disposed) {
          return;
        }

        rebuildMatches();
        observeMutations();
      });
    }

    function observeMutations() {
      if (!normalizedQuery) {
        return;
      }

      observer?.disconnect();
      clearIFrameListeners();
      observer = new MutationObserver(() => {
        scheduleRebuild();
      });
      observer.observe(searchContainer, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      for (const iframe of searchContainer.querySelectorAll("iframe")) {
        const onLoad = () => {
          scheduleRebuild();
        };

        iframe.addEventListener("load", onLoad);
        iframeCleanups.push(() => {
          iframe.removeEventListener("load", onLoad);
        });
      }
    }

    rebuildMatches();
    observeMutations();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      observer?.disconnect();
      clearIFrameListeners();
      clearCurrentSearchHighlights(searchRootsRef, searchMatchesRef);
    };
  }, [deferredSearchQuery, fileId, fileName, src, theme]);

  useEffect(() => {
    if (searchMatchesRef.current.length === 0) {
      return;
    }

    const resolvedIndex = Math.min(activeMatchIndex, Math.max(searchMatchesRef.current.length - 1, 0));
    if (resolvedIndex !== activeMatchIndex) {
      setActiveMatchIndex(resolvedIndex);
      return;
    }

    setActiveSearchMatch(searchRootsRef.current, searchMatchesRef.current, resolvedIndex, theme);
  }, [activeMatchIndex, theme]);

  const hasSearchQuery = searchQuery.trim().length > 0;
  const canNavigateMatches = hasSearchQuery && matchCount > 0;

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      style={getPanelStyle(theme, height)}
      onMouseDownCapture={() => {
        rootRef.current?.focus();
      }}
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
          event.preventDefault();
          setIsSearchOpen(true);
          return;
        }

        if (event.key === "Escape" && isSearchOpen) {
          event.preventDefault();
          setIsSearchOpen(false);
          setSearchQuery("");
          setMatchCount(0);
          setActiveMatchIndex(0);
        }
      }}
    >
      {isSearchOpen ? (
        <div
          data-file-viewer-search-ignore="true"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            borderBottom: `1px solid ${theme === "dark" ? "#334155" : "#e2e8f0"}`,
            backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flex: "1 1 280px",
              minWidth: 220,
              fontSize: 13,
              color: getMutedColor(theme),
            }}
          >
            Search
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setActiveMatchIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && matchCount > 0) {
                  event.preventDefault();
                  setActiveMatchIndex((current) => {
                    if (event.shiftKey) {
                      return (current - 1 + matchCount) % matchCount;
                    }
                    return (current + 1) % matchCount;
                  });
                }
              }}
              placeholder="Search this file"
              style={{
                flex: 1,
                minWidth: 0,
                border: `1px solid ${theme === "dark" ? "#334155" : "#cbd5e1"}`,
                borderRadius: 8,
                padding: "8px 10px",
                backgroundColor: theme === "dark" ? "#111827" : "#ffffff",
                color: theme === "dark" ? "#e2e8f0" : "#0f172a",
              }}
            />
          </label>

          <div
            style={{
              minWidth: 92,
              textAlign: "right",
              fontSize: 13,
              color: getMutedColor(theme),
            }}
          >
            {hasSearchQuery ? `${matchCount === 0 ? 0 : activeMatchIndex + 1} / ${matchCount}` : "0 / 0"}
          </div>

          <ToolbarButton
            label="Up"
            disabled={!canNavigateMatches}
            onClick={() =>
              setActiveMatchIndex((current) => (current - 1 + matchCount) % matchCount)
            }
            theme={theme}
          />
          <ToolbarButton
            label="Down"
            disabled={!canNavigateMatches}
            onClick={() => setActiveMatchIndex((current) => (current + 1) % matchCount)}
            theme={theme}
          />
          <ToolbarButton
            label="Close"
            disabled={false}
            onClick={() => {
              setIsSearchOpen(false);
              setSearchQuery("");
              setMatchCount(0);
              setActiveMatchIndex(0);
            }}
            theme={theme}
          />
        </div>
      ) : null}

      <div ref={contentRef} style={{ flex: 1, minHeight: 0 }}>
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
          <Viewer
            src={src}
            fileName={fileName}
            height={height}
            theme={theme}
            searchQuery={deferredSearchQuery.trim()}
            style={style}
          />
        </Suspense>
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
        padding: "8px 10px",
        backgroundColor: disabled ? (isDark ? "#111827" : "#f8fafc") : isDark ? "#1e293b" : "#ffffff",
        color: disabled ? getMutedColor(theme) : isDark ? "#e2e8f0" : "#0f172a",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 13,
      }}
    >
      {label}
    </button>
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

function clearCurrentSearchHighlights(
  searchRootsRef: MutableRefObject<HTMLElement[]>,
  searchMatchesRef: MutableRefObject<HTMLElement[]>,
): void {
  if (searchRootsRef.current.length > 0) {
    clearSearchMatches(searchRootsRef.current);
  }
  searchRootsRef.current = [];
  searchMatchesRef.current = [];
}
