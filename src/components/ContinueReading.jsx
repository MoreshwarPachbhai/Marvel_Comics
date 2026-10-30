import React from "react";
import { BookOpen, Play, BookmarkCheck, History, ArrowRight, Trash2 } from "lucide-react";
import { ComicCover } from "./ComicCover";

export function ContinueReading({
  history,
  onClearHistory,
  onResume,
  fallbackComic
}) {
  const hasHistory = Boolean(history && history.comicId);

  // Time ago calculation
  const timeAgo = history?.timestamp
    ? (() => {
        const diffMin = Math.round((Date.now() - history.timestamp) / 60000);
        if (diffMin < 1) return "Just now";
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffHrs = Math.round(diffMin / 60);
        if (diffHrs < 24) return `${diffHrs}h ago`;
        const diffDays = Math.round(diffHrs / 24);
        return `${diffDays}d ago`;
      })()
    : "Recently";

  const totalPages = history?.totalPages || 1;
  const currentPage = (history?.page || 0) + 1;
  const progressPercent = Math.min(100, Math.max(0, Math.round((currentPage / totalPages) * 100)));

  return (
    <div className="cv-bento-rail">
      {/* Primary In-Progress Deck */}
      <div className="cv-reading-card">
        {/* Card Header */}
        <div className="cv-reading-head">
          <div className="cv-reading-indicator">
            <span className={`cv-pulse-dot ${hasHistory ? "active" : ""}`} />
            <span className="cv-reading-eyebrow">
              {hasHistory ? "CONTINUE READING" : "START READING"}
            </span>
          </div>
          {hasHistory && <span className="cv-reading-time">{timeAgo}</span>}
        </div>

        {hasHistory ? (
          <>
            <div className="cv-reading-content">
              {/* Cover thumbnail */}
              <div className="cv-reading-thumb">
                <ComicCover
                  comic={{
                    id: history.comicId,
                    title: history.title,
                    category: history.category || "Comic",
                    format: history.format || "PDF"
                  }}
                  className="cv-reading-cover-mini"
                  showOverlay={false}
                />
                <span className="cv-reading-page-tag">p. {currentPage}</span>
              </div>

              {/* Info & Progress */}
              <div className="cv-reading-info">
                <div>
                  <span className="cv-reading-genre-pill">
                    {history.category || "COMIC"}
                  </span>
                  <h4 className="cv-reading-title" title={history.title}>
                    {history.title}
                  </h4>
                  <p className="cv-reading-pages">
                    Issue progress · Page {currentPage} of {totalPages}
                  </p>
                </div>

                {/* Progress bar meter */}
                <div className="cv-progress-section">
                  <div className="cv-progress-labels">
                    <span>Chapter Progress</span>
                    <span className="cv-progress-numeric">{progressPercent}%</span>
                  </div>
                  <div className="cv-progress-track">
                    <div
                      className="cv-progress-bar"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom resume strip */}
            <div className="cv-reading-actions-bar">
              <div className="cv-reading-saved-status">
                <BookmarkCheck size={16} className="text-secondary" />
                <span>Auto-saved page</span>
              </div>

              <div className="cv-reading-btn-group">
                <button
                  type="button"
                  className="cv-btn-ghost-sm"
                  onClick={onClearHistory}
                  title="Clear reading history"
                  aria-label="Clear history"
                >
                  <Trash2 size={14} />
                </button>

                <button
                  type="button"
                  className="cv-btn-resume"
                  onClick={() => onResume(history)}
                >
                  <span>Resume Reader</span>
                  <BookOpen size={15} />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty / Discovery State */
          <div className="cv-reading-empty">
            <div className="cv-empty-icon-wrap">
              <History size={28} className="text-primary" />
            </div>
            <h4 className="cv-empty-title">Your Reading Vault</h4>
            <p className="cv-empty-desc">
              Your reading progress, bookmarked pages, and chapter meters will automatically save here as you explore.
            </p>
            {fallbackComic && (
              <button
                type="button"
                className="cv-btn-secondary-full"
                onClick={() => onResume({ comicId: fallbackComic.id, title: fallbackComic.title, page: 0, totalPages: 1, category: fallbackComic.category, format: fallbackComic.format })}
              >
                <span>Start with {fallbackComic.title.slice(0, 24)}...</span>
                <Play size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Secondary Quick-Pick Micro-Entry */}
      {fallbackComic && (
        <div
          className="cv-micro-card"
          onClick={() => onResume({ comicId: fallbackComic.id, title: fallbackComic.title, page: 0, totalPages: 1, category: fallbackComic.category, format: fallbackComic.format })}
          role="button"
          tabIndex={0}
        >
          <div className="cv-micro-left">
            <div className="cv-micro-thumb">
              <ComicCover comic={fallbackComic} className="cv-micro-cover" showOverlay={false} />
            </div>
            <div className="cv-micro-text">
              <span className="cv-micro-kicker">SUGGESTED DISCOVERY</span>
              <h5 className="cv-micro-title">{fallbackComic.title}</h5>
              <p className="cv-micro-sub">{fallbackComic.category} • {fallbackComic.format}</p>
            </div>
          </div>
          <button
            type="button"
            className="cv-micro-play-btn"
            title="Read comic"
            aria-label={`Read ${fallbackComic.title}`}
          >
            <Play size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
