import type { CSSProperties } from "react";
import type { FileViewerTheme } from "../types";

export function ErrorState({
  error,
  style,
  theme,
}: {
  error: string;
  style: CSSProperties;
  theme: FileViewerTheme;
}) {
  const isDark = theme === "dark";

  return (
    <div
      role="alert"
      style={{
        ...style,
        padding: 16,
        color: isDark ? "#fca5a5" : "#b91c1c",
        backgroundColor: isDark ? "#2b1215" : "#fef2f2",
        border: `1px solid ${isDark ? "#7f1d1d" : "#fecaca"}`,
      }}
    >
      {error}
    </div>
  );
}
