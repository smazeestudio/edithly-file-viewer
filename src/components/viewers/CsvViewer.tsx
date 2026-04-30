import { useEffect, useState } from "react";
import Papa from "papaparse";
import type { ViewerComponentProps } from "../../types";
import { readFileAsText } from "../../utils/fetchFile";
import { getMutedColor } from "../shared";

type CsvRow = Record<string, string>;

export function CsvViewer({ src, style, theme }: ViewerComponentProps) {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

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
          setRows(result.data);
          setHeaders(result.meta.fields ?? []);
          setError(null);
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
    return <div style={{ ...style, padding: 16, color: getMutedColor(theme) }}>{error}</div>;
  }

  return <TableViewer headers={headers} rows={rows} style={style} theme={theme} />;
}

function TableViewer({
  headers,
  rows,
  style,
  theme,
}: {
  headers: string[];
  rows: CsvRow[];
  style: ViewerComponentProps["style"];
  theme: ViewerComponentProps["theme"];
}) {
  const borderColor = theme === "dark" ? "#334155" : "#e2e8f0";
  const headerBg = theme === "dark" ? "#1e293b" : "#f8fafc";

  return (
    <div style={style}>
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
