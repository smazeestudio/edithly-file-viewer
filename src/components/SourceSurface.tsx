import type { ReactNode } from "react";
import type { FileViewerTheme } from "../types";
import { getSourcePalette, getSourceThemeCss, splitSourceLines } from "./sourceTheme";

export function SourceSurface({
  style,
  theme,
  mode,
  previewLabel,
  sourceLabel,
  onChangeMode,
  preview,
  source,
  highlightedSource,
}: {
  style: React.CSSProperties;
  theme: FileViewerTheme;
  mode: "preview" | "source";
  previewLabel: string;
  sourceLabel: string;
  onChangeMode: (mode: "preview" | "source") => void;
  preview: ReactNode;
  source: string;
  highlightedSource?: string;
}) {
  const isDark = theme === "dark";

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
          justifyContent: "flex-end",
          gap: 8,
          padding: "12px 16px",
          borderBottom: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
          backgroundColor: isDark ? "#0f172a" : "#ffffff",
        }}
      >
        <TabButton
          active={mode === "preview"}
          label={previewLabel}
          theme={theme}
          onClick={() => onChangeMode("preview")}
        />
        <TabButton
          active={mode === "source"}
          label={sourceLabel}
          theme={theme}
          onClick={() => onChangeMode("source")}
        />
      </div>

      {mode === "preview" ? preview : <SourceTextView source={source} highlightedSource={highlightedSource} theme={theme} />}
    </div>
  );
}

function SourceTextView({
  source,
  highlightedSource,
  theme,
}: {
  source: string;
  highlightedSource?: string;
  theme: FileViewerTheme;
}) {
  const palette = getSourcePalette(theme);
  const lines = splitSourceLines(highlightedSource ?? source);
  const className = highlightedSource ? "fv-source-viewer highlighted" : "fv-source-viewer";

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        backgroundColor: palette.bg,
      }}
    >
      {highlightedSource ? <style>{getSourceThemeCss(palette, "fv-source-viewer")}</style> : null}
      <pre
        style={{
          margin: 0,
          minHeight: "100%",
          padding: 24,
          fontFamily:
            '"Cascadia Code", "Fira Code", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
          fontSize: 14,
          lineHeight: 1.7,
          color: palette.text,
          backgroundColor: palette.bg,
        }}
      >
        <code
          className={className}
          style={highlightedSource ? undefined : { display: "block", minWidth: "max-content" }}
        >
          {lines.map((line, index) => (
            <span
              key={index}
              className={highlightedSource ? "fv-code-line" : undefined}
              data-file-viewer-line-number={index + 1}
              style={
                highlightedSource
                  ? undefined
                  : {
                      display: "grid",
                      gridTemplateColumns: "auto 1fr",
                      columnGap: 16,
                    }
              }
            >
              <span
                aria-hidden="true"
                className={highlightedSource ? "fv-code-line-number" : undefined}
                style={
                  highlightedSource
                    ? undefined
                    : {
                        position: "sticky",
                        left: 0,
                        minWidth: "2ch",
                        paddingRight: 4,
                        textAlign: "right",
                        userSelect: "none",
                        color: palette.lineNumber,
                        backgroundColor: palette.bg,
                      }
                }
              >
                {index + 1}
              </span>
              <span
                className={highlightedSource ? "fv-code-line-content" : undefined}
                style={highlightedSource ? undefined : { whiteSpace: "pre" }}
                dangerouslySetInnerHTML={
                  highlightedSource ? { __html: line || "&nbsp;" } : undefined
                }
              >
                {highlightedSource ? undefined : line || " "}
              </span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

function TabButton({
  active,
  label,
  onClick,
  theme,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  theme: FileViewerTheme;
}) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${active ? (isDark ? "#64748b" : "#94a3b8") : isDark ? "#334155" : "#cbd5e1"}`,
        backgroundColor: active ? (isDark ? "#1e293b" : "#e2e8f0") : "transparent",
        color: isDark ? "#e2e8f0" : "#0f172a",
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
