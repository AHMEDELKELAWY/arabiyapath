import { useState, memo } from "react";

interface LiteYouTubeProps {
  videoId: string;
  title: string;
  params?: string;
  thumbnailWebp?: string;
  thumbnailJpg?: string;
}

/**
 * Lightweight YouTube facade. Renders just a thumbnail + play button
 * until the user clicks — then swaps in the real iframe. Saves ~500KB
 * of JS on initial page load.
 */
function LiteYouTubeInner({ videoId, title, params = "", thumbnailWebp, thumbnailJpg }: LiteYouTubeProps) {
  const [activated, setActivated] = useState(false);
  const thumbWebp = thumbnailWebp ?? `https://i.ytimg.com/vi_webp/${videoId}/mqdefault.webp`;
  const thumbJpg = thumbnailJpg ?? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
  const src = `https://www.youtube.com/embed/${videoId}?autoplay=1&${params}`;

  if (activated) {
    return (
      <iframe
        src={src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setActivated(true)}
      aria-label={`Play video: ${title}`}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        border: 0,
        padding: 0,
        cursor: "pointer",
        background: "#000",
        overflow: "hidden",
      }}
    >
      <picture>
        <source srcSet={thumbWebp} type="image/webp" />
        <img
          src={thumbJpg}
          alt={title}
          loading="eager"
          decoding="async"
          {...({ fetchpriority: "high" } as any)}
          width={720}
          height={1280}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </picture>
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 68,
          height: 48,
          borderRadius: 12,
          background: "rgba(24,24,24,0.75)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg viewBox="0 0 24 24" width="26" height="26" fill="#fff" aria-hidden="true">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    </button>
  );
}

export const LiteYouTube = memo(LiteYouTubeInner);
