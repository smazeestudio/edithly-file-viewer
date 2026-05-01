import { useEffect, useState } from "react";
import Papa from "papaparse";
import type { ViewerComponentProps } from "../../types";
import { readFileAsText } from "../../utils/fetchFile";
import { ErrorState } from "../ErrorState";
import { SourceSurface } from "../SourceSurface";
import { escapeHtml } from "../sourceTheme";

type CsvRow = Record<string, string>;

export function CsvViewer({ src, style, theme }: ViewerComponentProps) {
  const [content, setContent] = useState<string>("");
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [highlighted, setHighlighted] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"preview" | "source">("preview");

  useEffect(() => {
    let cancelled = false;

    readFileAsText(src)
      .then((value) => {
        const result = Papa.parse<CsvRow>(value, {
          header: true,
          skipEmptyLines: true,
        });

        if (result.errors.length > 0) {
          throw new Error(result.errors[0]?.message ?? "Unable to parse CSV.");
        }

        if (!cancelled) {
          setContent(value);
          setRows(result.data);
          setHeaders(result.meta.fields ?? []);
          setHighlighted(highlightCsvSource(value));
          setError(null);
          setMode("preview");
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load CSV file.");
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
      sourceLabel="CSV"
      onChangeMode={setMode}
      source={content}
      highlightedSource={highlighted}
      preview={<TableViewer headers={headers} rows={rows} theme={theme} />}
    />
  );
}

function TableViewer({
  headers,
  rows,
  theme,
}: {
  headers: string[];
  rows: CsvRow[];
  theme: ViewerComponentProps["theme"];
}) {
  const borderColor = theme === "dark" ? "#334155" : "#e2e8f0";
  const headerBg = theme === "dark" ? "#1e293b" : "#f8fafc";

  return (
    <div style={{ flex: 1 }}>
      <div style={{ overflow: "auto", height: "100%" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  style={{
                    borderBottom: `1px solid ${borderColor}`,
                    padding: 12,
                    textAlign: "left",
                    backgroundColor: headerBg,
                    position: "sticky",
                    top: 0,
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {headers.map((header) => (
                  <td key={`${index}-${header}`} style={{ padding: 12, borderBottom: `1px solid ${borderColor}` }}>
                    {row[header]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function highlightCsvSource(value: string): string {
  const parsed = Papa.parse<string[]>(value, {
    skipEmptyLines: false,
  });

  if (parsed.errors.length > 0 || !parsed.data.length) {
    return escapeHtml(value);
  }

  return parsed.data
    .map((row, rowIndex) =>
      row
        .map((cell) => {
          const normalized = cell.trim();

          if (rowIndex === 0) {
            return `<span class="token attr-name">${escapeHtml(cell)}</span>`;
          }

          if (/^-?\d+(\.\d+)?$/.test(normalized)) {
            return `<span class="token number">${escapeHtml(cell)}</span>`;
          }

          if (/^(true|false)$/i.test(normalized)) {
            return `<span class="token boolean">${escapeHtml(cell)}</span>`;
          }

          if (normalized.length === 0) {
            return `<span class="token punctuation"></span>`;
          }

          return `<span class="token string">${escapeHtml(cell)}</span>`;
        })
        .join('<span class="token punctuation">,</span>'),
    )
    .join("\n");
}
