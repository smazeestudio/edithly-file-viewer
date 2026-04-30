import { useEffect, useState } from "react";
import type { ViewerComponentProps } from "../../types";
import { readFileAsText } from "../../utils/fetchFile";
import { getMutedColor } from "../shared";

export function HtmlViewer({ src, style, theme }: ViewerComponentProps) {
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
          setError(err instanceof Error ? err.message : "Unable to load HTML file.");
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
    <iframe
      title="HTML preview"
      sandbox="allow-same-origin"
      srcDoc={content}
      style={{
        ...style,
        width: "100%",
      }}
    />
  );
}
