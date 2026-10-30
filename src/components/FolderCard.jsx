import React from "react";
import { Folder, ChevronRight, Layers, BookOpen } from "lucide-react";

export function FolderCard({ folder, onClick }) {
  // Derive category theme based on folder name
  const nameLower = (folder.name || "").toLowerCase();
  let themeClass = "theme-default";
  if (nameLower.includes("deadpool")) themeClass = "theme-deadpool";
  else if (nameLower.includes("panther")) themeClass = "theme-panther";
  else if (nameLower.includes("spider")) themeClass = "theme-spiderman";
  else if (nameLower.includes("dc") || nameLower.includes("batman")) themeClass = "theme-dc";
  else if (nameLower.includes("manga")) themeClass = "theme-manga";

  const countDisplay =
    folder.itemCount !== null && folder.itemCount !== undefined
      ? `${folder.itemCount} ${folder.itemCount === 1 ? "item" : "items"}`
      : "Open Folder";

  return (
    <article
      className={`cv-folder-card ${themeClass}`}
      onClick={() => onClick(folder)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(folder);
        }
      }}
      aria-label={`Open folder ${folder.name}`}
    >
      {/* Background Glow */}
      <div className="cv-folder-glow" aria-hidden="true" />
      <div className="cv-folder-grid-pattern" aria-hidden="true" />

      {/* Top Meta */}
      <div className="cv-folder-top">
        <div className="cv-folder-icon-wrap">
          <Folder size={24} className="cv-folder-icon" />
        </div>
        <span className="cv-folder-badge">CATEGORY</span>
      </div>

      {/* Center Details */}
      <div className="cv-folder-center">
        <h3 className="cv-folder-title" title={folder.name}>
          {folder.name}
        </h3>
        <p className="cv-folder-subtitle">Google Drive Collection</p>
      </div>

      {/* Bottom Action Footer */}
      <div className="cv-folder-footer">
        <span className="cv-folder-count">
          <Layers size={13} className="inline mr-1 opacity-70" />
          {countDisplay}
        </span>
        <span className="cv-folder-action-pill">
          <span>Explore</span>
          <ChevronRight size={14} />
        </span>
      </div>
    </article>
  );
}
