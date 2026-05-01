import { useEffect, useMemo, useRef, useState } from "react";
import { init } from "pptx-preview";
import type { PPTXPreviewer } from "pptx-preview/dist/previewer/PPTXPreviewer";
import type { ViewerComponentProps } from "../../types";
import { readFileAsArrayBuffer } from "../../utils/fetchFile";
import { ErrorState } from "../ErrorState";
import { getMutedColor } from "../shared";

export function PptxViewer({ src, style, theme }: ViewerComponentProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const previewerRef = useRef<PPTXPreviewer | null>(null);
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [slideCount, setSlideCount] = useState<number>(0);
  const [currentSlide, setCurrentSlide] = useState<number>(1);
  const [slideInput, setSlideInput] = useState<string>("1");
  const [error, setError] = useState<string | null>(null);
  const isDark = theme === "dark";

  useEffect(() => {
    let cancelled = false;

    readFileAsArrayBuffer(src)
      .then((buffer) => {
        if (!cancelled) {
          setBuffer(buffer);
          setSlideCount(0);
          setCurrentSlide(1);
          setSlideInput("1");
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setBuffer(null);
          setError(err instanceof Error ? err.message : "Unable to load PPTX file.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    let disposed = false;

    async function loadPreview() {
      const host = hostRef.current;
      if (!host || !buffer) return;
      previewerRef.current?.destroy();
      host.innerHTML = "";

      const nextPreviewer = init(host, {
        width: 960,
        height: 620,
        mode: "slide",
      });

      previewerRef.current = nextPreviewer;
      await nextPreviewer.load(buffer);

      if (!disposed) {
        const count = nextPreviewer.slideCount || 0;
        setSlideCount(count);
        const nextCurrent = Math.min(Math.max(1, 1), Math.max(count, 1));
        setCurrentSlide(nextCurrent);
        setSlideInput(String(nextCurrent));
        if (count > 0) {
          nextPreviewer.renderSingleSlide(nextCurrent - 1);
          annotateRenderedSlides(host, nextCurrent);
        }
      }
    }

    loadPreview().catch((err: unknown) => {
      if (!disposed) {
        setError(err instanceof Error ? err.message : "Unable to render PPTX file.");
      }
    });

    return () => {
      disposed = true;
      previewerRef.current?.destroy();
      previewerRef.current = null;
    };
  }, [buffer]);

  useEffect(() => {
    const previewer = previewerRef.current;
    const host = hostRef.current;
    if (!previewer || !host || slideCount === 0) {
      return;
    }

    previewer.renderSingleSlide(currentSlide - 1);
    annotateRenderedSlides(host, currentSlide);
  }, [currentSlide, slideCount]);

  useEffect(() => {
    setSlideInput(String(currentSlide));
  }, [currentSlide]);

  const canGoPrev = currentSlide > 1;
  const canGoNext = currentSlide < slideCount;

  const previewStyles = useMemo(
    () => getPptPreviewCss(theme),
    [theme],
  );

  if (error) {
    return <ErrorState error={error} style={style} theme={theme} />;
  }

  return (
    <div
      style={{
        ...style,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backgroundColor: isDark ? "#0b1220" : "#f3f4f6",
      }}
    >
      <style>{previewStyles}</style>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          borderBottom: `1px solid ${isDark ? "#334155" : "#e5e7eb"}`,
          backgroundColor: isDark ? "#0f172a" : "#ffffff",
        }}
      >
        <ToolbarButton
          label="Previous"
          disabled={!canGoPrev}
          onClick={() => setCurrentSlide((slide) => Math.max(1, slide - 1))}
          theme={theme}
        />
        <ToolbarButton
          label="Next"
          disabled={!canGoNext}
          onClick={() => setCurrentSlide((slide) => Math.min(slideCount, slide + 1))}
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
          Slide
          <input
            type="number"
            min={1}
            max={slideCount || 1}
            value={slideInput}
            onChange={(event) => setSlideInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                jumpToSlide(slideInput, slideCount, setCurrentSlide, setSlideInput);
              }
            }}
            onBlur={() => jumpToSlide(slideInput, slideCount, setCurrentSlide, setSlideInput)}
            style={{
              width: 68,
              border: `1px solid ${isDark ? "#334155" : "#cbd5e1"}`,
              borderRadius: 8,
              padding: "6px 8px",
              backgroundColor: isDark ? "#111827" : "#ffffff",
              color: isDark ? "#e2e8f0" : "#0f172a",
            }}
          />
          <span>of {slideCount || "..."}</span>
        </label>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
        <div ref={hostRef} />
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

function jumpToSlide(
  value: string,
  slideCount: number,
  setCurrentSlide: (page: number) => void,
  setSlideInput: (value: string) => void,
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    setSlideInput("1");
    return;
  }

  const nextSlide = Math.min(Math.max(1, Math.trunc(parsed)), Math.max(slideCount, 1));
  setCurrentSlide(nextSlide);
  setSlideInput(String(nextSlide));
}

function getPptPreviewCss(theme: ViewerComponentProps["theme"]): string {
  const isDark = theme === "dark";

  return `
    .pptx-preview-wrapper {
      display: flex;
      flex-direction: column;
      gap: 24px;
      align-items: center;
      width: 100% !important;
      max-width: 1120px;
      margin: 0 auto !important;
      background: transparent !important;
      padding: 8px 0 24px;
      box-sizing: border-box;
    }

    .pptx-preview-slide-wrapper {
      margin: 0 auto 24px !important;
    }

    .pptx-preview-slide-wrapper,
    .pptx-preview-slide {
      box-shadow: ${isDark ? "0 20px 48px rgba(2, 6, 23, 0.6)" : "0 8px 28px rgba(15, 23, 42, 0.14)"};
      border-radius: 8px;
      overflow: hidden;
      background: #ffffff;
    }

    .pptx-preview-wrapper-next,
    .pptx-preview-wrapper-pagination {
      display: none !important;
    }

    .slide-master-wrapper,
    .slide-layout-wrapper,
    .slide-wrapper {
      transform-origin: top left !important;
    }
  `;
}

function annotateRenderedSlides(host: HTMLDivElement, pageNumber: number) {
  const slides = host.querySelectorAll(".pptx-preview-slide-wrapper");
  slides.forEach((slide) => {
    slide.setAttribute("data-file-viewer-page-number", String(pageNumber));
  });
}
