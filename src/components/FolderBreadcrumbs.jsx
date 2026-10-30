import React from "react";
import { ChevronRight, ArrowLeft, Home, Folder } from "lucide-react";

export function FolderBreadcrumbs({
  history,
  onNavigate,
  onBack,
  subfolderCount = 0,
  comicCount = 0
}) {
  const isRoot = history.length <= 1;

  let countLabel = "";
  if (subfolderCount > 0 && comicCount > 0) {
    countLabel = `${subfolderCount} folders · ${comicCount} comics`;
  } else if (subfolderCount > 0) {
    countLabel = `${subfolderCount} ${subfolderCount === 1 ? "folder" : "folders"}`;
  } else if (comicCount > 0) {
    countLabel = `${comicCount} ${comicCount === 1 ? "issue" : "issues"}`;
  } else {
    countLabel = "Empty folder";
  }

  return (
    <nav className="cv-breadcrumbs-bar" aria-label="Folder Navigation">
      <div className="cv-breadcrumbs-left">
        {/* Back Button */}
        {!isRoot && (
          <button
            type="button"
            className="cv-btn-back"
            onClick={onBack}
            title="Go up one folder level"
            aria-label="Go back"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back</span>
          </button>
        )}

        {/* Trail Items */}
        <ol className="cv-breadcrumbs-trail">
          {history.map((item, index) => {
            const isLast = index === history.length - 1;
            return (
              <li key={item.id || index} className="cv-breadcrumb-item">
                {index === 0 ? (
                  <button
                    type="button"
                    className={`cv-breadcrumb-link ${isLast ? "current" : ""}`}
                    onClick={() => !isLast && onNavigate(index)}
                    aria-current={isLast ? "page" : undefined}
                  >
                    <Home size={14} className="inline mr-1 opacity-80" />
                    <span>{item.name || "Library"}</span>
                  </button>
                ) : (
                  <>
                    <ChevronRight size={13} className="cv-breadcrumb-separator" aria-hidden="true" />
                    <button
                      type="button"
                      className={`cv-breadcrumb-link ${isLast ? "current" : ""}`}
                      onClick={() => !isLast && onNavigate(index)}
                      aria-current={isLast ? "page" : undefined}
                      title={item.name}
                    >
                      <Folder size={13} className="inline mr-1 opacity-70" />
                      <span className="cv-breadcrumb-name">{item.name}</span>
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Item Count Badge */}
      <div className="cv-breadcrumbs-badge">
        <span>{countLabel}</span>
      </div>
    </nav>
  );
}
