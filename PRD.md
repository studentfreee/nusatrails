# NusaTrails Website: Product Requirements (v1, desktop)

Prepared 29 Oct 2026. Audience: the developer or coding agent who builds the site.
Read `README.md` first for the folder map and the working order.

## Ringkasan (Bahasa Indonesia)
- **Apa:** website tur privat NusaTrails (Jawa Timur + Yogyakarta) untuk wisatawan asing, bahasa Inggris, domain `nusatrails.id`.
- **Tujuan:** pengunjung paham tur, harga, dan kondisinya, lalu mengirim **permintaan booking**. Tidak ada pembayaran online.
- **Menu:** About, Trips, FAQ, Book (teks biasa), plus tombol WhatsApp melayang. Halaman: Home, Trips, 15 detail trip, Book, FAQ+Terms, About, Privacy.
- **Tech stack (diputuskan):** Astro + TypeScript + Tailwind v4, React hanya untuk bagian interaktif, hosting **Cloudflare Pages** (gratis, boleh komersial), satu Pages Function `/api/lead`.
- **Alur booking:** form -> `/api/lead` -> Google Apps Script -> baris di Google Sheet + notifikasi bot Telegram -> pop-up terima kasih dengan nomor referensi `NT-YYMMDD-NN` -> tim chat lewat WhatsApp. Tanpa email.
- **Brand:** logo dari `logo.jpeg` (root repo) dipakai sebagai logo situs dan sumber `favicon.ico`. Logo hijau tua di atas krem, jadi di situs gelap ditaruh dalam tile krem. Judul tab semua halaman: `nusatrails.id`.
- **Versi 1 hanya desktop**, dibangun fleksibel (tanpa tinggi tetap) supaya mobile menyusul tanpa bongkar ulang.
- **Foto sementara** (`TEMPORARY`) harus diganti sebelum tayang. Data yang belum pasti ditandai `[CONFIRM]` (bagian 13).

---

## 1. Product
**What:** marketing and lead-generation website for NusaTrails, a private-tour operator. Every trip is private (one group, own car, driver, English-speaking guide). Prices are per person and fall as the group grows.
**Goal:** a visitor understands the offer, price and effort within minutes and sends a booking request in under two minutes. Trust comes from real photos, clear prices, plain terms and a fast WhatsApp reply.
**Audience:** international travellers planning Java and Bali trips. English only in v1. Currency IDR.
**Trips (15):** Ijen, Bromo, Tumpak Sewu, Sukamade (East Java); Borobudur & Prambanan and Jomblang & Pindul Cave (Yogyakarta). Start points: Bali, Surabaya, Banyuwangi, Yogyakarta.

## 2. Scope
**In v1:** Home, Trips (filters), Trip detail (x15, one template), Booking + success pop-up, FAQ + Terms, About, Privacy, floating WhatsApp button, lead pipeline, SEO basics.
**Out of v1:** mobile-specific design (build responsive-friendly anyway), online payment, accounts, reviews, blog, Indonesian language, CMS UI (content lives in JSON/Markdown), guide profiles, destination pages, separate Contact page.

## 3. Stack and architecture (decided)
| Concern | Decision | Why |
|---|---|---|
| Framework | **Astro** (static output) + **TypeScript** | Content-heavy site, 20+ SEO pages, minimal JS. Astro is built on Vite, so you keep Vite speed. A plain Vite React SPA renders in the browser and is weaker for SEO. |
| Styling | **Tailwind CSS v4** (via the `@tailwindcss/vite` plugin; the old `@astrojs/tailwind` integration is deprecated) with the tokens in section 5 | Matches the mockup quickly. Tokens live in `tokens.css` and `@theme`. |
| Interactivity | **React islands** only for: trip filters, booking form + live price summary, success modal, FAQ chips | Keeps pages light. |
| Content | `data/trips.json`, `content/faq.json`, Markdown/JSON for page copy | One template renders all trips. |
| Backend | `functions/api/lead.ts` (Cloudflare Pages Function) -> Google Apps Script -> Google Sheet + Telegram | Cheap, no server. |
| Hosting | **Cloudflare Pages** free plan | Commercial use allowed, unlimited static bandwidth, 500 builds/month, Functions 100k requests/day. Vercel Hobby is NOT allowed for commercial sites. |
| Bot protection | Cloudflare Turnstile + honeypot + rate limit rule | Invisible to real users. |
| Images | `astro:assets` (sharp) at build time: WebP/AVIF, responsive sizes, never upscale | Source photos vary from 335 px to 2000 px. |
| Domain | `nusatrails.id` (`.com` is taken: check the brand is not confusable) | |

