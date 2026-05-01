import type { CSSProperties } from "react";
import type { FileViewerTheme } from "../types";

export function getViewerStyle(theme: FileViewerTheme, height: string): CSSProperties {
  const isDark = theme === "dark";

  return {
    height,
    overflow: "auto",
    backgroundColor: isDark ? "#0f172a" : "#ffffff",
    color: isDark ? "#e2e8f0" : "#0f172a",
    border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
    borderRadius: 12,
    boxSizing: "border-box",
  };
}

export function getPanelStyle(theme: FileViewerTheme): CSSProperties {
  const isDark = theme === "dark";

  return {
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    backgroundColor: isDark ? "#0f172a" : "#ffffff",
    color: isDark ? "#e2e8f0" : "#0f172a",
  };
}

export function getMutedColor(theme: FileViewerTheme): string {
  return theme === "dark" ? "#94a3b8" : "#475569";
}
