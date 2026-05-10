import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { ViewerComponentProps } from "../../types";
import { readFileAsText } from "../../utils/fetchFile";
import { ErrorState } from "../ErrorState";
import { SourceSurface } from "../SourceSurface";
import {
  escapeHtml,
  getSourcePalette,
  getSourceThemeCss,
  splitSourceLines,
} from "../sourceTheme";

export function MarkdownViewer({ src, style, theme }: ViewerComponentProps) {
  const [content, setContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"preview" | "source">("preview");
  const palette = getSourcePalette(theme);

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
          <style>{getMarkdownPreviewCss(theme)}</style>
          <ReactMarkdown
            components={{
              code(props) {
                return <MarkdownCode {...props} theme={theme} />;
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      }
    />
  );
}

function MarkdownCode({
  children,
  className,
  node: _node,
  theme,
  ...props
}: React.ComponentPropsWithoutRef<"code"> & {
  node?: unknown;
  theme: ViewerComponentProps["theme"];
}) {
  const palette = getSourcePalette(theme);
  const [highlighted, setHighlighted] = useState<string>("");
  const language = useMemo(() => resolveMarkdownLanguage(className), [className]);
  const value = String(children ?? "").replace(/\n$/, "");
  const isInline = !className?.includes("language-");

  useEffect(() => {
    if (isInline || !value) {
      setHighlighted("");
      return;
    }

    let cancelled = false;

    async function highlightCode() {
      const Prism = (await import("prismjs")).default;
      await loadPrismLanguage(language);

      if (!cancelled) {
        const grammar = Prism.languages[language] ?? Prism.languages.clike;
        setHighlighted(Prism.highlight(value, grammar, language));
      }
    }

    highlightCode().catch(() => {
      if (!cancelled) {
        setHighlighted(escapeHtml(value));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isInline, language, value]);

  if (isInline) {
    return (
      <code
        {...props}
        style={{
          padding: "0.15em 0.4em",
          borderRadius: 6,
          backgroundColor: theme === "dark" ? "#1f2937" : "#f3f4f6",
          color: palette.text,
          fontSize: "0.95em",
          fontFamily:
            '"Cascadia Code", "Fira Code", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
        }}
      >
        {children}
      </code>
    );
  }

  return (
    <div className="fv-markdown-code-block">
      <style>{getSourceThemeCss(palette, "fv-markdown-code")}</style>
      <pre
        style={{
          margin: 0,
          padding: "18px 20px",
          overflow: "auto",
          backgroundColor: palette.bg,
          color: palette.text,
          fontSize: 14,
          lineHeight: 1.65,
          fontFamily:
            '"Cascadia Code", "Fira Code", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
        }}
      >
        <code className={`fv-markdown-code language-${language}`}>
          {splitSourceLines(highlighted || escapeHtml(value)).map((line, index) => (
            <span className="fv-code-line" key={index}>
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

function resolveMarkdownLanguage(className?: string): string {
  const language = className?.match(/language-([\w-]+)/)?.[1]?.toLowerCase() ?? "text";

  const aliases: Record<string, string> = {
    js: "javascript",
    jsx: "jsx",
    ts: "typescript",
    tsx: "tsx",
    py: "python",
    rb: "ruby",
    yml: "yaml",
    html: "markup",
    xml: "markup",
    sh: "bash",
    shell: "bash",
    text: "clike",
    plaintext: "clike",
  };

  return aliases[language] ?? language;
}

async function loadPrismLanguage(language: string): Promise<void> {
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
    json: () => import("prismjs/components/prism-json"),
    bash: () => import("prismjs/components/prism-bash"),
  };

  await loaders[language]?.();
}

function getMarkdownPreviewCss(theme: ViewerComponentProps["theme"]): string {
  return `
    .fv-markdown-code-block {
      margin: 1.2em 0;
      border: 1px solid ${theme === "dark" ? "#334155" : "#dbe4f0"};
      border-radius: 12px;
      overflow: hidden;
      background: ${theme === "dark" ? "#111827" : "#ffffff"};
      box-shadow: ${theme === "dark"
        ? "0 12px 30px rgba(2, 6, 23, 0.35)"
        : "0 8px 18px rgba(15, 23, 42, 0.06)"};
    }
  `;
}
