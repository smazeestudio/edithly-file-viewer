import type { ViewerComponentProps } from "../../types";
import { getMutedColor } from "../shared";

export function UrlViewer({ src, style, theme }: ViewerComponentProps) {
  const url = typeof src === "string" ? src : null;

  if (!url) {
    return (
      <div style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: getMutedColor(theme) }}>Invalid URL source.</span>
      </div>
    );
  }

  return (
    <iframe
      src={url}
      title={url}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      style={{
        ...style,
        border: "none",
        width: "100%",
        display: "block",
      }}
    />
  );
}