Suggested repository layout:
```
/ (repo root)
  functions/api/lead.ts          # given
  public/ (favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png, robots.txt, _headers)
  src/
    assets/photos/               # from assets/photos in this pack
    assets/brand/logo.jpeg       # from logo.jpeg in the repo root (source for logo, favicon, OG image)
    components/ (Nav, Footer, WhatsAppButton, HeroLayered, TripCard, PriceTable, DifficultyDots, BookingForm, SuccessModal, FaqList ...)
    data/ (trips.json, assets_manifest.json, faq.json)
    layouts/Base.astro
    pages/ index.astro, trips/index.astro, trips/[slug].astro, book.astro, faq.astro, about.astro, privacy.astro
    styles/tokens.css
```

## 4. Information architecture
| Route | Page | Notes |
|---|---|---|
| `/` | Home | |
| `/trips` | Trips | Filters in the URL query |
| `/trips/[slug]` | Trip detail | 15 slugs in `trips.json` |
| `/book` | Booking | Accepts `?trip=slug` |
| `/faq` | FAQ + Terms | Terms at `#terms` |
| `/about` | About | |
| `/privacy` | Privacy policy | Not designed yet; needed for the consent checkbox |

**Header:** logo (emblem from `logo.jpeg` in a cream tile plus the "NusaTrails" wordmark, see the Brand section in section 5) on the left; About, Trips, FAQ, Book (right). Plain text links, no pill buttons; the current page is shown in the accent colour. No "Contact" or "Included" items.
**Footer:** one slim row with no box or background, sitting on the image of the section above it: logo (same emblem tile as the header) + the same four links; three small icons (Instagram, WhatsApp, Email) right-aligned above the row.
**Floating WhatsApp button:** fixed bottom-right on every page, 60 px lime circle, `wa.me/<number>` with a prefilled greeting.

## 5. Design system
| Token | Value |
|---|---|
| Background | `#0b0a0a` |
| Text | `#e9e4dc`; body on dark `#d9d3c8`; muted `#bdb6ab` |
| Accent | `#b9d44a`; text on accent `#14170a` |
| Fonts | Oswald 500/600 (headings, uppercase titles), Raleway 400/500/600 (body), Google Fonts |
| Container | max-width 1240 px, 48 px horizontal padding |
| Glass card | bg `rgba(255,255,255,.06)`, 1 px border `rgba(255,255,255,.3)`, radius 14 px |
| Nav pill | height 60, radius 999, bg `rgba(11,10,10,.5)`, border `rgba(255,255,255,.25)` |
| Buttons | pill, 44 px (52 px large): outline white `.6`, or filled accent |
| Section title | Oswald 500, 44 px, uppercase, letter-spacing .04em, with a 1 px line filling the rest of the row |
| Difficulty | three dots (accent = filled) plus label Easy / Moderate / Challenging |

The mockup uses fixed heights and pixel positions only because it is a static canvas. Do not copy them: use fluid grid/flex.

### Brand: logo, favicon, tab title
Source file: `logo.jpeg` in the repo root (1254x1254 JPEG, opaque cream background `#f4f1e0`). It shows an emblem (mountain, sun, winding path, island silhouettes) above the text "NUSA TRAILS" and the tagline "FIND YOUR OWN WAY". Logo colours: deep green about `#032816`, gold about `#c49e5d`, cream `#f4f1e0`.
- **Logo in the UI:** use `logo.jpeg`, not the mockup's globe icon. The mockup's logo placeholder is replaced by this file.
  - The logo is dark green on cream and the site is dark (`#0b0a0a`), so it must never sit directly on the dark background. Place it inside a cream tile (`#f4f1e0`, radius 14 px) so the opaque JPEG background looks intentional.
  - **Header and footer:** the emblem only (crop of the top part, no text), about 56 px high in the tile, next to the live text wordmark "NusaTrails" (Oswald). The full image is unreadable at that size, and live text keeps the brand accessible and indexable.
  - **Full logo (emblem + name + tagline):** About page, social preview image (OG), and wherever a large logo fits. Do not stretch or recolour it.
  - Alt text: "NusaTrails". Set explicit width and height to avoid layout shift. Generate sizes with `astro:assets` (WebP/AVIF); never inline base64.
