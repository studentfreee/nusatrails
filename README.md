# NusaTrails website: build pack

Everything an agent or developer needs to build the NusaTrails website (v1, desktop).

## Start here
1. Read **PRD.md** (what, why, menus, pages, stack, pipeline, acceptance criteria).
2. Open the design reference: `design-reference/html/01-home.html` etc. in a browser (fonts load from Google Fonts). `design-reference/screenshots/` has JPEGs of the same pages (fonts substituted, layout accurate).
3. Use the data files, not the HTML, for content.

## Folder map
| Path | What |
|---|---|
| `logo.jpeg` | The brand logo. Source for the site logo, `favicon.ico` and the social preview image (see PRD section 5, Brand) |
| `PRD.md` | Product requirements and decisions (stack: Astro + Tailwind v4, Cloudflare Pages) |
| `design-reference/html/` | 21 standalone pages (visual reference only, do not copy the code) |
| `design-reference/screenshots/` | JPEG screenshots of the same 21 pages |
| `src/data/trips.json` | The 15 trips: prices, itinerary, included, stays, photos, open questions |
| `src/data/assets_manifest.json` | Every photo: status, size, where it is used, what is still missing |
| `src/data/faq.json` | FAQ (18 Q&A) and Terms |
| `src/content/page-text/` | Text of each page, for copy |
| `src/assets/photos/` | Web-ready photos in 3 folders: `01_team`, `02_own`, `03_temporary` (TEMPORARY) |
| `src/assets/brand/` | Logo copy and the cropped emblem used in the header and footer |
| `src/` | Astro app: `layouts/Base.astro`, `components/`, `lib/site.ts`, `styles/tokens.css`, `pages/` |
| `public/` | `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` (generated from `logo.jpeg`) |
| `backend/` | Google Apps Script (`Code.gs`) and setup guide for the lead pipeline |
| `functions/api/lead.ts` | Cloudflare Pages Function for `/api/lead` |
| `docs/DEPLOY-CLOUDFLARE-PAGES.md` | Deploy and domain steps |
| `.env.example` | Environment variables |

## Quick start
```
npm install
npm run dev      # http://localhost:4321
npm run build    # static output in dist/ (Node 22.23.4+)
```
Stack: Astro + React + Tailwind v4 (`@tailwindcss/vite`) + sitemap, self-hosted Oswald and Raleway (`@fontsource`). Copy `.env.example` to `.env` and fill the `PUBLIC_*` values. Pages stay static; only `functions/api/lead.ts` runs on the server.

## Rules
- Content comes from `src/data/` and `src/content/`; never re-import from Word files.
- Photos with status `TEMPORARY` must warn at build time and be replaced before launch. `DO_NOT_USE_*` files are never published.
- Anything marked `[CONFIRM]` is waiting for the owner. Show it clearly in development builds.
- No secrets in the repository. No base64 images. Do not copy the mockup's fixed pixel heights.
