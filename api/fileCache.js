import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { getFileStream } from "./drive.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isVercel = process.env.VERCEL === "1" || !!process.env.NOW_REGION;
const CACHE_DIR = isVercel
  ? path.join(os.tmpdir(), "comicverse_cache")
  : path.resolve(__dirname, "../.comic_cache");

try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch (err) {
  console.warn("[fileCache] Could not initialize cache directory:", err.message);
}

const activeDownloads = new Map();
const prewarmQueue = [];
let isProcessingPrewarm = false;

export function getCachePath(fileId) {
  try {
    const binPath = path.join(CACHE_DIR, `${fileId}.bin`);
    if (fs.existsSync(binPath) && fs.statSync(binPath).size > 0) {
      return binPath;
    }
  } catch {}
  return null;
}

export function isCached(fileId) {
  return !!getCachePath(fileId);
}

export function getCachedSize(fileId) {
  const binPath = getCachePath(fileId);
  if (!binPath) return null;
  try {
    return fs.statSync(binPath).size;
  } catch {
    return null;
  }
}

export function getCacheStats() {
  if (!fs.existsSync(CACHE_DIR)) return { cachedFiles: 0, totalSizeMB: "0.0" };
  try {
    const files = fs.readdirSync(CACHE_DIR).filter((f) => f.endsWith(".bin"));
    let totalBytes = 0;
    for (const f of files) {
      try {
        totalBytes += fs.statSync(path.join(CACHE_DIR, f)).size;
      } catch {}
    }
    return {
      cachedFiles: files.length,
      totalSizeMB: (totalBytes / (1024 * 1024)).toFixed(1)
    };
  } catch {
    return { cachedFiles: 0, totalSizeMB: "0.0" };
  }
}

export function serveCachedFile(filePath, req, res, mime, filename, download = false) {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  res.setHeader("Content-Type", mime);
  res.setHeader(
    "Content-Disposition",
    `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(filename)}`
  );
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "public, max-age=604800, immutable");

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (isNaN(start) || start >= fileSize || (parts[1] && end < start)) {
      res.setHeader("Content-Range", `bytes */${fileSize}`);
      return res.status(416).end();
    }

    const chunksize = end - start + 1;
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
    res.setHeader("Content-Length", chunksize);

    const stream = fs.createReadStream(filePath, { start, end });
    stream.on("error", (err) => {
      console.error("[fileCache] Error reading range stream:", err);
      if (!res.headersSent) res.status(500).end();
    });
    return stream.pipe(res);
  }

  res.status(200);
  res.setHeader("Content-Length", fileSize);
  const stream = fs.createReadStream(filePath);
  stream.on("error", (err) => {
    console.error("[fileCache] Error reading full stream:", err);
    if (!res.headersSent) res.status(500).end();
  });
  return stream.pipe(res);
}

export async function downloadAndCache(fileId) {
  const existing = getCachePath(fileId);
  if (existing) return existing;

  if (activeDownloads.has(fileId)) {
    return activeDownloads.get(fileId);
  }

  const downloadPromise = (async () => {
    const binPath = path.join(CACHE_DIR, `${fileId}.bin`);
    const tmpPath = path.join(CACHE_DIR, `${fileId}.tmp`);

    try {
      const driveRes = await getFileStream(fileId);
      const writeStream = fs.createWriteStream(tmpPath);

      await new Promise((resolve, reject) => {
        driveRes.data.pipe(writeStream);
        driveRes.data.on("error", reject);
        writeStream.on("error", reject);
        writeStream.on("finish", resolve);
      });

      if (fs.existsSync(tmpPath) && fs.statSync(tmpPath).size > 0) {
        fs.renameSync(tmpPath, binPath);
      } else {
        throw new Error("Downloaded file was empty");
      }

      return binPath;
    } catch (err) {
      if (fs.existsSync(tmpPath)) {
        try { fs.unlinkSync(tmpPath); } catch {}
      }
      throw err;
    } finally {
      activeDownloads.delete(fileId);
    }
  })();

  activeDownloads.set(fileId, downloadPromise);
  return downloadPromise;
}

export async function handleComicFileRequest(comic, req, res, next) {
  try {
    const mime = (
      comic.format === "PDF" ? "application/pdf" :
      comic.format === "CBZ" ? "application/zip" : "application/octet-stream"
    );
    const download = req.query.download === "1";

    const cachedPath = getCachePath(comic.id);
    if (cachedPath) {
      return serveCachedFile(cachedPath, req, res, mime, comic.filename, download);
    }

    try {
      console.log(`[Cache] Downloading "${comic.title}" to disk cache...`);
      const binPath = await downloadAndCache(comic.id);
      return serveCachedFile(binPath, req, res, mime, comic.filename, download);
    } catch (cacheErr) {
      console.warn(`[Cache] Cache download fallback for "${comic.title}":`, cacheErr.message);
      const rangeHeader = req.headers.range;
      const driveRes = await getFileStream(comic.id, rangeHeader);

      res.setHeader("Content-Type", mime);
      res.setHeader(
        "Content-Disposition",
        `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(comic.filename)}`
      );
      if (driveRes.headers["content-range"]) {
        res.setHeader("Content-Range", driveRes.headers["content-range"]);
      }
      if (driveRes.headers["accept-ranges"]) {
        res.setHeader("Accept-Ranges", driveRes.headers["accept-ranges"]);
      }
      if (driveRes.headers["content-length"]) {
        res.setHeader("Content-Length", driveRes.headers["content-length"]);
      }
      res.status(driveRes.statusCode || 200);
      return driveRes.data.pipe(res);
    }
  } catch (err) {
    next(err);
  }
}

export function enqueuePrewarm(comicIds = []) {
  if (isVercel) return;
  for (const id of comicIds) {
    if (!id || isCached(id) || prewarmQueue.includes(id) || activeDownloads.has(id)) {
      continue;
    }
    prewarmQueue.push(id);
  }
  processPrewarmQueue();
}

async function processPrewarmQueue() {
  if (isProcessingPrewarm || prewarmQueue.length === 0) return;
  isProcessingPrewarm = true;

  while (prewarmQueue.length > 0) {
    const nextId = prewarmQueue.shift();
    if (!nextId || isCached(nextId)) continue;

    try {
      console.log(`[Pre-warm] Background caching comic: ${nextId}`);
      await downloadAndCache(nextId);
      const sizeMB = (getCachedSize(nextId) / (1024 * 1024)).toFixed(1);
      console.log(`[Pre-warm] Cached ${nextId} (${sizeMB} MB)`);
    } catch (err) {
      console.warn(`[Pre-warm] Failed to pre-warm ${nextId}:`, err.message);
    }
  }

  isProcessingPrewarm = false;
}