- **Favicon:** generate from the same file. Crop the emblem (about `800x670` starting at `227,180`), pad to a square with `#f4f1e0`, then export:
  - `public/favicon.ico` (multi-size 16, 32 and 48 px), `public/apple-touch-icon.png` (180 px), `public/icon-192.png`, `public/icon-512.png`.
  - At 16 px the full emblem is blurry. Check it in a real tab and, if needed, use a tighter crop (arc, mountain, sun) for the 16 px size.
  - Link in `Base.astro`: `<link rel="icon" href="/favicon.ico" sizes="any">` and `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`.
- **Tab title (next to the favicon):** **every page** uses `<title>nusatrails.id</title>` (decided by the owner), including Home, Trips, trip detail, Book, FAQ, About and Privacy. Define it once in `Base.astro` as a constant.
  - Keep the page-specific wording where it does not change the tab: a unique `meta description` per page, a descriptive `og:title` per page (for example the trip name) so shared links read well, and one `h1` per page.
  - Trade-off to accept: a tab title that is the same everywhere gives search engines less to show for each page, and multiple open tabs are indistinguishable. Revisit after launch if search traffic matters.
- **Social and structured data:** OG image uses the full logo on a cream background plus the trip photo where relevant. JSON-LD `Organization` uses `logo.jpeg` (or the 512 px icon) as `logo`.
- Optional: ask the owner or designer for a transparent, light version of the logo (SVG or PNG). That would remove the need for the cream tile.

### Home hero: layered title (key effect)
The word **NUSATRAILS** sits behind the mountains, so its lower part is hidden.
1. Layer 1: hero photo (`bromo_mist`, landscape crop 1920x1147) as full-bleed background.
2. Layer 2: `h1` "NusaTrails", Oswald 600, about 180 px, uppercase, `rgba(255,255,255,.8)`, absolutely positioned about 70 px from the top, aligned to the container.
3. Layer 3: the same photo again, same size and position, clipped with
   `clip-path: polygon(0% 22.5%, 8% 23.2%, 15% 22.4%, 20% 22%, 24% 22.8%, 30% 25%, 36% 26%, 50% 26%, 55% 25.7%, 59% 25.5%, 62% 24%, 65% 22.6%, 70% 22%, 75% 21.2%, 78% 20.6%, 80% 20.2%, 82% 21.5%, 84% 22.3%, 86% 21.7%, 88% 23%, 92% 26%, 96% 28%, 100% 30%, 100% 100%, 0% 100%)`
   (follows the ridge line and covers the bottom of the letters).
4. Layer 4: dark gradient (top .3 to clear, clear to .6 at 72%, then `#0b0a0a` at the bottom).
5. Layer 5: content: nav, five photo cards bottom-left, and bottom-right a label "PRIVATE TRIPS · INDONESIA", one sentence, buttons "See trips" and "Book".
The polygon was traced by eye. Tune it visually so roughly the bottom third of the letters is hidden; re-trace it if the photo changes.

### Inner-page hero
380-480 px tall: photo background, dark overlay (left darker for text), large translucent title without the hiding effect. Photo per page: see `photos.hero` in `trips.json` and `slots` in `assets_manifest.json`.

## 6. Page specifications
Visual truth: `design-reference/html/*.html` (open in a browser; fonts load from Google Fonts) and `design-reference/screenshots/*.jpg` (fonts substituted, layout only). All copy: `content/page-text/*.txt`, `content/faq.json`, `data/trips.json`.

### 6.1 Home
1. **Hero** (section 5).
2. **About the tour:** intro text left; zig-zag timeline right: Ijen, Bromo, Tumpak Sewu, Sukamade, two small photos each.
3. **Where you'll go:** a schematic route diagram (not a map): Bali, Ijen, Tumpak Sewu, Bromo, Surabaya along one line with drive times (4-5 h + about 1 h ferry, 6-7 h, 3-4 h, 3-4 h), a dashed branch to Sukamade, and a note that the Yogyakarta tours are full-day trips. Surabaya to Banyuwangi is 6-7 h.
4. **Popular trips:** six cards (3 columns): Ijen Blue Fire, Ijen & Bromo, Ijen · Tumpak Sewu · Bromo, Sukamade Wildlife, Borobudur & Prambanan, Jomblang & Pindul Cave.
5. **How it works:** three numbered cards.
6. **What's included:** four cards (guides, transport, stays, tickets and gear).
7. **Contact section:** full-bleed photo, glass card with the "Leave a request" form (name, phone, comment), footer on the image. Submits to the same pipeline with `type=question`.

