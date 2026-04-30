import { useEffect, useRef, useState } from "react";
import type { ViewerComponentProps } from "../../types";
import { readFileAsArrayBuffer } from "../../utils/fetchFile";
import { getMutedColor } from "../shared";

export function PdfViewer({ src, style, theme }: ViewerComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderPdf() {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const version = (pdfjs as { version?: string }).version ?? "latest";

      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/legacy/build/pdf.worker.min.mjs`;

      const data = await readFileAsArrayBuffer(src);
      const document = await pdfjs.getDocument({ data }).promise;
      const page = await document.getPage(1);
      const viewport = page.getViewport({ scale: 1.25 });

      if (!canvasRef.current || cancelled) {
        return;
      }

      const context = canvasRef.current.getContext("2d");
      if (!context) {
        throw new Error("Canvas context unavailable.");
      }

      canvasRef.current.width = viewport.width;
      canvasRef.current.height = viewport.height;

      await page.render({ canvasContext: context, viewport, canvas: canvasRef.current }).promise;

      if (!cancelled) {
        setPageCount(document.numPages);
        setError(null);
      }
    }

    renderPdf().catch((err: unknown) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : "Unable to load PDF.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (error) {
    return <div style={{ ...style, padding: 16, color: getMutedColor(theme) }}>{error}</div>;
  }

  return (
    <div style={{ ...style, padding: 16 }}>
      <div style={{ marginBottom: 12, color: getMutedColor(theme) }}>
        PDF preview showing page 1{pageCount > 0 ? ` of ${pageCount}` : ""}.
      </div>
      <canvas ref={canvasRef} style={{ maxWidth: "100%", height: "auto" }} />
    </div>
  );
}
