import { useEffect, useMemo, useState } from "react";
import type { ViewerComponentProps } from "../../types";
import { readFileAsText } from "../../utils/fetchFile";
import { ErrorState } from "../ErrorState";
import { escapeHtml, getSourcePalette, getSourceThemeCss, splitSourceLines } from "../sourceTheme";

function getLanguage(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    js: "javascript",
    jsx: "jsx",
    ts: "typescript",
    tsx: "tsx",
    py: "python",
    java: "java",
    cpp: "cpp",
    c: "c",
    go: "go",
    rs: "rust",
    php: "php",
    rb: "ruby",
    css: "css",
    scss: "scss",
    sql: "sql",
    yaml: "yaml",
    yml: "yaml",
    xml: "markup",
  };

  return map[ext] ?? "clike";
}

export function CodeViewer({ src, fileName, style, theme }: ViewerComponentProps) {
  const [content, setContent] = useState<string>("");
  const [highlighted, setHighlighted] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const language = useMemo(() => getLanguage(fileName), [fileName]);
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
          setError(err instanceof Error ? err.message : "Unable to load code file.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    let cancelled = false;

    async function highlightCode() {
      const Prism = (await import("prismjs")).default;

      const loaders: Record<string, () => Promise<unknown>> = {
        javascript: () => import("prismjs/components/prism-javascript"),
        jsx: () => import("prismjs/components/prism-jsx"),
        typescript: () => import("prismjs/components/prism-typescript"),
        tsx: () => import("prismjs/components/prism-tsx"),
        python: () => import("prismjs/components/prism-python"),
        java: () => import("prismjs/components/prism-java"),
        cpp: () => import("prismjs/components/prism-cpp"),
        c: () => import("prismjs/components/prism-c"),
        go: () => import("prismjs/components/prism-go"),
        rust: () => import("prismjs/components/prism-rust"),
        php: () => import("prismjs/components/prism-php"),
        ruby: () => import("prismjs/components/prism-ruby"),
        css: () => import("prismjs/components/prism-css"),
        scss: () => import("prismjs/components/prism-scss"),
        sql: () => import("prismjs/components/prism-sql"),
        yaml: () => import("prismjs/components/prism-yaml"),
        markup: () => import("prismjs/components/prism-markup"),
      };

      await loaders[language]?.();

      if (!cancelled) {
        const grammar = Prism.languages[language] ?? Prism.languages.clike;
        setHighlighted(Prism.highlight(content, grammar, language));
      }
    }

    if (content) {
      highlightCode().catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Syntax highlighting failed.");
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [content, language]);

  if (error) {
    return <ErrorState error={error} style={style} theme={theme} />;
  }

  return (
    <div
      style={{
        ...style,
        overflow: "auto",
        backgroundColor: palette.bg,
      }}
    >
      <style>{getSourceThemeCss(palette, "fv-code-viewer")}</style>
      <pre
        style={{
          margin: 0,
          padding: 20,
          minHeight: "100%",
          fontSize: 14,
          lineHeight: 1.65,
          backgroundColor: palette.bg,
          color: palette.text,
          fontFamily:
            '"Cascadia Code", "Fira Code", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
        }}
      >
        <code className={`fv-code-viewer language-${language}`}>
          {splitSourceLines(highlighted || escapeHtml(content)).map((line, index) => (
            <span
              className="fv-code-line"
              key={index}
              data-file-viewer-line-number={index + 1}
            >
              <span className="fv-code-line-number" aria-hidden="true">
                {index + 1}
              </span>
              <span
                className="fv-code-line-content"
                dangerouslySetInnerHTML={{ __html: line || "&nbsp;" }}
              />
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