### 6.2 Trips
- Filters (client side, combinable, kept in the URL): Duration (All, 1 day, 2D1N, 3D2N, 4D3N) and Start point (Any, Bali, Surabaya, Banyuwangi, Yogyakarta).
- 15 cards, 3 columns: photo, tag (`DURATION · START X`), difficulty, name, route, "from IDR x / pax" (`pricing.from_price_4_pax`: the cheapest option for a group of 4).
- Last row: wide card "Can't find your route?" linking to `/book` (trip = custom).
- Footnote: rates per person, private group of 4, 2026; peak season +20%.

### 6.3 Trip detail (`/trips/[slug]`)
One template fed by `trips.json`.
- **Hero:** breadcrumb, name, four fact cards (Duration, Route, Private group `min-max people`, Difficulty), one summary line (`summary`).
- **Left column:** Itinerary: `overview` paragraphs first (if any), then one glass card per `itinerary[]` entry (chip, title, items of type paragraph / subheading / bullet).
- **Right column:** price card (table by group size, columns from `pricing.columns`, notes, buttons "Book this trip" -> `/book?trip=slug` and "Ask a question" -> WhatsApp), then "Where you'll stay" from `stays[]` (hide if empty).
- **Below:** three cards: Included, Not included, `third_card` (What to bring / Important notes / Things to know). If `third_card.items` is empty, use two columns.
- In development builds, show a visible `[CONFIRM]` marker for every entry in `open_questions`.
- The mockup page for Ijen · Tumpak Sewu · Bromo (Bali start) is hand-condensed; render from the JSON, which holds the full source text.

### 6.4 Booking (`/book`)
Two columns: form (left), live summary (right).
**Form:**
1. Your trip: trip (dropdown of 15 + "custom route", prefilled from `?trip=`), start date, participants (2, 3, 4, "more than 4: special price"; one-day Ijen allows 1-10, Sukamade 1-4, Yogyakarta 2-5 or 2-6 per `group_size`).
2. Stay and pick-up: accommodation (Homestay / Hotel; hide when the trip has no choice), pick-up area (Bali starts: Ubud, Sanur, Kuta/Legian, Denpasar, Lovina, Pemuteran; other starts: hotel or airport in that city, `[CONFIRM]`), hotel name.
3. Your details: full name, WhatsApp number (required, with country code), email (optional).
4. Notes, consent checkbox (link to `/privacy`), submit "Send booking request". Helper text: "No payment now. You get a reference number right away, then our team contacts you on WhatsApp."
**Summary card:** trip photo, name, duration and route, participants, stay, rate per person, **estimated total = rate x participants**, a note on peak season and final quote. For "more than 4" show "special price on request".
**What happens next:** 3 steps (send request and get a reference number; team contacts you on WhatsApp within 24 hours; we confirm availability and send the final quote, no payment until you confirm).

### 6.5 Success pop-up
Modal over the Booking page after a successful submit (artboard `04-book-success-popup`): check icon, "Thank you! We've got your request.", promise "within 24 hours" (`[CONFIRM]`), reference box with **Copy** button, summary (trip, date, participants, stay), primary **Chat with us on WhatsApp** (prefilled text with reference and trip), secondary "Back to trips", note "Keep your reference number. No payment is needed at this step." Focus trap, Esc closes, `role="dialog"`.

### 6.6 FAQ + Terms
Hero, category chips (Booking & payment, Pricing, Before the trip, On the trip, Terms & conditions), 18 Q&A cards in 4 groups, Terms card (6 points). Content: `content/faq.json`. Terms come from the Sukamade document (30% down payment after confirmation or 2 weeks before; full payment on day 1; cancellation H-5 to H-1 non-refundable; no compensation for closures or bad weather; standard equipment only; acceptance by registering). `[CONFIRM]` they apply to all trips. The answer to "How do I book a trip?" must match section 7.

### 6.7 About
Hero (group photo), Our story (one grounded sentence, two `[YOUR STORY]` placeholder boxes, team photo), Why NusaTrails (4 cards), Safety & responsible travel (intro + 5 points), Moments from the trail (5-photo mosaic), closing call to action. Guide profiles and reviews are postponed on purpose.

