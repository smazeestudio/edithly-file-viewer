import { useEffect, useState } from "react";
import type { ViewerComponentProps } from "../../types";
import { readFileAsText } from "../../utils/fetchFile";
import { ErrorState } from "../ErrorState";
import { getSourcePalette, splitSourceLines } from "../sourceTheme";

export function TextViewer({ src, style, theme }: ViewerComponentProps) {
  const [content, setContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const palette = getSourcePalette(theme);

  useEffect(() => {
    let cancelled = false;

    readFileAsText(src)
      .then((value) => {
        if (!cancelled) {
          setContent(value);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load text file.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (error) {
    return <ErrorState error={`Failed to load file: ${error}`} style={style} theme={theme} />;
  }

  return (
    <pre
      style={{
        ...style,
        margin: 0,
        padding: 24,
        overflow: "auto",
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
        fontSize: 14,
        lineHeight: 1.6,
        backgroundColor: palette.bg,
        color: palette.text,
      }}
    >
      <code style={{ display: "block", minWidth: "max-content" }}>
        {splitSourceLines(content).map((line, index) => (
          <span
            key={index}
            data-file-viewer-line-number={index + 1}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              columnGap: 16,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: "sticky",
                left: 0,
                minWidth: "2ch",
                paddingRight: 4,
                textAlign: "right",
                userSelect: "none",
                color: palette.lineNumber,
                backgroundColor: palette.bg,
              }}
            >
              {index + 1}
            </span>
            <span
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {line || " "}
            </span>
          </span>
        ))}
      </code>
    </pre>
  );
}
