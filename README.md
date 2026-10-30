# ComicVerse 🌌 — Dynamic Google Drive Comic Library (Vercel-Ready)

ComicVerse is a high-performance digital comic reader and archive platform featuring a dark Bento-style UI. It dynamically connects directly to your Google Drive folder structure, automatically extracting categories, series, issues, and metadata.

---

## ✨ Features

- **Dynamic Google Drive Integration**: Zero-hardcoding folder and file hierarchy. Reads your connected Drive directly, discovering categories, subfolders, and comic files dynamically.
- **Dynamic Category Selection**: Selecting any category dynamically updates the Featured Spotlight comic, cover art, kicker, series description, and issue counts.
- **Real-Time Cloud Sync & Recently Added**: Extracts exact ISO timestamps (`modifiedTime`, `createdTime`) and file sizes from Google Drive. Newly uploaded comics appear immediately at the top without requiring a browser refresh.
- **Lightning-Fast PDF & CBZ Reader**: Built-in PDF.js and JSZip readers with HTTP 206 Partial Content byte-range support for sub-second page rendering and sub-5-second full loads.
- **Vercel Serverless Architecture**: Fully optimized for one-click deployment on Vercel. Serverless backend functions in `/api` and Vite React SPA frontend in `/src`.
- **Pure Zero-Config Drive Access**: Runs out of the box using public Google Drive folder links, with optional Google Cloud Service Account support for private archives.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v18 or newer
- npm v9 or newer

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration inside `.env`:
```env
PORT=8080
DRIVE_ROOT_FOLDER_ID=1nNfIuaDIPxQSfHXciqo3nfGrv1owE7hB
CLIENT_ORIGIN=http://localhost:5173
CACHE_TTL_SECONDS=300
```
> **Note**: Ensure your Google Drive root folder sharing permission is set to **"Anyone with the link can view"**.

### 4. Run Both Server & Client
```bash
npm run dev
```
- **Frontend App**: [http://localhost:5173](http://localhost:5173) (with automatic `/api` proxying)
- **Backend API**: [http://localhost:8080](http://localhost:8080)

Or run them individually:
```bash
npm run server  # Starts Express API on port 8080
npm run client  # Starts Vite frontend on port 5173
```

---

## ☁️ Deploying to Vercel (Step-by-Step)

This repository is pre-configured with `vercel.json` for seamless Vercel deployment. Both the React client and the Express Serverless API deploy together as a single project.

### Method 1: Deploy via GitHub / GitLab / Bitbucket (Recommended)

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial ComicVerse Vercel deployment"
   git remote add origin https://github.com/your-username/comicverse.git
   git push -u origin main
   ```

2. **Import into Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New... > Project"**.
   - Select your ComicVerse repository.

3. **Configure Project Settings**:
   - **Framework Preset**: Vite (detected automatically).
   - **Root Directory**: `./` (leave default).
   - **Build Command**: `npm run build` (or `vite build`).
   - **Output Directory**: `dist`.

4. **Add Environment Variables in Vercel**:
   Under **Environment Variables**, add:
   | Key | Value | Description |
   |---|---|---|
   | `DRIVE_ROOT_FOLDER_ID` | `1nNfIuaDIPxQSfHXciqo3nfGrv1owE7hB` | Your Google Drive folder ID |
   | `CACHE_TTL_SECONDS` | `300` | In-memory cache duration in seconds |
   | `GOOGLE_SERVICE_ACCOUNT_JSON` | *(optional)* | Single-line JSON key if using private Drive |

5. **Deploy**:
   Click **Deploy**. Vercel will build your static assets and provision `/api` serverless endpoints automatically in under a minute!

---

### Method 2: Deploy using Vercel CLI

1. Install Vercel CLI (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. Run `vercel` from the project directory:
   ```bash
   vercel
   ```
   Follow the prompts to link your project.

3. Add your environment variables:
   ```bash
   vercel env add DRIVE_ROOT_FOLDER_ID
   ```

4. Deploy to production:
   ```bash
   vercel --prod
   ```

---

## 📁 Project Structure

```
ComicVerse-Vercel/
├── api/                     # Vercel Serverless Functions (Node.js/Express)
│   ├── index.js             # API entry point & route definitions
│   ├── drive.js             # Google Drive API & public web scraper integration
│   ├── library.js           # Dynamic folder hierarchy scanner & natural issue sorter
│   ├── fileCache.js         # HTTP 206 byte-range streamer & /tmp caching
│   └── stream-helper.js     # Stream helper utilities
├── src/                     # React + Vite Frontend
│   ├── components/          # Reusable UI components
│   │   ├── ComicCard.jsx    # Individual comic issue cards with format pills
│   │   ├── ComicCover.jsx   # Dynamic themed cover illustrations
│   │   ├── ComicReader.jsx  # In-browser PDF & CBZ reader with live progress bar
│   │   ├── ContinueReading.jsx # Resume reading shelf with reading progress
│   │   ├── FeaturedSpotlight.jsx # Dynamic category-filtered featured spotlight
│   │   ├── FolderBreadcrumbs.jsx # Deep folder breadcrumb navigation
│   │   ├── FolderCard.jsx   # Dynamic folder cards with comic counts
│   │   ├── Navbar.jsx       # Header with category pills & sync trigger
│   │   ├── RecentlyAdded.jsx # Timestamp-sorted newest issues list
│   │   └── TelemetryBar.jsx # Bento metrics (total comics, categories, storage)
│   ├── App.jsx              # Main application logic & reactive state
│   ├── main.jsx             # React DOM entry point
│   └── styles.css           # Bento dark-mode styles, gradients, and animations
├── index.html               # Main HTML document
├── vite.config.js           # Vite build config with /api proxy for local development
├── vercel.json              # Vercel deployment routes, function limits & rewrites
├── .env.example             # Clean environment variables template
├── .gitignore               # Ignored build artifacts, dependencies, and caches
└── package.json             # Root unified dependencies and scripts
```

---

## 🛠️ Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `DRIVE_ROOT_FOLDER_ID` | **Yes** | `None` | Google Drive root folder ID containing your comics. |
| `CACHE_TTL_SECONDS` | No | `300` | How long folder metadata is cached before re-querying Drive. |
| `PORT` | No | `8080` | Local development port for the API server. |
| `CLIENT_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origins for standalone backend setups. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | No | `None` | Optional single-line service account JSON for private Google Drive folders. |
| `VITE_API_BASE_URL` | No | `""` | Optional base URL for API calls. Defaults to relative `""` in production (same-domain). |

---

## 🔒 Security & Privacy

- **No Secrets in Frontend**: `App.jsx` and all React client components communicate with the backend exclusively via relative `/api` routes. Google Drive credentials or folder structures are never exposed to browser clients.
- **Serverless Isolation**: File caching on Vercel utilizes isolated temporary storage (`/tmp`), automatically managed by the serverless runtime.