## 7. Booking and lead pipeline
Principle: a booking is a **request**, not a payment. No slot is held until the team confirms and agrees a down payment.
```
Form submit
  -> POST /api/lead  (Cloudflare Pages Function: validate, honeypot, Turnstile)
  -> Google Apps Script web app (bound to the Sheet)
       1. take a lock  2. create the reference  3. append a row
       4. send a Telegram message  5. return { ok: true, reference }
  -> success pop-up shows the same reference
```
- **Reference:** `NT-YYMMDD-NN` (date + daily counter) created by Apps Script under a lock, never by the browser.
- **Sheet columns / status values:** see `backend/apps-script/Code.gs` (`HEADERS`); status: New, Contacted, Quoted, Confirmed, Deposit paid, Completed, Cancelled, No response.
- **Telegram:** private group with the team and the bot; message has reference, trip, date, people, stay, pick-up, name, notes and a tap-to-chat `wa.me` link. Optional daily 08:00 WIB reminder for rows still `New`.
- **Validation:** WhatsApp in international format (`+` and country code); required fields; participants within range; consent required. Same rules in `lead.ts` and `Code.gs`.
- **Abuse:** Turnstile, honeypot field `website`, Cloudflare rate-limit rule. Fake submissions are an accepted risk; the real protection is operational (no hold before confirmation).
- **Secrets:** only in Cloudflare environment variables and Apps Script properties. The Telegram group is private; the Sheet is shared with the team only.
- **Failure:** keep the form data, show an inline error plus a WhatsApp fallback link. If Telegram fails the row still saves and `telegram_status` records the error.
- **Privacy:** collect only the fields above, consent checkbox, privacy page, no passport data.
Setup instructions: `backend/README.md`. Deploy: `docs/DEPLOY-CLOUDFLARE-PAGES.md`.

## 8. Data and content
`data/trips.json` is the single source for cards, detail pages, the booking dropdown and the price summary. Fields per trip: `id, slug, name, region, duration, start, end, route_label, destinations, difficulty, group_size, summary, pricing {columns, rows, from_price_4_pax, notes, peak_season_surcharge_percent}, overview, itinerary, included, excluded, third_card, stays, photos {hero, card}, open_questions, source_doc`.
**Pricing rules:** per person, by group size; hotel and homestay as separate columns where both exist; Sukamade 3D2N columns are Banyuwangi hotel / Banyuwangi homestay (the Sukamade stay is a homestay in both); one-day Ijen is a single column for 1-10 people; Yogyakarta single column. Peak season (Eid Al-Fitr and New Year, 7 days before to 7 days after) adds 20% on East Java trips. Above the listed maximum: "send a request for a special price".
The text was cleaned (typos, title case, copy-paste errors). Do not re-import from the original Word files.

## 9. Assets and photos
`src/assets/photos` (folders `01_team`, `02_own`, `03_temporary`; 36 photos from the owner and the team, 18 temporary extras) and `data/assets_manifest.json`. Each asset has `status`: `own`, `team_whatsapp_compressed` or `TEMPORARY`, plus `used_on_site`.
- **28 assets are TEMPORARY**; 8 of them are on pages today (Sukamade, Borobudur, Jomblang). Source and licence are unverified, and some show third parties.
- Rules: TEMPORARY assets raise a visible build warning and appear in the launch checklist as "must replace". Files named `DO_NOT_USE_*` are never published.
- Components read photos by manifest key, so replacing a photo means replacing one file. Never inline base64. Do not upscale small sources; design heroes to stay acceptable with 700-1100 px sources until replaced.
- Blur visible licence plates before launch.
- Brand: `logo.jpeg` (repo root) is the logo source; see Brand in section 5. It is not a photo and is not listed in `assets_manifest.json`.
- Still missing: real Sukamade eco-lodge (simple cabins), guests with a guide at Borobudur and Prambanan, Jomblang basecamp, sharper originals, and the "nice to have" list in the manifest.

## 10. SEO, performance, accessibility
- Tab title is `nusatrails.id` on every page (see Brand in section 5). Unique meta description and `og:title` per page. Canonical URLs; Open Graph image per trip; `sitemap.xml`, `robots.txt`.
- JSON-LD: `Organization`, `FAQPage`, and per trip `TouristTrip` or `Product` with `Offer`.
- Lighthouse performance 90+ on desktop and mobile, CLS under 0.1. Preload the hero (LCP). Self-host or preconnect fonts.
- WCAG AA contrast, visible focus states, labelled fields, alt text on all photos, keyboard-operable modal. The decorative hero word can be `aria-hidden`.
- Analytics optional and privacy-friendly; cookie notice only if cookies are used.

## 11. Deploy
Cloudflare Pages + custom domain `nusatrails.id`; full steps in `docs/DEPLOY-CLOUDFLARE-PAGES.md`.

