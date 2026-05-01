import { useEffect, useState } from "react";
import type { ViewerComponentProps } from "../../types";
import { readFileAsArrayBuffer } from "../../utils/fetchFile";
import { ErrorState } from "../ErrorState";
import { getMutedColor } from "../shared";

export function DocxViewer({ src, style, theme }: ViewerComponentProps) {
  const [html, setHtml] = useState<string>("");
  const [messages, setMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isDark = theme === "dark";

  useEffect(() => {
    let cancelled = false;

    async function renderDocx() {
      const mammoth = await import("mammoth");
      const buffer = await readFileAsArrayBuffer(src);
      const result = await mammoth.convertToHtml({ arrayBuffer: buffer });

      if (!cancelled) {
        setHtml(annotateDocxHtml(result.value));
        setMessages(result.messages.map((message) => message.message));
        setError(null);
      }
    }

    renderDocx().catch((err: unknown) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : "Unable to load DOCX file.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (error) {
    return <ErrorState error={error} style={style} theme={theme} />;
  }

  return (
    <div
      style={{
        ...style,
        overflow: "auto",
        padding: 24,
        backgroundColor: isDark ? "#0b1220" : "#f3f4f6",
      }}
    >
      {messages.length > 0 ? (
        <div
          style={{
            maxWidth: 860,
            margin: "0 auto 16px",
            padding: 12,
            borderRadius: 8,
            border: `1px solid ${isDark ? "#334155" : "#dbe4f0"}`,
            backgroundColor: isDark ? "#111827" : "#f8fafc",
            color: getMutedColor(theme),
            fontSize: 13,
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          {messages.map((message, index) => (
            <div key={`${message}-${index}`}>{message}</div>
          ))}
        </div>
      ) : null}

      <div
        style={{
          maxWidth: 860,
          minHeight: "calc(100% - 8px)",
          margin: "0 auto",
          padding: "72px 88px 88px",
          backgroundColor: "#ffffff",
          color: "#202124",
          borderRadius: 4,
          boxShadow: isDark
            ? "0 24px 60px rgba(2, 6, 23, 0.55)"
            : "0 8px 24px rgba(15, 23, 42, 0.12)",
          fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
          fontSize: 11,
          lineHeight: 1.8,
          boxSizing: "border-box",
        }}
      >
        <style>{getDocxDocumentCss()}</style>
        <div className="fv-docx-document" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}

function annotateDocxHtml(html: string): string {
  if (typeof DOMParser === "undefined") {
    return html;
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");
  const lineSelectors = [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "li",
    "blockquote",
    "table",
  ].join(",");

  let lineNumber = 1;
  document.body.querySelectorAll<HTMLElement>(lineSelectors).forEach((element) => {
    element.classList.add("fv-docx-line");
    element.setAttribute("data-file-viewer-line-number", String(lineNumber));
    lineNumber += 1;
  });

  return document.body.innerHTML;
}

function getDocxDocumentCss(): string {
  return `
    .fv-docx-document {
      color: #202124;
      word-break: break-word;
    }

    .fv-docx-document .fv-docx-line {
      position: relative;
    }

    .fv-docx-document .fv-docx-line::before {
      content: attr(data-file-viewer-line-number);
      position: absolute;
      top: 0;
      right: 100%;
      width: 40px;
      margin-right: 24px;
      color: #9ca3af;
      text-align: right;
      font-size: 12px;
      line-height: 1.6;
      user-select: none;
      font-family:
        "Cascadia Code", "Fira Code", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    }

    .fv-docx-document h1,
    .fv-docx-document h2,
    .fv-docx-document h3,
    .fv-docx-document h4,
    .fv-docx-document h5,
    .fv-docx-document h6 {
      margin: 0 0 0.7em;
      line-height: 1.3;
      font-weight: 500;
      color: #202124;
    }

    .fv-docx-document h1 {
      font-size: 26px;
    }

    .fv-docx-document h2 {
      font-size: 20px;
    }

    .fv-docx-document h3 {
      font-size: 17px;
    }

    .fv-docx-document p {
      margin: 0 0 1em;
      min-height: 1.2em;
    }

    .fv-docx-document ul,
    .fv-docx-document ol {
      margin: 0 0 1em 1.6em;
      padding: 0;
    }

    .fv-docx-document li {
      margin: 0.2em 0;
    }

    .fv-docx-document table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
    }

    .fv-docx-document td,
    .fv-docx-document th {
      border: 1px solid #dadce0;
      padding: 8px 10px;
      vertical-align: top;
    }

    .fv-docx-document blockquote {
      margin: 1em 0;
      padding-left: 16px;
      border-left: 3px solid #dadce0;
      color: #5f6368;
    }

    .fv-docx-document img {
      max-width: 100%;
      height: auto;
    }
  `;
}
