import React from "react";
import { BookOpen, Download, Bookmark, HardDrive } from "lucide-react";
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

export function ComicCard({
  comic,
  onRead,
  downloadUrl,
  isBookmarked,
  onToggleBookmark
}) {
  return (
    <article className="cv-comic-card">
      {/* Cover clickable area */}
      <div
        className="cv-card-cover-wrap"
        onClick={() => onRead(comic)}
        role="button"
        tabIndex={0}
        aria-label={`Read ${comic.title}`}
      >
        <ComicCover comic={comic} />
      </div>

      {/* Card Info */}
      <div className="cv-card-info">
        {/* Category & Format meta row */}
        <div className="cv-card-meta-row">
          <span className="cv-card-category">{comic.category}</span>
          <span className="cv-card-format">{comic.format}</span>
        </div>

        {/* Title */}
        <h4
          className="cv-card-title"
          title={comic.title}
          onClick={() => onRead(comic)}
        >
          {comic.title}
        </h4>

        {/* Series / Folder */}
        <p className="cv-card-series" title={comic.series || comic.category}>
          {comic.series || comic.category}
        </p>

        {/* Footer actions */}
        <div className="cv-card-footer">
          <span className="cv-card-size">
            <HardDrive size={11} className="inline mr-1" />
            {formatBytes(comic.size)}
          </span>

          <div className="cv-card-action-group">
            <button
              type="button"
              className={`cv-card-btn-action ${isBookmarked ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleBookmark(comic.id);
              }}
              title={isBookmarked ? "Remove Bookmark" : "Save Bookmark"}
              aria-label="Bookmark comic"
            >
              <Bookmark size={15} fill={isBookmarked ? "currentColor" : "none"} />
            </button>

            <a
              href={`${downloadUrl}?download=1`}
              className="cv-card-btn-action"
              title={`Download ${comic.title}`}
              aria-label={`Download ${comic.title}`}
              download
              onClick={(e) => e.stopPropagation()}
            >
              <Download size={15} />
            </a>

            <button
              type="button"
              className="cv-card-btn-read"
              onClick={() => onRead(comic)}
              title="Open reader"
            >
              <span>Read</span>
              <BookOpen size={13} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
