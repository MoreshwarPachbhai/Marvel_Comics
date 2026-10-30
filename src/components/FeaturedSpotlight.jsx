import React from "react";
import { BookOpen, ArrowRight, Download, Bookmark, Sparkles, Layers, HardDrive } from "lucide-react";
import { ComicCover } from "./ComicCover";

function formatBytes(bytes) {
  if (!bytes) return "Size unavailable";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function FeaturedSpotlight({
  comic,
  activeCategory = "All",
  onRead,
  onDownload,
  isBookmarked,
  onToggleBookmark
}) {
  // Graceful empty state when the selected category has no comics
  if (!comic) {
    return (
      <article className="cv-bento-featured" aria-label="Featured Comic Spotlight">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "360px",
            textAlign: "center",
            padding: "48px 24px",
            width: "100%",
            background: "radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.03) 0%, transparent 70%)"
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
              color: "var(--cv-primary)"
            }}
          >
            <BookOpen size={26} />
          </div>
          <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#fff", marginBottom: "8px" }}>
            No Comics in {activeCategory}
          </h3>
          <p style={{ color: "var(--cv-text-muted)", fontSize: "14px", maxWidth: "360px", lineHeight: "1.6" }}>
            There are currently no comic files found in the "{activeCategory}" category on your Google Drive.
          </p>
        </div>
      </article>
    );
  }

  const spotlightKicker = activeCategory && activeCategory !== "All"
    ? activeCategory.toUpperCase()
    : "SPOTLIGHT ARCHIVE";

  const spotlightDescription = comic.series && comic.series !== comic.category
    ? `Featured issue from the ${comic.series} collection in your Google Drive library. High-definition digital edition with instant full-resolution reading.`
    : `High-definition digital comic from your connected Google Drive archive. Enjoy immersive browser viewing with page navigation and zoom controls.`;

  return (
    <article className="cv-bento-featured" aria-label="Featured Comic Spotlight">
      {/* Visual Canvas Area */}
      <div className="cv-featured-canvas" onClick={() => onRead(comic)}>
        <ComicCover comic={comic} className="cv-featured-cover-wrapper" showOverlay={false} />

        {/* Cinematic gradient vignette overlays */}
        <div className="cv-featured-gradient-bottom" />
        <div className="cv-featured-gradient-side" />

        {/* Top Floating Editorial Metadata Badges */}
        <div className="cv-featured-badges-top">
          <div className="cv-badge-group">
            <span className="cv-pill-featured">
              <Sparkles size={13} />
              <span>FEATURED COMIC</span>
            </span>
            <span className="cv-pill-category">
              <Layers size={13} />
              <span>{comic.category}</span>
            </span>
          </div>

          <span className="cv-pill-format">
            {comic.format} EDITION
          </span>
        </div>

        {/* Bottom floating manga-style badge */}
        <div className="cv-featured-floating-tag">
          <div className="cv-floating-tag-icon">
            <BookOpen size={16} />
          </div>
          <div>
            <p className="cv-floating-tag-eyebrow">READY TO READ</p>
            <p className="cv-floating-tag-title">Full Resolution Stream</p>
          </div>
        </div>
      </div>

      {/* Content & Action Strip */}
      <div className="cv-featured-body">
        <div className="cv-featured-meta-header">
          <span className="cv-featured-kicker">{spotlightKicker}</span>
          <span className="cv-featured-dot">•</span>
          <span className="cv-featured-subkicker">{comic.series || comic.category}</span>
        </div>

        <h3 className="cv-featured-title" onClick={() => onRead(comic)}>
          {comic.title}
        </h3>

        <p className="cv-featured-desc">
          {spotlightDescription}
        </p>

        {/* Metadata pills and actions */}
        <div className="cv-featured-footer">
          <div className="cv-featured-tags">
            <span className="cv-tag-pill">{comic.format}</span>
            <span className="cv-tag-pill">{comic.category}</span>
            {comic.size && (
              <span className="cv-tag-pill">
                <HardDrive size={11} className="inline mr-1" />
                {formatBytes(comic.size)}
              </span>
            )}
          </div>

          <div className="cv-featured-actions">
            <button
              type="button"
              className={`cv-btn-icon ${isBookmarked ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleBookmark(comic.id);
              }}
              title={isBookmarked ? "Remove Bookmark" : "Save Bookmark"}
              aria-label="Bookmark comic"
            >
              <Bookmark size={18} fill={isBookmarked ? "currentColor" : "none"} />
            </button>

            <a
              href={onDownload(comic.id)}
              className="cv-btn-icon"
              title={`Download original ${comic.title}`}
              aria-label="Download comic"
              download
              onClick={(e) => e.stopPropagation()}
            >
              <Download size={18} />
            </a>

            <button
              type="button"
              className="cv-btn-primary"
              onClick={() => onRead(comic)}
            >
              <span>Read Now</span>
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
