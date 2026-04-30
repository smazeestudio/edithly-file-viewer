import { useEffect, useState } from "react";
import type { ViewerComponentProps } from "../../types";
import { readFileAsText } from "../../utils/fetchFile";
import { getMutedColor } from "../shared";

export function TextViewer({ src, style, theme }: ViewerComponentProps) {
  const [content, setContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

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
    return <ErrorState error={error} style={style} theme={theme} />;
  }

  return (
    <pre
      style={{
        ...style,
        margin: 0,
        padding: 16,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
        fontSize: 14,
        lineHeight: 1.6,
      }}
    >
      {content}
    </pre>
  );
}

function ErrorState({
  error,
  style,
  theme,
}: {
  error: string;
  style: ViewerComponentProps["style"];
  theme: ViewerComponentProps["theme"];
}) {
  return (
    <div style={{ ...style, padding: 16, color: getMutedColor(theme) }}>
      Failed to load file: {error}
    </div>
  );
}
