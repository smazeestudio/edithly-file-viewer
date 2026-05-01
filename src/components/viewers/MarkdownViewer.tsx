import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { ViewerComponentProps } from "../../types";
import { readFileAsText } from "../../utils/fetchFile";
import { ErrorState } from "../ErrorState";
import { SourceSurface } from "../SourceSurface";

export function MarkdownViewer({ src, style, theme }: ViewerComponentProps) {
  const [content, setContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"preview" | "source">("preview");

  useEffect(() => {
    let cancelled = false;

    readFileAsText(src)
      .then((value) => {
        if (!cancelled) {
          setContent(value);
          setError(null);
          setMode("preview");
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
    return <ErrorState error={error} style={style} theme={theme} />;
  }

  return (
    <SourceSurface
      style={style}
      theme={theme}
      mode={mode}
      previewLabel="Preview"
      sourceLabel="Markdown"
      onChangeMode={setMode}
      source={content}
      preview={
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: 24,
            lineHeight: 1.7,
          }}
        >
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      }
    />
  );
}
