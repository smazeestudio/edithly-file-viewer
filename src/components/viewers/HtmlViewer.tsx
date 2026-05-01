import { useEffect, useState } from "react";
import type { ViewerComponentProps } from "../../types";
import { readFileAsText } from "../../utils/fetchFile";
import { ErrorState } from "../ErrorState";
import { SourceSurface } from "../SourceSurface";
import { escapeHtml } from "../sourceTheme";

export function HtmlViewer({ src, style, theme }: ViewerComponentProps) {
  const [content, setContent] = useState<string>("");
  const [highlighted, setHighlighted] = useState<string>("");
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
          setError(err instanceof Error ? err.message : "Unable to load HTML file.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    let cancelled = false;

    async function highlightMarkup() {
      const Prism = (await import("prismjs")).default;
      await import("prismjs/components/prism-markup");

      if (!cancelled) {
        const grammar = Prism.languages.markup ?? Prism.languages.html;
        setHighlighted(Prism.highlight(content, grammar, "markup"));
      }
    }

    if (content) {
      highlightMarkup().catch(() => {
        if (!cancelled) {
          setHighlighted(escapeHtml(content));
        }
      });
    } else {
      setHighlighted("");
    }

    return () => {
      cancelled = true;
    };
  }, [content]);

  if (error) {
    return <ErrorState error={error} style={style} theme={theme} />;
  }

  return (
    <SourceSurface
      style={style}
      theme={theme}
      mode={mode}
      previewLabel="Preview"
      sourceLabel="HTML"
      onChangeMode={setMode}
      source={content}
      highlightedSource={highlighted}
      preview={
        <iframe
          title="HTML preview"
          sandbox="allow-same-origin"
          srcDoc={content}
          style={{
            flex: 1,
            width: "100%",
            border: 0,
          }}
        />
      }
    />
  );
}
