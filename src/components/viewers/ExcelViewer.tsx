import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import type { ViewerComponentProps } from "../../types";
import { readFileAsArrayBuffer } from "../../utils/fetchFile";
import { ErrorState } from "../ErrorState";
import { getMutedColor } from "../shared";

type SheetGrid = {
  name: string;
  rows: string[][];
};

type WorkbookGrid = {
  sheets: SheetGrid[];
};

export function ExcelViewer({ src, style, theme }: ViewerComponentProps) {
  const [workbook, setWorkbook] = useState<WorkbookGrid | null>(null);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const isDark = theme === "dark";

  useEffect(() => {
    let cancelled = false;

    readFileAsArrayBuffer(src)
      .then((buffer) => {
        const parsedWorkbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = parsedWorkbook.SheetNames[0];

        if (!firstSheetName) {
          throw new Error("Workbook is empty.");
        }

        const sheets = parsedWorkbook.SheetNames.map((sheetName) => {
          const worksheet = parsedWorkbook.Sheets[sheetName];
          const grid = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(worksheet, {
            header: 1,
            raw: false,
            defval: "",
          });

          return {
            name: sheetName,
            rows: grid.map((row) => row.map((cell) => String(cell ?? ""))),
          };
        });

        if (!cancelled) {
          setWorkbook({ sheets });
          setSelectedSheetIndex(0);
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

  const sheet = workbook?.sheets[selectedSheetIndex] ?? null;

  const maxColumns = useMemo(() => {
    if (!sheet) return 0;
    return sheet.rows.reduce((max, row) => Math.max(max, row.length), 0);
  }, [sheet]);

  if (error) {
    return <ErrorState error={error} style={style} theme={theme} />;
  }

  if (!workbook || !sheet) {
    return <div style={{ ...style, padding: 16, color: getMutedColor(theme) }}>Loading sheet...</div>;
  }

  return (
    <div
      style={{
        ...style,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        backgroundColor: isDark ? "#0b1220" : "#f8fafc",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          borderBottom: `1px solid ${isDark ? "#223047" : "#d7e0ea"}`,
          backgroundColor: isDark ? "#0f172a" : "#ffffff",
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            backgroundColor: "#16a34a",
          }}
        />
        <div style={{ fontWeight: 600, color: isDark ? "#e2e8f0" : "#0f172a" }}>{sheet.name}</div>
        <div style={{ color: getMutedColor(theme), fontSize: 13 }}>
          {Math.max(sheet.rows.length - 1, 0)} rows x {maxColumns} columns
        </div>
        <div style={{ color: getMutedColor(theme), fontSize: 13 }}>
          {workbook.sheets.length} sheet{workbook.sheets.length === 1 ? "" : "s"}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            tableLayout: "fixed",
            minWidth: maxColumns * 140 + 56,
            backgroundColor: "#ffffff",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  position: "sticky",
                  top: 0,
                  left: 0,
                  zIndex: 4,
                  width: 56,
                  minWidth: 56,
                  backgroundColor: isDark ? "#182336" : "#f1f3f4",
                  borderRight: `1px solid ${isDark ? "#26354d" : "#dde3ea"}`,
                  borderBottom: `1px solid ${isDark ? "#26354d" : "#dde3ea"}`,
                }}
              />
              {Array.from({ length: maxColumns }, (_, columnIndex) => (
                <th
                  key={columnIndex}
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 3,
                    height: 36,
                    minWidth: 140,
                    padding: "0 10px",
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: 600,
                    color: isDark ? "#cbd5e1" : "#3c4043",
                    backgroundColor: isDark ? "#182336" : "#f1f3f4",
                    borderRight: `1px solid ${isDark ? "#26354d" : "#dde3ea"}`,
                    borderBottom: `1px solid ${isDark ? "#26354d" : "#dde3ea"}`,
                  }}
                >
                  {toSpreadsheetColumn(columnIndex)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <th
                  style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 2,
                    width: 56,
                    minWidth: 56,
                    height: 38,
                    padding: "0 8px",
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: 500,
                    color: isDark ? "#cbd5e1" : "#5f6368",
                    backgroundColor: isDark ? "#182336" : "#f1f3f4",
                    borderRight: `1px solid ${isDark ? "#26354d" : "#dde3ea"}`,
                    borderBottom: `1px solid ${isDark ? "#26354d" : "#e8eaed"}`,
                  }}
                >
                  {rowIndex + 1}
                </th>
                {Array.from({ length: maxColumns }, (_, columnIndex) => {
                  const value = row[columnIndex] ?? "";
                  const isHeaderRow = rowIndex === 0;

                  return (
                    <td
                      key={`${rowIndex}-${columnIndex}`}
                      style={{
                        height: 38,
                        padding: "8px 10px",
                        verticalAlign: "middle",
                        fontSize: 14,
                        fontWeight: isHeaderRow ? 600 : 400,
                        color: "#202124",
                        backgroundColor: "#ffffff",
                        borderRight: "1px solid #e8eaed",
                        borderBottom: "1px solid #e8eaed",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={value}
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          borderTop: `1px solid ${isDark ? "#223047" : "#d7e0ea"}`,
          backgroundColor: isDark ? "#0f172a" : "#ffffff",
          overflowX: "auto",
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            minWidth: 24,
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDark ? "#1e293b" : "#e8f0fe",
            color: isDark ? "#e2e8f0" : "#1a73e8",
            fontWeight: 700,
          }}
        >
          +
        </div>

        {workbook.sheets.map((workbookSheet, index) => {
          const active = index === selectedSheetIndex;

          return (
            <button
              key={workbookSheet.name}
              type="button"
              onClick={() => setSelectedSheetIndex(index)}
              style={{
                border: "none",
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12,
                borderBottomLeftRadius: 2,
                borderBottomRightRadius: 2,
                padding: "10px 16px 9px",
                backgroundColor: active
                  ? (isDark ? "#1e293b" : "#e8f0fe")
                  : "transparent",
                color: active
                  ? (isDark ? "#ffffff" : "#1a73e8")
                  : isDark
                    ? "#cbd5e1"
                    : "#5f6368",
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                borderBottom: `2px solid ${active ? "#1a73e8" : "transparent"}`,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {workbookSheet.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function toSpreadsheetColumn(index: number): string {
  let value = "";
  let current = index;

  do {
    value = String.fromCharCode(65 + (current % 26)) + value;
    current = Math.floor(current / 26) - 1;
  } while (current >= 0);

  return value;
}
