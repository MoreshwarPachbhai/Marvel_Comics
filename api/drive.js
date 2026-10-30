import { google } from "googleapis";
import https from "node:https";

let driveClient;

export function getDrive() {
  if (driveClient) return driveClient;

  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  let credentials;
  try {
    credentials = JSON.parse(raw);
  } catch (err) {
    console.warn("GOOGLE_SERVICE_ACCOUNT_JSON parse error, falling back to public Drive mode:", err.message);
    return null;
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"]
  });

  driveClient = google.drive({ version: "v3", auth });
  return driveClient;
}

async function fetchPublicDriveFolder(folderId) {
  const res = await fetch(`https://drive.google.com/drive/folders/${folderId}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache"
    }
  });
  if (!res.ok) throw new Error(`Failed to load Google Drive folder ${folderId}: HTTP ${res.status}`);
  const html = await res.text();
  const unescaped = html.replace(/\\x22/g, '"').replace(/\\x5b/g, '[').replace(/\\x5d/g, ']').replace(/\\x2f/g, '/');

  const items = [];
  const seenIds = new Set();

  // 1. Parse structured JSON from window['_DRIVE_ivd'] which contains complete metadata
  // (ID, filename, MIME, modified timestamp in ms, created timestamp in ms, exact size in bytes)
  const ivdIdx = unescaped.indexOf("window['_DRIVE_ivd']");
  if (ivdIdx !== -1) {
    try {
      const start = unescaped.indexOf("'[[", ivdIdx) + 1;
      const end = unescaped.indexOf("';", start);
      if (start > 0 && end > start) {
        const jsonStr = unescaped.slice(start, end).replace(/\\"/g, '"');
        const data = JSON.parse(jsonStr);
        const rawList = Array.isArray(data[0]) ? data[0] : [];
        for (const it of rawList) {
          if (!Array.isArray(it) || !it[0] || !it[2]) continue;
          const id = String(it[0]);
          if (seenIds.has(id)) continue;
          seenIds.add(id);

          const name = String(it[2]);
          const rawMime = String(it[3] || "");
          const mimeType = rawMime.includes("folder") ? "application/vnd.google-apps.folder" : rawMime;
          const modTimestamp = typeof it[9] === "number" ? it[9] : null;
          const createdTimestamp = typeof it[10] === "number" ? it[10] : null;
          const size = typeof it[13] === "number" ? it[13] : null;

          items.push({
            id,
            name,
            mimeType,
            size,
            modifiedTime: modTimestamp ? new Date(modTimestamp).toISOString() : (createdTimestamp ? new Date(createdTimestamp).toISOString() : null),
            createdTime: createdTimestamp ? new Date(createdTimestamp).toISOString() : null,
            webViewLink: `https://drive.google.com/file/d/${id}/view`,
            thumbnailLink: `https://drive.google.com/thumbnail?id=${id}&sz=w600`
          });
        }
      }
    } catch (parseErr) {
      console.warn("Error parsing window['_DRIVE_ivd'], falling back to regex scanner:", parseErr.message);
    }
  }

  // 2. Fallback regex scanner if window['_DRIVE_ivd'] missed anything
  const regex = /\["([a-zA-Z0-9_-]{25,})",\["([a-zA-Z0-9_-]{25,})"\],"([^"]+)","([^"]+)"/g;
  let match;

  while ((match = regex.exec(unescaped)) !== null) {
    const id = match[1];
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const name = match[3];
    const rawMime = match[4];
    const mimeType = rawMime.includes("folder") ? "application/vnd.google-apps.folder" : rawMime;

    const pos = match.index;
    const snippet = unescaped.slice(pos, pos + 2500);
    const sizeMatch = snippet.match(/\[1,null,\[null,\[\[\["([^"]+)"\]\]\]/);
    const dateMatch = snippet.match(/\[2,null,\[null,\[\[\["([^"]+)"\]\]\]/);

    let size = null;
    if (sizeMatch) {
      const s = sizeMatch[1];
      if (s.endsWith("MB")) size = Math.round(parseFloat(s) * 1024 * 1024);
      else if (s.endsWith("KB")) size = Math.round(parseFloat(s) * 1024);
      else if (s.endsWith("GB")) size = Math.round(parseFloat(s) * 1024 * 1024 * 1024);
      else if (s.endsWith("B")) size = parseInt(s, 10);
    }

    items.push({
      id,
      name,
      mimeType,
      size,
      modifiedTime: dateMatch ? dateMatch[1] : null,
      webViewLink: `https://drive.google.com/file/d/${id}/view`,
      thumbnailLink: `https://drive.google.com/thumbnail?id=${id}&sz=w600`
    });
  }

  return items;
}

function getPublicFileStream(fileId, rangeHeader) {
  const url = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
  return new Promise((resolve, reject) => {
    function makeRequest(targetUrl, redirects = 0) {
      if (redirects > 5) return reject(new Error("Too many redirects downloading file"));
      const req = https.get(
        targetUrl,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            ...(rangeHeader ? { Range: rangeHeader } : {})
          }
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return makeRequest(res.headers.location, redirects + 1);
          }
          resolve({ data: res, headers: res.headers, statusCode: res.statusCode });
        }
      );
      req.on("error", reject);
    }
    makeRequest(url);
  });
}

export async function listChildren(folderId) {
  const drive = getDrive();
  if (drive) {
    const all = [];
    let pageToken;

    do {
      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        pageSize: 1000,
        pageToken,
        orderBy: "modifiedTime desc, folder, name",
        fields: "nextPageToken,files(id,name,mimeType,size,modifiedTime,createdTime,webViewLink,thumbnailLink)"
      });
      all.push(...(response.data.files || []));
      pageToken = response.data.nextPageToken;
    } while (pageToken);

    return all;
  }

  return fetchPublicDriveFolder(folderId);
}

export async function getFileStream(fileId, rangeHeader) {
  const drive = getDrive();
  if (drive) {
    const response = await drive.files.get(
      { fileId, alt: "media" },
      {
        responseType: "stream",
        ...(rangeHeader ? { headers: { Range: rangeHeader } } : {})
      }
    );
    return { data: response.data, headers: response.headers, statusCode: response.status };
  }

  return getPublicFileStream(fileId, rangeHeader);
}
