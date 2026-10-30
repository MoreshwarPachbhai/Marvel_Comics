import React, { useMemo } from "react";
import { Sparkles, Play, BookOpen } from "lucide-react";
import { ComicCover } from "./ComicCover";

export function RecentlyAdded({ comics, activeCategory = "All", onRead }) {
  // Always sort by latest modification timestamp descending (newest first)
  const recentComics = useMemo(() => {
    if (!comics || comics.length === 0) return [];
    return [...comics]
      .sort((a, b) => {
        const timeA = a.modifiedTime ? new Date(a.modifiedTime).getTime() : 0;
        const timeB = b.modifiedTime ? new Date(b.modifiedTime).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return a.title.localeCompare(b.title, undefined, { numeric: true });
      })
      .slice(0, 4);
  }, [comics]);

  const sectionTitle = activeCategory === "All"
    ? "Recently Added to Library"
    : `Recently Added in ${activeCategory}`;

  if (!comics || comics.length === 0) {
    return (
      <section className="cv-recent-section" aria-label="Recently Added Issues">
        <div className="cv-recent-header">
          <div className="cv-recent-title-wrap">
            <Sparkles size={18} className="text-secondary" />
            <h3 className="cv-recent-title">{sectionTitle}</h3>
          </div>
          <span className="cv-recent-kicker">LATEST CLOUD SYNC</span>
        </div>
        <div
          style={{
            padding: "36px 20px",
            textAlign: "center",
            background: "rgba(255, 255, 255, 0.02)",
            borderRadius: "14px",
            border: "1px dashed rgba(255, 255, 255, 0.08)",
            color: "var(--cv-text-muted)"
          }}
        >
          <BookOpen size={24} className="text-secondary inline-block mb-2" />
          <p style={{ fontSize: "14px", color: "var(--cv-text-muted)" }}>
            No recently synced comics available in "{activeCategory}".
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="cv-recent-section" aria-label="Recently Added Issues">
      <div className="cv-recent-header">
        <div className="cv-recent-title-wrap">
          <Sparkles size={18} className="text-secondary" />
          <h3 className="cv-recent-title">{sectionTitle}</h3>
        </div>
        <span className="cv-recent-kicker">LATEST CLOUD SYNC</span>
      </div>

      <div className="cv-recent-grid">
        {recentComics.map((comic) => (
          <div
            key={comic.id}
            className="cv-recent-card"
            onClick={() => onRead(comic)}
            role="button"
            tabIndex={0}
            aria-label={`Read ${comic.title}`}
          >
            <div className="cv-recent-thumb">
              <ComicCover comic={comic} className="cv-recent-cover" showOverlay={false} />
            </div>

            <div className="cv-recent-info">
              <div className="cv-recent-meta">
                <span className="cv-recent-format">{comic.format}</span>
                <span className="cv-recent-cat">{comic.category}</span>
              </div>
              <h4 className="cv-recent-name" title={comic.title}>
                {comic.title}
              </h4>
              <p className="cv-recent-sub">{comic.series || comic.category}</p>
            </div>

            <button
              type="button"
              className="cv-recent-play"
              title={`Read ${comic.title}`}
              aria-label="Read"
            >
              <Play size={14} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
