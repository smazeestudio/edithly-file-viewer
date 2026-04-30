import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import type { ViewerComponentProps } from "../../types";
import { readFileAsArrayBuffer } from "../../utils/fetchFile";
import { getMutedColor } from "../shared";

type SheetData = {
  headers: string[];
  rows: Record<string, unknown>[];
};

export function ExcelViewer({ src, style, theme }: ViewerComponentProps) {
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    readFileAsArrayBuffer(src)
      .then((buffer) => {
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
          throw new Error("Workbook is empty.");
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          defval: "",
        });
        const headers = jsonRows.length > 0 ? Object.keys(jsonRows[0]) : [];

        if (!cancelled) {
          setSheet({ headers, rows: jsonRows });
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load Excel file.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (error) {
    return <div style={{ ...style, padding: 16, color: getMutedColor(theme) }}>{error}</div>;
  }

  if (!sheet) {
    return <div style={{ ...style, padding: 16, color: getMutedColor(theme) }}>Loading sheet...</div>;
  }

  const borderColor = theme === "dark" ? "#334155" : "#e2e8f0";
  const headerBg = theme === "dark" ? "#1e293b" : "#f8fafc";

  return (
    <div style={style}>
      <div style={{ overflow: "auto", height: "100%" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {sheet.headers.map((header) => (
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
            {sheet.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {sheet.headers.map((header) => (
                  <td key={`${rowIndex}-${header}`} style={{ padding: 12, borderBottom: `1px solid ${borderColor}` }}>
                    {String(row[header] ?? "")}
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