## 12. Suggested build order
1. `git init`, then scaffold Astro + Tailwind v4 + React, `tokens.css`, `Base.astro`, Nav, Footer, WhatsApp button.
2. Load `trips.json`; build `/trips/[slug]` and the price table; verify against 3 sample slugs.
3. Home sections (hero effect last, after the other sections work).
4. `/trips` with filters.
5. Booking form, summary, `/api/lead`, Apps Script, Telegram, success modal (test end to end on a preview URL).
6. FAQ + Terms, About, Privacy placeholder.
7. SEO, images pipeline, accessibility, performance pass.
8. Replace TEMPORARY photos, resolve `[CONFIRM]` items, launch checklist, point the domain.

## 13. Open decisions (`[CONFIRM]`)
1. Reply-time promise in the pop-up (24 hours is a placeholder).
2. Contact data: WhatsApp number, optional public email, Instagram, city. Currently placeholders.
3. About: founder/company story.
4. ~~Tumpak Sewu & Bromo 3D2N: hotel vs homestay columns swapped.~~ **Resolved (owner, 28 Oct):** columns swapped in `trips.json`; hotel is now the higher price. Ijen trolley and Ijen references removed for this trip.
5. ~~Tumpak Sewu · Ijen · Bromo (Surabaya) 4D3N duplicate "4 pax" row.~~ **Resolved (owner, 28 Oct):** only 2, 3 and 4 pax are kept.
6. Yogyakarta: ticket-inclusive vs no-ticket prices; sunrise claim with a 05:00 pick-up; "special access" to the upper terraces; missing durations; Jomblang has no safety, age or fitness information; the source mixed commas and dots in prices (read as millions).
7. Difficulty labels are the designer's assumption.
8. Surabaya to Banyuwangi drive: **6-7 h** (owner, 28 Oct, same as Sukamade). **Resolved:** applied to Ijen & Bromo 3D2N (Surabaya), Tumpak Sewu · Ijen · Bromo 4D3N (Surabaya) Day 1, and the Home note.
9. Terms (down payment, cancellation) come from the Sukamade doc: confirm for all trips.
10. Pick-up area options for non-Bali starts.
11. Privacy policy text.
12. The shared Ijen rate of IDR 385.000 stays hidden (private trips only): confirm.
13. Brand check on `nusatrails.com` ownership.
14. Licence and consent for the TEMPORARY photos.
15. Logo: v1 uses `logo.jpeg` in a cream tile on the dark site. Ask for a transparent light version (SVG or PNG) if the tile looks out of place. Confirm that the tagline "Find your own way" may be used in copy.
16. Brand palette: the logo is deep green and gold on cream, while the mockup is dark with a lime accent (`#b9d44a`). v1 keeps the mockup palette. Confirm with the owner.
17. ~~Tab title.~~ **Resolved (owner, 30 Oct):** every tab shows only `nusatrails.id`.

## 14. Acceptance criteria
1. All routes render and match the mockup on a 1440 px desktop viewport.
2. All 15 trip pages are generated from `trips.json`; prices and itineraries match the JSON exactly.
3. Filters on `/trips` work, combine, and persist in the URL.
4. A booking submit writes one Sheet row, posts to Telegram and shows the pop-up with the same reference as the row.
5. Two simultaneous submits never get the same reference.
6. Invalid WhatsApp numbers, missing consent and out-of-range participant counts are rejected with clear messages.
7. If Telegram or the Sheet fails, the user sees an error with a WhatsApp fallback and nothing is lost silently.
8. The home hero shows the layered title effect, tuned so about the bottom third of the letters is hidden.
9. The floating WhatsApp button and the footer render on every page.
10. TEMPORARY assets are flagged in development builds and listed in the launch checklist.
11. Performance and accessibility targets in section 10 are met.
12. No secret is present in client-side code or in the repository.
13. `logo.jpeg` is used as the header and footer logo, and the browser tab shows the favicon generated from it (`/favicon.ico`) with the title `nusatrails.id` on every page; the logo is never placed directly on the dark background.

## 15. Reading the mockup
- 21 desktop artboards: Home, Trips, Book, Book success pop-up, FAQ, About, and 15 trip pages (the file name equals the slug).
- Mockup render check (Chromium, 1440 px, substituted fonts): every page is within 10 px of its planned height with no clipped sections and no horizontal overflow. Real fonts will change heights slightly; build with flowing layout instead.
- Anchors in the HTML (`#trips`, `#faq`, ...) are prototype placeholders; the real routes are in section 4.
- No mobile mockups exist. Use a single column, a hamburger menu and the same tokens, and review with the owner.
