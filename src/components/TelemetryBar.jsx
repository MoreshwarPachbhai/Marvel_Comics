import React from "react";
import { Sparkles, Layers, FileText, Archive, ShieldCheck } from "lucide-react";

export function TelemetryBar({
  comics,
  categories,
  activeCategory,
  setActiveCategory,
  lastSyncTime
}) {
  const pdfCount = comics.filter((c) => c.format === "PDF").length;
  const cbzCount = comics.filter((c) => c.format === "CBZ" || c.format === "CBR").length;
  const actualCategories = categories.filter((c) => c !== "All");

  return (
    <section className="cv-telemetry-card" id="genres" aria-label="Library Overview & Genre Filters">
      {/* Background ambient glow */}
      <div className="cv-glow-orb cv-glow-primary" aria-hidden="true" />
      <div className="cv-glow-orb cv-glow-cyan" aria-hidden="true" />

      <div className="cv-telemetry-content">
        {/* Left: User / Library Monogram & Status */}
        <div className="cv-telemetry-header">
          <div className="cv-avatar-badge">CV</div>
          <div className="cv-telemetry-meta">
            <div className="cv-telemetry-title-row">
              <h2 className="cv-telemetry-title">Welcome to ComicVerse</h2>
              <span className="cv-pill-tag">CLOUD ARCHIVE</span>
            </div>
            <p className="cv-telemetry-subtitle">
              <ShieldCheck size={14} className="cv-status-icon" />
              <span>Google Drive Connected · {lastSyncTime || "Live synchronized"}</span>
            </p>
          </div>
        </div>

        <div className="cv-divider-vertical" />

        {/* Center: Real Statistics Badges */}
        <div className="cv-metric-badges">
          <div className="cv-metric-badge" title="Total comics discovered in Google Drive">
            <span className="cv-metric-icon text-primary">
              <Sparkles size={16} />
            </span>
            <span className="cv-metric-value">{comics.length}</span>
            <span className="cv-metric-label">Total Comics</span>
          </div>

          <div className="cv-metric-badge" title="Distinct categories / folders in your library">
            <span className="cv-metric-icon text-secondary">
              <Layers size={16} />
            </span>
            <span className="cv-metric-value">{actualCategories.length}</span>
            <span className="cv-metric-label">Collections</span>
          </div>

          <div className="cv-metric-badge" title="PDF format comic files">
            <span className="cv-metric-icon text-cyan">
              <FileText size={16} />
            </span>
            <span className="cv-metric-value">{pdfCount}</span>
            <span className="cv-metric-label">PDF Files</span>
          </div>

          <div className="cv-metric-badge" title="CBZ/CBR format comic archives">
            <span className="cv-metric-icon text-amber">
              <Archive size={16} />
            </span>
            <span className="cv-metric-value">{cbzCount}</span>
            <span className="cv-metric-label">CBZ / CBR</span>
          </div>
        </div>
      </div>

      {/* Dynamic Category Filter Pills */}
      <div className="cv-filter-pills-row" role="tablist" aria-label="Genre & Folder Categories">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          const count = cat === "All" ? comics.length : comics.filter((c) => c.category === cat).length;
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveCategory(cat)}
              className={`cv-filter-pill ${isActive ? "active" : ""}`}
            >
              <span>{cat === "All" ? "All Comics" : cat}</span>
              <span className="cv-pill-count">{count}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
