import type { ViewerComponentProps } from "../../types";
import { getMutedColor } from "../shared";

function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be" || parsed.hostname === "www.youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      return id || null;
    }
    if (parsed.searchParams.has("v")) {
      return parsed.searchParams.get("v");
    }
    const match = parsed.pathname.match(/\/(embed|shorts|v)\/([^/?#]+)/);
    return match ? match[2] : null;
  } catch {
    return null;
  }
}

export function YouTubeViewer({ src, style, theme }: ViewerComponentProps) {
  const url = typeof src === "string" ? src : null;
  const videoId = url ? extractYouTubeId(url) : null;

  if (!videoId) {
    return (
      <div style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: getMutedColor(theme) }}>Could not extract YouTube video ID from URL.</span>
      </div>
    );
  }

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;

  return (
    <iframe
      src={embedUrl}
      title="YouTube video"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      style={{
        ...style,
        border: "none",
        width: "100%",
        display: "block",
      }}
    />
  );
}
