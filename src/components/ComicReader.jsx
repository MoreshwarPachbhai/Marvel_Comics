import React, { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight, X, Download, Maximize2, Minimize2, Loader2, BookOpen, AlertCircle } from "lucide-react";
import JSZip from "jszip";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export function ComicReader({ comic, initialPage = 0, onClose, apiBaseUrl }) {
  const [pages, setPages] = useState([]);
  const [page, setPage] = useState(initialPage);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [pageRendering, setPageRendering] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const canvasRef = useRef(null);
  const readerRef = useRef(null);
  const renderTaskRef = useRef(null);

  const fileUrl = `${apiBaseUrl}/api/comics/${encodeURIComponent(comic.id)}/file`;

  // 1. Load document (PDF or CBZ)
  useEffect(() => {
    let active = true;
    async function loadComic() {
      setLoading(true);
      setDownloadProgress(null);
      setError("");
      setPages([]);
      setPdfDoc(null);

      try {
        if (comic.format === "PDF") {
          const loadingTask = pdfjsLib.getDocument({
            url: fileUrl,
            disableAutoFetch: true,
            disableStream: false,
            rangeChunkSize: 65536,
          });

          loadingTask.onProgress = ({ loaded, total }) => {
            if (active && total > 0) {
              const pct = Math.min(100, Math.round((loaded / total) * 100));
              const loadedMB = (loaded / (1024 * 1024)).toFixed(1);
              const totalMB = (total / (1024 * 1024)).toFixed(1);
              setDownloadProgress({ pct, loadedMB, totalMB });
            }
          };

          const doc = await loadingTask.promise;
          if (active) {
            setPdfDoc(doc);
            const safeInitial = Math.min(doc.numPages - 1, Math.max(0, initialPage));
            setPage(safeInitial);
          }
        } else if (comic.format === "CBZ") {
          const response = await fetch(fileUrl);
          if (!response.ok) throw new Error("Could not load comic archive from server.");
          const zip = await JSZip.loadAsync(await response.blob());
          const entries = Object.values(zip.files)
            .filter((f) => !f.dir && /\.(png|jpe?g|webp|gif|avif)$/i.test(f.name))
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

          if (entries.length === 0) {
            throw new Error("No image pages found inside this CBZ archive.");
          }

          const urls = await Promise.all(
            entries.map(async (entry) => URL.createObjectURL(await entry.async("blob")))
          );

          if (active) {
            setPages(urls);
            const safeInitial = Math.min(urls.length - 1, Math.max(0, initialPage));
            setPage(safeInitial);
          } else {
            urls.forEach(URL.revokeObjectURL);
          }
        } else {
          throw new Error("CBR archives are available for direct download. Convert to CBZ for seamless in-browser reading.");
        }
      } catch (err) {
        if (active) setError(err.message || "Failed to open comic file.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadComic();

    return () => {
      active = false;
      pages.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [comic.id]);

  const count = pdfDoc?.numPages || pages.length;

  // 2. Render current PDF page
  useEffect(() => {
    let cancelled = false;

    async function renderPdfPage() {
      if (!pdfDoc || !canvasRef.current) return;

      // Cancel previous render if in progress
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignore cancellation
        }
      }

      setPageRendering(true);
      try {
        const pageNum = page + 1;
        const pdfPage = await pdfDoc.getPage(pageNum);
        if (cancelled || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        // Device Pixel Ratio scaling for ultra-sharp text and line art
        const dpr = window.devicePixelRatio || 1;
        const baseViewport = pdfPage.getViewport({ scale: 1 });
        
        // Calculate fit scale based on viewport width / height
        const container = canvas.parentElement;
        const targetWidth = container ? container.clientWidth - 40 : window.innerWidth * 0.85;
        const scale = Math.min(2.5, Math.max(1.2, targetWidth / baseViewport.width));
        
        const viewport = pdfPage.getViewport({ scale });

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderTask = pdfPage.render({
          canvasContext: context,
          viewport: viewport
        });
        renderTaskRef.current = renderTask;

        await renderTask.promise;
      } catch (err) {
        if (!cancelled && err?.name !== "RenderingCancelledException") {
          console.error("PDF Render error:", err);
        }
      } finally {
        if (!cancelled) setPageRendering(false);
      }
    }

    renderPdfPage();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, page]);

  // 3. Save reading progress to localStorage
  useEffect(() => {
    if (count > 0) {
      try {
        localStorage.setItem(
          "comicverse_reading_history",
          JSON.stringify({
            comicId: comic.id,
            title: comic.title,
            category: comic.category,
            format: comic.format,
            page: page,
            totalPages: count,
            timestamp: Date.now()
          })
        );
      } catch (e) {
        console.warn("Could not save reading progress to localStorage", e);
      }
    }
  }, [comic.id, comic.title, comic.category, comic.format, page, count]);

  // 4. Keyboard Shortcuts: ArrowLeft, ArrowRight, Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "ArrowLeft") {
        setPage((p) => Math.max(0, p - 1));
      } else if (e.key === "ArrowRight") {
        setPage((p) => (count > 0 ? Math.min(count - 1, p + 1) : p));
      } else if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [count, onClose]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      readerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  return (
    <div
      className="cv-reader-backdrop"
      ref={readerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Reading ${comic.title}`}
    >
      {/* Reader Top Bar */}
      <header className="cv-reader-header">
        <div className="cv-reader-header-left">
          <span className="cv-reader-eyebrow">NOW READING</span>
          <h2 className="cv-reader-title" title={comic.title}>
            {comic.title}
          </h2>
          <span className="cv-reader-format-tag">{comic.format}</span>
        </div>

        <div className="cv-reader-header-right">
          {/* Quick Page Indicator in header */}
          {!loading && !error && count > 0 && (
            <span className="cv-reader-page-indicator">
              Page {page + 1} of {count}
            </span>
          )}

          {/* Download Original File Button */}
          <a
            href={`${fileUrl}?download=1`}
            className="cv-reader-action-btn"
            title="Download original comic file"
            aria-label="Download original file"
            download
          >
            <Download size={18} />
          </a>

          {/* Fullscreen Button */}
          <button
            type="button"
            className="cv-reader-action-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

          {/* Close Button */}
          <button
            type="button"
            className="cv-reader-close-btn"
            onClick={onClose}
            title="Close reader (Esc)"
            aria-label="Close reader"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Reader Main Content Canvas */}
      <main className="cv-reader-stage">
        {loading && (
          <div className="cv-reader-status">
            <Loader2 size={36} className="cv-spin text-primary" />
            <p className="cv-reader-status-text">
              {downloadProgress
                ? `Loading: ${downloadProgress.loadedMB} MB / ${downloadProgress.totalMB} MB (${downloadProgress.pct}%)`
                : "Streaming comic from Google Drive..."}
            </p>
            {downloadProgress && (
              <div
                style={{
                  width: "240px",
                  height: "6px",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "999px",
                  overflow: "hidden",
                  marginTop: "12px"
                }}
              >
                <div
                  style={{
                    width: `${downloadProgress.pct}%`,
                    height: "100%",
                    background: "var(--cv-primary)",
                    borderRadius: "999px",
                    transition: "width 0.2s ease"
                  }}
                />
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="cv-reader-error-card">
            <AlertCircle size={32} className="text-primary mb-2" />
            <h4 className="cv-reader-error-title">Unable to Open Reader</h4>
            <p className="cv-reader-error-msg">{error}</p>
            <a
              href={`${fileUrl}?download=1`}
              className="cv-btn-primary mt-4"
              download
            >
              <Download size={16} />
              <span>Download Original File</span>
            </a>
          </div>
        )}

        {/* PDF Page Canvas */}
        {!loading && !error && comic.format === "PDF" && (
          <div className="cv-reader-canvas-container">
            {pageRendering && (
              <div className="cv-canvas-rendering-badge">
                <Loader2 size={14} className="cv-spin" />
                <span>Rendering...</span>
              </div>
            )}
            <canvas ref={canvasRef} className="cv-pdf-canvas" />
          </div>
        )}

        {/* CBZ Image Page */}
        {!loading && !error && comic.format === "CBZ" && pages[page] && (
          <div className="cv-reader-image-container">
            <img
              src={pages[page]}
              alt={`Page ${page + 1}`}
              className="cv-cbz-page"
            />
          </div>
        )}
      </main>

      {/* Reader Bottom Controls Dock */}
      {!loading && !error && count > 0 && (
        <footer className="cv-reader-dock" aria-label="Reader Navigation Dock">
          <button
            type="button"
            className="cv-dock-btn"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            title="Previous Page (Left Arrow)"
          >
            <ChevronLeft size={18} />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Page Selector */}
          <div className="cv-dock-page-selector">
            <span>Page</span>
            <input
              type="number"
              min={1}
              max={count}
              value={page + 1}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) {
                  setPage(Math.min(count - 1, Math.max(0, val - 1)));
                }
              }}
              className="cv-dock-page-input"
              aria-label="Jump to page"
            />
            <span>of {count}</span>
          </div>

          <button
            type="button"
            className="cv-dock-btn"
            disabled={page >= count - 1}
            onClick={() => setPage((p) => Math.min(count - 1, p + 1))}
            title="Next Page (Right Arrow)"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={18} />
          </button>
        </footer>
      )}
    </div>
  );
}
