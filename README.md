# FrameRipper

Extract video frames as PNG or JPG images — entirely in the browser. No uploads, no servers, no tracking.

FrameRipper uses [ffmpeg.wasm](https://github.com/nicedayzhu/ffmpeg.wasm) to decode video client-side, then lets you browse, select, and download the extracted frames individually or as a ZIP.

## Features

- **100 % client-side** — video never leaves your machine
- **FPS or every-Nth-frame** extraction modes
- **JPG / PNG** output with quality control
- **Bulk ZIP download** via JSZip (STORE compression for speed)
- **Frame cache** in IndexedDB — survives page refresh
- **Installable PWA** with offline support
- **Synthwave Sunset** dark theme

## Tech Stack

| Layer | Library |
|-------|---------|
| UI | React 19, Tailwind CSS 4, Framer Motion 11, Lucide React |
| Video decode | @ffmpeg/ffmpeg 0.12 (single-threaded, loaded from CDN) |
| State | Zustand 5 (persisted settings) |
| Storage | idb (IndexedDB wrapper) |
| Packaging | JSZip |
| Build | Vite 8, TypeScript 5.9 |
| Test | Vitest, React Testing Library |
| Deploy | GitHub Actions → GitHub Pages |

## Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check then production build |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm run format` | Format source with Prettier |
| `npm test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |

## Deployment — GitHub Pages

The repo includes a GitHub Actions workflow at `.github/workflows/deploy.yml` that:

1. Installs dependencies
2. Lints and tests
3. Builds for production
4. Deploys the `dist/` folder to GitHub Pages

### Setup

1. Push this repo to GitHub.
2. Go to **Settings → Pages → Build and deployment** and set the source to **GitHub Actions**.
3. Push to `main` (or trigger the workflow manually) — the site will be live at:
   ```
   https://<your-username>.github.io/frame-ripper/
   ```

> The Vite `base` is set to `/frame-ripper/` in `vite.config.ts`. If your repo has a different name, update the `base` value to match.

## Project Structure

```
src/
├── components/
│   ├── features/    # DownloadPanel, ExtractionSettings, FrameGallery, …
│   ├── layout/      # Header, Footer, Layout
│   └── ui/          # Button, DropZone, ProgressBar, Spinner, Toast
├── hooks/           # useFFmpeg, useFrameExtractor, useDownload
├── store/           # Zustand store (appStore) + IndexedDB (frameDb)
├── styles/          # globals.css (theme vars, Tailwind)
├── types/           # TypeScript interfaces
├── utils/           # constants, ffmpegCommands, fileUtils, formatUtils, toast
├── wasm/            # ffmpegLoader (singleton, CDN-loaded)
├── App.tsx
└── main.tsx
tests/
└── utils/           # Unit tests for pure utility functions
```

## License

[MIT](LICENSE)
