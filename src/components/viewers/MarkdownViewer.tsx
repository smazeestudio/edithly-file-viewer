import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { ViewerComponentProps } from "../../types";
import { readFileAsText } from "../../utils/fetchFile";
import { getMutedColor } from "../shared";

export function MarkdownViewer({ src, style, theme }: ViewerComponentProps) {
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
          setError(err instanceof Error ? err.message : "Unable to load Markdown file.");
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
    <div style={{ ...style, padding: 24, lineHeight: 1.7 }}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
