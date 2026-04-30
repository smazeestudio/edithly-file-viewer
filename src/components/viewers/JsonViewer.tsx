import { useEffect, useState } from "react";
import type { ViewerComponentProps } from "../../types";
import { readFileAsText } from "../../utils/fetchFile";
import { getMutedColor } from "../shared";

export function JsonViewer({ src, style, theme }: ViewerComponentProps) {
  const [formatted, setFormatted] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    readFileAsText(src)
      .then((value) => {
        const parsed = JSON.parse(value);
        if (!cancelled) {
          setFormatted(JSON.stringify(parsed, null, 2));
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load JSON file.");
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
      {formatted}
    </pre>
  );
}
