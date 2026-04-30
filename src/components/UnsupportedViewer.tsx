import type { ViewerComponentProps } from "../types";
import { getMutedColor } from "./shared";

export function UnsupportedViewer({ fileName, style, theme }: ViewerComponentProps) {
  return (
    <div
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Unsupported file type</div>
        <div style={{ marginTop: 8, color: getMutedColor(theme) }}>
          No viewer is available for <code>{fileName}</code>.
        </div>
      </div>
    </div>
  );
}
