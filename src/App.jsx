import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Library, AlertCircle, RefreshCw, Sparkles, Folder, ArrowLeft } from "lucide-react";

import { Navbar } from "./components/Navbar";
import { TelemetryBar } from "./components/TelemetryBar";
import { FeaturedSpotlight } from "./components/FeaturedSpotlight";
import { ContinueReading } from "./components/ContinueReading";
import { RecentlyAdded } from "./components/RecentlyAdded";
import { ComicCard } from "./components/ComicCard";
import { ComicReader } from "./components/ComicReader";
import { FolderCard } from "./components/FolderCard";
import { FolderBreadcrumbs } from "./components/FolderBreadcrumbs";

const API = (import.meta.env.VITE_API_BASE_URL !== undefined ? import.meta.env.VITE_API_BASE_URL : "").replace(/\/$/, "");

export default function App() {
  // Global Library Catalog State (for Telemetry, Featured, and Global Search)
  const [allComics, setAllComics] = useState([]);
  const [categories, setCategories] = useState(["All"]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [formatFilter, setFormatFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [readerComic, setReaderComic] = useState(null);
  const [readerInitialPage, setReaderInitialPage] = useState(0);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState("");
  const [rootSubfolders, setRootSubfolders] = useState([]);

  // Folder Navigation State
  // folderHistory is an array of { id, name } representing the breadcrumb trail
  const [folderHistory, setFolderHistory] = useState([
    { id: "", name: "Library", isRoot: true }
  ]);
  const [folderLoading, setFolderLoading] = useState(false);
  const [folderError, setFolderError] = useState("");
  const [folderData, setFolderData] = useState({
    currentFolder: { id: "", name: "Library", isRoot: true },
    subfolders: [],
    comics: []
  });

  // User Local Storage State
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem("comicverse_bookmarks");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showOnlyBookmarks, setShowOnlyBookmarks] = useState(false);
  const [readingHistory, setReadingHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("comicverse_reading_history");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Keep reading history synchronized
  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem("comicverse_reading_history");
        setReadingHistory(saved ? JSON.parse(saved) : null);
      } catch {}
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleStorage);
    };
  }, []);

  // Fetch Folder Contents by ID
  const fetchFolder = useCallback(async (folderId = "", folderName = "Library") => {
    setFolderLoading(true);
    setFolderError("");
    try {
      const queryParams = new URLSearchParams();
      if (folderId) queryParams.set("id", folderId);
      if (folderName) queryParams.set("name", folderName);

      const res = await fetch(`${API}/api/folders?${queryParams.toString()}`);
      if (!res.ok) throw new Error(`Could not load folder contents (HTTP ${res.status})`);
      const data = await res.json();
      setFolderData(data);
      if (!folderId) {
        setRootSubfolders(data.subfolders || []);
      }
    } catch (err) {
      setFolderError(err.message || "Failed to load folder.");
    } finally {
      setFolderLoading(false);
    }
  }, []);

  // Initial Library Loading
  async function loadInitialData(force = false) {
    setGlobalLoading(true);
    setError("");
    try {
      const [comicRes, catRes] = await Promise.all([
        fetch(`${API}/api/comics${force ? "?sync=1" : ""}`, {
          headers: force ? { "Cache-Control": "no-cache" } : {}
        }),
        fetch(`${API}/api/categories${force ? "?sync=1" : ""}`, {
          headers: force ? { "Cache-Control": "no-cache" } : {}
        })
      ]);

      if (!comicRes.ok || !catRes.ok) {
        throw new Error("Could not connect to ComicVerse API. Check your backend and Google Drive configuration.");
      }

      const comicData = await comicRes.json();
      const catData = await catRes.json();

      setAllComics(comicData.comics || []);
      setCategories(["All", ...(catData.categories || [])]);
      setLastSyncTime("Updated just now");

      // Load root folder
      await fetchFolder("", "Library");
    } catch (err) {
      setError(err.message || "Failed to connect to Google Drive library.");
    } finally {
      setGlobalLoading(false);
    }
  }

  // Sync Library with Google Drive
  async function syncDrive() {
    setSyncing(true);
    setError("");
    try {
      const response = await fetch(`${API}/api/library/sync`, {
        method: "POST",
        headers: { "Cache-Control": "no-cache" }
      });
      if (!response.ok) throw new Error("Google Drive sync failed");

      // Refresh both global catalog and current folder view without requiring a page refresh
      const current = folderHistory[folderHistory.length - 1];
      await Promise.all([
        loadInitialData(true),
        fetchFolder(current.id, current.name)
      ]);
    } catch (err) {
      setError(err.message || "Failed to refresh Google Drive.");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  // Folder Navigation Handlers
  const handleSelectFolder = (subfolder) => {
    // When selecting a top-level category folder directly, also sync activeCategory
    if (folderHistory.length === 1) {
      setActiveCategory(subfolder.name);
    }
    const nextHistory = [...folderHistory, { id: subfolder.id, name: subfolder.name }];
    setFolderHistory(nextHistory);
    fetchFolder(subfolder.id, subfolder.name);
    const el = document.getElementById("collection");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleNavigateBreadcrumb = (index) => {
    const target = folderHistory[index];
    const nextHistory = folderHistory.slice(0, index + 1);
    setFolderHistory(nextHistory);
    if (index === 0) {
      setActiveCategory("All");
    } else if (index === 1) {
      setActiveCategory(target.name);
    }
    fetchFolder(target.id, target.name);
  };

  const handleBackFolder = () => {
    if (folderHistory.length <= 1) return;
    const nextHistory = folderHistory.slice(0, folderHistory.length - 1);
    const target = nextHistory[nextHistory.length - 1];
    setFolderHistory(nextHistory);
    if (nextHistory.length === 1) {
      setActiveCategory("All");
    } else if (nextHistory.length === 2) {
      setActiveCategory(target.name);
    }
    fetchFolder(target.id, target.name);
  };

  // Telemetry Bar Category Pill Click Handler
  const handleCategoryPillClick = (catName) => {
    setActiveCategory(catName);
    setShowOnlyBookmarks(false);
    setSearch("");

    if (catName === "All") {
      // Return to root folder
      setFolderHistory([{ id: "", name: "Library", isRoot: true }]);
      fetchFolder("", "Library");
    } else {
      // Find the folder corresponding to this category in rootSubfolders or folderData
      const targetSub =
        rootSubfolders.find((f) => f.name.toLowerCase() === catName.toLowerCase()) ||
        folderData.subfolders.find((f) => f.name.toLowerCase() === catName.toLowerCase());

      if (targetSub) {
        setFolderHistory([
          { id: "", name: "Library", isRoot: true },
          { id: targetSub.id, name: targetSub.name }
        ]);
        fetchFolder(targetSub.id, targetSub.name);
      }
    }

    const el = document.getElementById("collection");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  // Bookmark Toggle
  const toggleBookmark = (comicId) => {
    setBookmarks((prev) => {
      const updated = prev.includes(comicId)
        ? prev.filter((id) => id !== comicId)
        : [...prev, comicId];
      try {
        localStorage.setItem("comicverse_bookmarks", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Clear Reading History
  const handleClearHistory = () => {
    try {
      localStorage.removeItem("comicverse_reading_history");
    } catch {}
    setReadingHistory(null);
  };

  // Open Reader
  const handleOpenReader = (comic, initialPage = 0) => {
    setReaderInitialPage(initialPage);
    setReaderComic(comic);
  };

  // Resume Reading
  const handleResumeHistory = (historyItem) => {
    const target = allComics.find((c) => c.id === historyItem.comicId);
    if (target) {
      handleOpenReader(target, historyItem.page || 0);
    } else {
      handleOpenReader(
        {
          id: historyItem.comicId,
          title: historyItem.title,
          category: historyItem.category || "Comic",
          format: historyItem.format || "PDF"
        },
        historyItem.page || 0
      );
    }
  };

  // Filtered comics when user uses search or bookmarks
  const searchOrBookmarkComics = useMemo(() => {
    if (!search.trim() && !showOnlyBookmarks) return [];
    return allComics.filter((comic) => {
      const matchesBookmark = !showOnlyBookmarks || bookmarks.includes(comic.id);
      const searchTerms = `${comic.title} ${comic.category} ${comic.series || ""} ${comic.filename || ""}`.toLowerCase();
      const matchesSearch = !search.trim() || searchTerms.includes(search.toLowerCase().trim());
      const matchesFormat = formatFilter === "All" || comic.format === formatFilter;
      return matchesBookmark && matchesSearch && matchesFormat;
    });
  }, [allComics, search, showOnlyBookmarks, bookmarks, formatFilter]);

  // Filtered comics for current folder view
  const currentFolderComics = useMemo(() => {
    if (!folderData.comics) return [];
    if (formatFilter === "All") return folderData.comics;
    return folderData.comics.filter((c) => c.format === formatFilter);
  }, [folderData.comics, formatFilter]);

  // Filtered comics for the active category
  const categoryComics = useMemo(() => {
    if (!activeCategory || activeCategory === "All") return allComics;
    return allComics.filter(
      (c) => (c.category || "").toLowerCase() === activeCategory.toLowerCase()
    );
  }, [allComics, activeCategory]);

  // Prominent Featured Comic dynamically tied to active category
  const featuredComic = useMemo(() => {
    if (categoryComics.length === 0) return null;
    const issueOne = categoryComics.find((c) => /001|#0*1\b|issue\s*[-_]?\s*0*1\b/i.test(c.title));
    if (issueOne) return issueOne;
    return categoryComics[0];
  }, [categoryComics]);

  // Download URL Builder
  const getDownloadUrl = (comicId) => `${API}/api/comics/${encodeURIComponent(comicId)}/file`;

  const isBrowsingSearchOrBookmarks = Boolean(search.trim() || showOnlyBookmarks);
  const isRootFolder = folderHistory.length <= 1;

  return (
    <div className="cv-app-shell">
      {/* Top Navbar */}
      <Navbar
        search={search}
        setSearch={setSearch}
        activeCategory={activeCategory}
        setActiveCategory={handleCategoryPillClick}
        onSync={syncDrive}
        syncing={syncing}
        totalComics={allComics.length}
        bookmarkedCount={bookmarks.length}
        showOnlyBookmarks={showOnlyBookmarks}
        setShowOnlyBookmarks={setShowOnlyBookmarks}
        onNavigateHome={() => {
          setActiveCategory("All");
          setFormatFilter("All");
          setSearch("");
          setShowOnlyBookmarks(false);
          setFolderHistory([{ id: "", name: "Library", isRoot: true }]);
          fetchFolder("", "Library");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

      {/* Main Bento Discovery Layout */}
      <main className="cv-main-content">
        <div className="cv-layout-container">
          {/* Top Section: Curator Telemetry & Category Filters */}
          <TelemetryBar
            comics={allComics}
            categories={categories}
            activeCategory={activeCategory}
            setActiveCategory={handleCategoryPillClick}
            lastSyncTime={lastSyncTime}
          />

          {/* Primary Bento Tier: Featured Spotlight & Continue Reading */}
          {!globalLoading && !error && allComics.length > 0 && !isBrowsingSearchOrBookmarks && (
            <div className="cv-bento-primary-grid">
              {/* 7 Columns: Hero Spotlight */}
              <div className="cv-bento-col-7">
                <FeaturedSpotlight
                  comic={featuredComic}
                  activeCategory={activeCategory}
                  onRead={(c) => handleOpenReader(c, 0)}
                  onDownload={getDownloadUrl}
                  isBookmarked={featuredComic ? bookmarks.includes(featuredComic.id) : false}
                  onToggleBookmark={toggleBookmark}
                />
              </div>

              {/* 5 Columns: Continue Reading Progress Rail */}
              <div className="cv-bento-col-5">
                <ContinueReading
                  history={readingHistory}
                  onClearHistory={handleClearHistory}
                  onResume={handleResumeHistory}
                  fallbackComic={categoryComics.length > 1 ? categoryComics[1] : (categoryComics[0] || allComics[0])}
                />
              </div>
            </div>
          )}

          {/* Secondary Bento Tier: Recent Cloud Drops */}
          {!globalLoading && !error && allComics.length > 0 && !isBrowsingSearchOrBookmarks && (
            <RecentlyAdded
              comics={categoryComics}
              activeCategory={activeCategory}
              onRead={(c) => handleOpenReader(c, 0)}
            />
          )}

          {/* ==========================================================================
             MAIN FOLDER-BASED COMIC LIBRARY SECTION
             ========================================================================== */}
          <section className="cv-collection-section" id="collection" aria-label="Comic Library">
            {/* Header / Mode Indicator */}
            <div className="cv-collection-header">
              <div>
                <span className="cv-section-kicker">
                  {isBrowsingSearchOrBookmarks ? "LIBRARY SEARCH" : "GOOGLE DRIVE HIERARCHY"}
                </span>
                <h3 className="cv-collection-title">
                  {showOnlyBookmarks
                    ? "Saved Bookmarks"
                    : search.trim()
                    ? `Search Results for "${search}"`
                    : isRootFolder
                    ? "Categories & Series"
                    : folderData.currentFolder?.name || "Folder"}
                </h3>
              </div>

              {/* Format Filter Chips */}
              <div className="cv-collection-controls">
                <div className="cv-format-pill-group" role="group" aria-label="Filter by file format">
                  {["All", "PDF", "CBZ", "CBR"].map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      className={`cv-format-btn ${formatFilter === fmt ? "active" : ""}`}
                      onClick={() => setFormatFilter(fmt)}
                    >
                      {fmt === "All" ? "All Formats" : fmt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="cv-error-banner" role="alert">
                <AlertCircle size={28} className="cv-error-icon" />
                <div className="cv-error-content">
                  <h4 className="cv-error-title">Google Drive Connection Notice</h4>
                  <p className="cv-error-desc">{error}</p>
                </div>
                <button
                  type="button"
                  className="cv-btn-secondary"
                  onClick={loadInitialData}
                >
                  <RefreshCw size={14} />
                  <span>Retry Connection</span>
                </button>
              </div>
            )}

            {/* Global Loading Skeleton */}
            {globalLoading && (
              <div className="cv-loading-grid">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="cv-card-skeleton">
                    <div className="cv-skeleton-cover cv-skeleton-pulse" />
                    <div className="cv-skeleton-line cv-skeleton-pulse w-3/4" />
                    <div className="cv-skeleton-line cv-skeleton-pulse w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {/* ====================================================================
               MODE A: SEARCH OR BOOKMARKS VIEW (FLAT FILTERED LIST)
               ==================================================================== */}
            {isBrowsingSearchOrBookmarks && !globalLoading && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    className="cv-btn-secondary"
                    onClick={() => {
                      setSearch("");
                      setShowOnlyBookmarks(false);
                    }}
                  >
                    <ArrowLeft size={14} />
                    <span>Return to Folder Navigation</span>
                  </button>
                  <span className="cv-results-badge">
                    {searchOrBookmarkComics.length} {searchOrBookmarkComics.length === 1 ? "issue" : "issues"} found
                  </span>
                </div>

                {searchOrBookmarkComics.length === 0 ? (
                  <div className="cv-empty-state">
                    <div className="cv-empty-icon-circle">
                      <Library size={36} />
                    </div>
                    <h4 className="cv-empty-heading">No Comics Found</h4>
                    <p className="cv-empty-sub">
                      {search
                        ? `No issues matched your search "${search}". Try another title or series.`
                        : "You haven't bookmarked any comics yet. Click the bookmark icon on any comic card to save it."}
                    </p>
                  </div>
                ) : (
                  <div className="cv-comic-grid">
                    {searchOrBookmarkComics.map((comic) => (
                      <ComicCard
                        key={comic.id}
                        comic={comic}
                        onRead={(c) => handleOpenReader(c, 0)}
                        downloadUrl={getDownloadUrl(comic.id)}
                        isBookmarked={bookmarks.includes(comic.id)}
                        onToggleBookmark={toggleBookmark}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ====================================================================
               MODE B: HIERARCHICAL FOLDER-BASED BROWSING VIEW
               ==================================================================== */}
            {!isBrowsingSearchOrBookmarks && !globalLoading && (
              <div className="flex flex-col gap-5">
                {/* Interactive Breadcrumb Bar */}
                <FolderBreadcrumbs
                  history={folderHistory}
                  onNavigate={handleNavigateBreadcrumb}
                  onBack={handleBackFolder}
                  subfolderCount={folderData.subfolders?.length || 0}
                  comicCount={currentFolderComics.length}
                />

                {/* Folder Loading Skeleton */}
                {folderLoading && (
                  <div className="cv-folder-grid">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="cv-folder-card cv-skeleton-pulse">
                        <div className="cv-skeleton-line w-1/2 mb-4" />
                        <div className="cv-skeleton-line w-3/4 mb-2" />
                        <div className="cv-skeleton-line w-1/4" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Folder Error Message */}
                {folderError && !folderLoading && (
                  <div className="cv-error-banner">
                    <AlertCircle size={24} className="cv-error-icon" />
                    <p className="cv-error-desc">{folderError}</p>
                    <button
                      type="button"
                      className="cv-btn-secondary ml-auto"
                      onClick={() => {
                        const cur = folderHistory[folderHistory.length - 1];
                        fetchFolder(cur.id, cur.name);
                      }}
                    >
                      <RefreshCw size={14} />
                      <span>Retry</span>
                    </button>
                  </div>
                )}

                {/* Subfolders Grid (Displayed if present) */}
                {!folderLoading && !folderError && folderData.subfolders?.length > 0 && (
                  <div>
                    {!isRootFolder && folderData.comics?.length > 0 && (
                      <div className="cv-folder-section-heading">
                        <Folder size={16} className="text-secondary" />
                        <h4 className="cv-folder-section-title">Subfolders</h4>
                        <span className="cv-folder-section-count">{folderData.subfolders.length}</span>
                      </div>
                    )}

                    <div className="cv-folder-grid">
                      {folderData.subfolders.map((subfolder) => (
                        <FolderCard
                          key={subfolder.id}
                          folder={subfolder}
                          onClick={handleSelectFolder}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Comic Files Grid (Displayed if present in current folder) */}
                {!folderLoading && !folderError && currentFolderComics.length > 0 && (
                  <div>
                    {folderData.subfolders?.length > 0 && (
                      <div className="cv-folder-section-heading mt-6">
                        <Library size={16} className="text-primary" />
                        <h4 className="cv-folder-section-title">Issues in this folder</h4>
                        <span className="cv-folder-section-count">{currentFolderComics.length}</span>
                      </div>
                    )}

                    <div className="cv-comic-grid">
                      {currentFolderComics.map((comic) => (
                        <ComicCard
                          key={comic.id}
                          comic={comic}
                          onRead={(c) => handleOpenReader(c, 0)}
                          downloadUrl={getDownloadUrl(comic.id)}
                          isBookmarked={bookmarks.includes(comic.id)}
                          onToggleBookmark={toggleBookmark}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty Folder State */}
                {!folderLoading &&
                  !folderError &&
                  folderData.subfolders?.length === 0 &&
                  currentFolderComics.length === 0 && (
                    <div className="cv-empty-state">
                      <div className="cv-empty-icon-circle">
                        <Folder size={36} />
                      </div>
                      <h4 className="cv-empty-heading">Folder is Empty</h4>
                      <p className="cv-empty-sub">
                        No subfolders or supported comic files (.pdf, .cbz, .cbr) were found inside this Google Drive folder.
                      </p>
                      <button
                        type="button"
                        className="cv-btn-secondary mt-3"
                        onClick={handleBackFolder}
                      >
                        <ArrowLeft size={14} />
                        <span>Go Back</span>
                      </button>
                    </div>
                  )}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="cv-footer">
        <div className="cv-footer-inner">
          <div className="cv-footer-brand">
            <div className="cv-brand-logo small">
              <Library size={16} />
            </div>
            <div>
              <span className="cv-footer-title">
                COMIC<span className="text-primary">VERSE</span>
              </span>
              <p className="cv-footer-tagline">Every story has a universe.</p>
            </div>
          </div>

          <div className="cv-footer-links">
            <span className="cv-footer-copy">
              Powered by Google Drive & PDF.js · © {new Date().getFullYear()} ComicVerse
            </span>
            <button
              type="button"
              className="cv-footer-top-btn"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Back to Top ↑
            </button>
          </div>
        </div>
      </footer>

      {/* Comic Reader Modal */}
      {readerComic && (
        <ComicReader
          key={readerComic.id}
          comic={readerComic}
          initialPage={readerInitialPage}
          onClose={() => setReaderComic(null)}
          apiBaseUrl={API}
        />
      )}
    </div>
  );
}
