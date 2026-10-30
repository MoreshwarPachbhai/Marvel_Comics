import { listChildren } from "./drive.js";

const ALLOWED = new Set(["application/pdf", "application/zip", "application/x-zip-compressed", "application/x-rar-compressed", "application/vnd.rar"]);
const EXTENSIONS = new Set(["pdf", "cbz", "cbr"]);

function extension(name = "") {
  return name.split(".").pop().toLowerCase();
}

function safeLabel(value = "") {
  return value.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

export async function scanLibrary(rootFolderId) {
  if (!rootFolderId) throw new Error("Missing DRIVE_ROOT_FOLDER_ID");

  const comics = [];
  const visited = new Set();
  const seenFileIds = new Set();

  async function walk(folderId, pathParts = []) {
    if (visited.has(folderId)) return;
    visited.add(folderId);

    const children = await listChildren(folderId);
    for (const item of children) {
      if (item.mimeType === "application/vnd.google-apps.folder") {
        await walk(item.id, [...pathParts, item.name]);
        continue;
      }

      const ext = extension(item.name);
      if (!EXTENSIONS.has(ext)) continue;
      if (seenFileIds.has(item.id)) continue;
      seenFileIds.add(item.id);

      const category = pathParts[0] || "Uncategorized";
      const series = pathParts.slice(1).join(" / ") || category;
      comics.push({
        id: item.id,
        title: safeLabel(item.name),
        filename: item.name,
        format: ext.toUpperCase(),
        category,
        series,
        size: item.size ? Number(item.size) : null,
        modifiedTime: item.modifiedTime || item.createdTime || null,
        createdTime: item.createdTime || null,
        thumbnailUrl: item.thumbnailLink || null
      });
    }
  }

  await walk(rootFolderId);
  comics.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
  return comics;
}

export async function getFolderContents(folderId, folderName = "") {
  if (!folderId) throw new Error("Missing folderId");

  const children = await listChildren(folderId);
  const subfolders = [];
  const comics = [];
  const seenIds = new Set();

  for (const item of children) {
    if (item.mimeType === "application/vnd.google-apps.folder") {
      subfolders.push({
        id: item.id,
        name: item.name,
        type: "folder",
        itemCount: null
      });
      continue;
    }

    const ext = extension(item.name);
    if (!EXTENSIONS.has(ext)) continue;
    if (seenIds.has(item.id)) continue;
    seenIds.add(item.id);

    comics.push({
      id: item.id,
      title: safeLabel(item.name),
      filename: item.name,
      format: ext.toUpperCase(),
      category: folderName || "Comics",
      series: folderName || "Comics",
      size: item.size ? Number(item.size) : null,
      modifiedTime: item.modifiedTime || item.createdTime || null,
      createdTime: item.createdTime || null,
      thumbnailUrl: item.thumbnailLink || null
    });
  }

  // Natural sorting for comics (Issue 001, 002, ...)
  comics.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
  subfolders.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  // Count items for each subfolder in parallel
  if (subfolders.length > 0 && subfolders.length <= 30) {
    await Promise.allSettled(
      subfolders.map(async (sub) => {
        try {
          const subChildren = await listChildren(sub.id);
          const validItems = subChildren.filter(
            (c) => c.mimeType === "application/vnd.google-apps.folder" || EXTENSIONS.has(extension(c.name))
          );
          sub.itemCount = validItems.length;
        } catch {
          sub.itemCount = null;
        }
      })
    );
  }

  subfolders.sort((a, b) => a.name.localeCompare(b.name));
  comics.sort((a, b) => a.title.localeCompare(b.title));

  return { subfolders, comics };
}
