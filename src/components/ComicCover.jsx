import React, { useState } from "react";
import { BookOpen } from "lucide-react";

export function ComicCover({ comic, className = "", showOverlay = true }) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Extract issue number if present in title (e.g. "Deadpool 001", "Spider-Man #04")
  const issueMatch = comic.title.match(/(?:#|issue\s*|no\.?\s*|0*)(\d{1,3})\b/i);
  const issueNumber = issueMatch ? `#${issueMatch[1]}` : null;

  // Derive palette theme from category / title
  const catLower = (comic.category || "").toLowerCase();
  const titleLower = (comic.title || "").toLowerCase();

  let themeClass = "theme-default";
  if (catLower.includes("deadpool") || titleLower.includes("deadpool")) {
    themeClass = "theme-deadpool";
  } else if (catLower.includes("panther") || titleLower.includes("panther")) {
    themeClass = "theme-panther";
  } else if (catLower.includes("spider") || titleLower.includes("spider")) {
    themeClass = "theme-spiderman";
  } else if (catLower.includes("dc") || catLower.includes("batman")) {
    themeClass = "theme-dc";
  } else if (catLower.includes("manga")) {
    themeClass = "theme-manga";
  }

  const hasValidThumbnail = Boolean(comic.thumbnailUrl) && !imageError;

  return (
    <div className={`cv-cover-container ${themeClass} ${className}`}>
      {/* Background Graphic Canvas */}
      <div className="cv-cover-artwork">
        {hasValidThumbnail && (
          <img
            src={comic.thumbnailUrl}
            alt={comic.title}
            className={`cv-cover-img ${imageLoaded ? "loaded" : "loading"}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            loading="lazy"
          />
        )}

        {/* Fallback procedural artwork when image isn't available or still loading */}
        {(!hasValidThumbnail || !imageLoaded) && (
          <div className="cv-cover-procedural">
            {/* Geometric tech grid lines */}
            <div className="cv-cover-grid" aria-hidden="true" />
            <div className="cv-cover-glow" aria-hidden="true" />

            {/* Top kicker */}
            <div className="cv-cover-top">
              <span className="cv-cover-category-badge">{comic.category}</span>
              {issueNumber && <span className="cv-cover-issue-badge">{issueNumber}</span>}
            </div>

            {/* Center title & icon */}
            <div className="cv-cover-center">
              <div className="cv-cover-emblem">
                <BookOpen size={28} />
              </div>
              <h4 className="cv-cover-title">{comic.title}</h4>
              <p className="cv-cover-series">{comic.series || comic.category}</p>
            </div>

            {/* Bottom bar */}
            <div className="cv-cover-bottom">
              <span className="cv-cover-format">{comic.format}</span>
              <span className="cv-cover-stamp">COMICVERSE</span>
            </div>
          </div>
        )}
      </div>

      {/* Hover action overlay */}
      {showOverlay && (
        <div className="cv-cover-overlay">
          <span className="cv-cover-overlay-btn">
            <span>READ NOW</span>
            <BookOpen size={15} />
          </span>
        </div>
      )}
    </div>
  );
}
