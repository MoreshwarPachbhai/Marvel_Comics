import React from "react";
import { BookOpen, Search, Bookmark, RefreshCw, X, FolderGit2 } from "lucide-react";

export function Navbar({
  search,
  setSearch,
  activeCategory,
  setActiveCategory,
  onSync,
  syncing,
  totalComics,
  bookmarkedCount,
  showOnlyBookmarks,
  setShowOnlyBookmarks,
  onNavigateHome
}) {
  return (
    <header className="cv-navbar">
      <div className="cv-navbar-inner">
        {/* Brand */}
        <div className="cv-brand-wrap" onClick={onNavigateHome} role="button" tabIndex={0} aria-label="Go to ComicVerse home">
          <div className="cv-brand-logo">
            <BookOpen size={20} className="cv-brand-icon" />
          </div>
          <div className="cv-brand-text">
            <span className="cv-brand-title">
              COMIC<span className="cv-brand-accent">VERSE</span>
            </span>
            <span className="cv-brand-tagline">Every story has a universe</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="cv-nav-links" aria-label="Main Navigation">
          <button
            type="button"
            className={`cv-nav-link ${!showOnlyBookmarks ? "active" : ""}`}
            onClick={() => {
              setShowOnlyBookmarks(false);
              setActiveCategory("All");
              const el = document.getElementById("collection");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Explore
          </button>
          <button
            type="button"
            className="cv-nav-link"
            onClick={() => {
              const el = document.getElementById("genres");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Genres
          </button>
          <button
            type="button"
            className="cv-nav-link"
            onClick={() => {
              const el = document.getElementById("collection");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
          >
            My Library
          </button>
        </nav>

        {/* Search Bar */}
        <div className="cv-search-container">
          <div className="cv-search-input-wrap">
            <Search size={16} className="cv-search-icon" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search comics, series, folders..."
              className="cv-search-input"
              aria-label="Search comic library"
            />
            {search && (
              <button
                type="button"
                className="cv-search-clear"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
            <div className="cv-search-shortcut">
              <span>⌘K</span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="cv-nav-actions">
          {/* Saved / Bookmarks Toggle */}
          <button
            type="button"
            onClick={() => setShowOnlyBookmarks(!showOnlyBookmarks)}
            className={`cv-action-button ${showOnlyBookmarks ? "active" : ""}`}
            title={showOnlyBookmarks ? "Show all comics" : "Show saved bookmarks"}
            aria-label="Saved Vault Bookmarks"
          >
            <Bookmark size={18} fill={showOnlyBookmarks ? "currentColor" : "none"} />
            {bookmarkedCount > 0 && (
              <span className="cv-badge-count">{bookmarkedCount}</span>
            )}
          </button>

          {/* Sync Drive Button */}
          <button
            type="button"
            onClick={onSync}
            disabled={syncing}
            className={`cv-sync-button ${syncing ? "syncing" : ""}`}
            title="Refresh library from Google Drive"
            aria-label="Sync Google Drive library"
          >
            <RefreshCw size={15} className={syncing ? "cv-spin" : ""} />
            <span className="cv-sync-label">{syncing ? "Syncing..." : "Sync Drive"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
