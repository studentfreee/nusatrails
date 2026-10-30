# Deploy on Cloudflare Pages

1. Put the project in a Git repository (GitHub or GitLab).
2. Cloudflare dashboard > Workers & Pages > Create > Pages > Connect to Git.
3. Framework preset **Astro**. Build command `npm run build`. Output directory `dist`. Node version: set `NODE_VERSION` to the current LTS.
4. The `functions/` folder at the repository root is deployed automatically as Pages Functions (`/api/lead`). No Astro adapter is needed while pages stay static.
5. Settings > Environment variables (Production and Preview): `TURNSTILE_SECRET`, `APPS_SCRIPT_URL`, `APPS_SCRIPT_SECRET`, plus the `PUBLIC_*` variables from `.env.example`.
6. Custom domain **nusatrails.id**: add it under Pages > Custom domains. The simplest setup is to add the domain to Cloudflare and change the nameservers at the Indonesian registrar (a `.id` registrar usually asks for identity verification). Add a redirect from `www` to the apex domain.
7. Cloudflare > Security > WAF > Rate limiting rule for `/api/lead` (for example 5 requests per minute per IP).
8. Add `public/_headers` with security headers and long caching for hashed assets. Add `robots.txt` and the sitemap (Astro sitemap integration).
9. Smoke test on the `*.pages.dev` preview before pointing the domain: submit the form, check the Sheet row, the Telegram message and the pop-up reference number.
10. Launch checklist: replace or remove every asset with status TEMPORARY, fill all `[CONFIRM]` items, real WhatsApp number and Instagram, privacy policy page, favicon and social preview image.

Free-plan limits that matter (checked October 2026): unlimited static bandwidth, 500 builds per month, and 100,000 Pages Functions requests per day. Re-check before launch because limits change.
