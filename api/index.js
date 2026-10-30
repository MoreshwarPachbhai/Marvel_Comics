import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { scanLibrary, getFolderContents } from "./library.js";
import { getDrive, getFileStream } from "./drive.js";
import { handleComicFileRequest, enqueuePrewarm, isCached, getCachedSize, getCacheStats } from "./fileCache.js";

const app = express();
const port = process.env.PORT || 8080;
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",").map((value) => value.trim()).filter(Boolean);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: (origin, callback) => {
  if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
    return callback(null, true);
  }
  return callback(new Error("Origin not allowed by CORS"));
}}));
app.use(express.json());
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("tiny"));
}

let cache = { comics: null, expiresAt: 0 };
const folderCache = new Map();
const cacheSeconds = Math.max(30, Number(process.env.CACHE_TTL_SECONDS || 300));

async function getLibrary(force = false) {
  if (!force && cache.comics && Date.now() < cache.expiresAt) return cache.comics;
  const comics = await scanLibrary(process.env.DRIVE_ROOT_FOLDER_ID);
  cache = { comics, expiresAt: Date.now() + cacheSeconds * 1000 };
  if (comics && comics.length > 0) {
    enqueuePrewarm(comics.slice(0, 2).map((c) => c.id));
  }
  return comics;
}

app.get("/api/health", (_req, res) => res.json({
  ok: true,
  service: "ComicVerse API",
  environment: process.env.VERCEL ? "vercel" : "standalone"
}));

app.get("/api/comics", async (req, res, next) => {
  try {
    const force = req.query.sync === "1" || req.headers["cache-control"]?.includes("no-cache");
    const comics = await getLibrary(force);
    const q = String(req.query.q || "").toLowerCase().trim();
    const category = String(req.query.category || "").toLowerCase().trim();
    const filtered = comics.filter((comic) => {
      const matchesQuery = !q || [comic.title, comic.filename, comic.category, comic.series].join(" ").toLowerCase().includes(q);
      const matchesCategory = !category || comic.category.toLowerCase() === category;
      return matchesQuery && matchesCategory;
    });

    const recent = [...comics]
      .sort((a, b) => {
        const timeA = a.modifiedTime ? new Date(a.modifiedTime).getTime() : 0;
        const timeB = b.modifiedTime ? new Date(b.modifiedTime).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return a.title.localeCompare(b.title);
      })
      .slice(0, 8);

    res.json({
      comics: filtered,
      recentComics: recent,
      total: filtered.length,
      cached: !force && Date.now() < cache.expiresAt
    });
  } catch (error) { next(error); }
});

app.get("/api/categories", async (_req, res, next) => {
  try {
    const comics = await getLibrary();
    res.json({ categories: [...new Set(comics.map((comic) => comic.category))].sort() });
  } catch (error) { next(error); }
});

app.get("/api/folders", async (req, res, next) => {
  try {
    const rootId = process.env.DRIVE_ROOT_FOLDER_ID;
    const folderId = req.query.id || rootId;
    const isRoot = folderId === rootId;

    const cacheKey = folderId;
    const cached = folderCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return res.json(cached.data);
    }

    const folderName = req.query.name || (isRoot ? "Library" : "Folder");
    const { subfolders, comics } = await getFolderContents(folderId, folderName);

    const responseData = {
      currentFolder: {
        id: folderId,
        name: folderName,
        isRoot
      },
      subfolders,
      comics
    };

    folderCache.set(cacheKey, {
      data: responseData,
      expiresAt: Date.now() + cacheSeconds * 1000
    });

    if (comics && comics.length > 0) {
      enqueuePrewarm(comics.slice(0, 3).map((c) => c.id));
    }

    res.json(responseData);
  } catch (error) { next(error); }
});

app.post("/api/library/sync", async (_req, res, next) => {
  try {
    folderCache.clear();
    const comics = await getLibrary(true);
    const recent = [...comics]
      .sort((a, b) => {
        const timeA = a.modifiedTime ? new Date(a.modifiedTime).getTime() : 0;
        const timeB = b.modifiedTime ? new Date(b.modifiedTime).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return a.title.localeCompare(b.title);
      })
      .slice(0, 8);

    res.json({
      ok: true,
      total: comics.length,
      comics,
      recentComics: recent,
      message: "Google Drive library refreshed"
    });
  } catch (error) { next(error); }
});

app.get("/api/comics/:id", async (req, res, next) => {
  try {
    const comics = await getLibrary();
    const comic = comics.find((item) => item.id === req.params.id);
    if (!comic) return res.status(404).json({ error: "Comic not found" });
    res.json({ comic });
  } catch (error) { next(error); }
});

app.get("/api/comics/:id/file", async (req, res, next) => {
  try {
    const comics = await getLibrary();
    const comic = comics.find((item) => item.id === req.params.id);
    if (!comic) return res.status(404).json({ error: "Comic not found" });

    await handleComicFileRequest(comic, req, res, next);
  } catch (error) { next(error); }
});

app.get("/api/cache/stats", (_req, res) => {
  res.json(getCacheStats());
});

app.use((error, _req, res, _next) => {
  console.error(error);
  if (res.headersSent) return;
  const message = error.message || "Unexpected server error";
  res.status(500).json({ error: message });
});

export default app;

if (process.env.VERCEL !== "1" && !process.env.NOW_REGION) {
  app.listen(port, () => console.log(`ComicVerse API listening on http://localhost:${port}`));
}
