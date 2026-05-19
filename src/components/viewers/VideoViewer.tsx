import { useEffect, useState } from "react";
import type { ViewerComponentProps } from "../../types";
import { getMutedColor } from "../shared";

export function VideoViewer({ src, style, theme }: ViewerComponentProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof src === "string") {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(src);
    setObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [src]);

  const videoSrc = typeof src === "string" ? src : (objectUrl ?? "");

  return (
    <div
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme === "dark" ? "#000000" : "#000000",
        padding: 0,
      }}
    >
      {videoSrc ? (
        <video
          key={videoSrc}
          controls
          style={{ maxWidth: "100%", maxHeight: "100%", display: "block" }}
        >
          <source src={videoSrc} />
          <span style={{ color: getMutedColor(theme) }}>
            Your browser does not support this video format.
          </span>
        </video>
      ) : (
        <div style={{ color: getMutedColor(theme) }}>Loading video...</div>
      )}
    </div>
  );
}
