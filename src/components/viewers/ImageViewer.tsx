import { useEffect, useState } from "react";
import type { ViewerComponentProps } from "../../types";
import { toObjectUrl } from "../../utils/fetchFile";
import { getMutedColor } from "../shared";

export function ImageViewer({ src, fileName, style, theme }: ViewerComponentProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    const url = toObjectUrl(src);
    setObjectUrl(url);
    setLoadFailed(false);

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [src]);

  return (
    <div
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <img
        src={typeof src === "string" ? src : objectUrl ?? ""}
        alt={fileName}
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
        onError={() => setLoadFailed(true)}
      />
      {loadFailed && (
        <div style={{ color: getMutedColor(theme), position: "absolute" }}>Unable to load image.</div>
      )}
    </div>
  );
}
