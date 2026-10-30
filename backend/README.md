# Lead pipeline setup (owner + developer)

Flow: website form -> `functions/api/lead.ts` (Cloudflare Pages Function: validation + Turnstile) -> Google Apps Script web app (`Code.gs`) -> Google Sheet row + Telegram message -> web app returns the reference number -> website shows the success pop-up.

## 1. Google Sheet + script
1. Create a new Google Sheet "NusaTrails requests". Share it only with the team.
2. Extensions > Apps Script. Replace the editor content with `backend/apps-script/Code.gs`.
3. Run `setup()` once (accept permissions). It creates the `Requests` sheet, headers, plain-text format and three script properties.
4. Project Settings > Script properties: set `SHARED_SECRET` (long random string), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
5. Deploy > New deployment > type **Web app**; Execute as **Me**; Who has access **Anyone**. Copy the `/exec` URL (this is `APPS_SCRIPT_URL`).
6. Optional: Triggers > add `dailyReminder`, time-driven, every day around 08:00.

## 2. Telegram
1. In Telegram, talk to **@BotFather**, `/newbot`, copy the token.
2. Create a **private** group with the team, add the bot, send any message.
3. Open `https://api.telegram.org/bot<TOKEN>/getUpdates` and read the group `chat.id` (a negative number).

## 3. Cloudflare Turnstile
Cloudflare dashboard > Turnstile > add a widget for `nusatrails.id` (and `*.pages.dev` for previews). Put the **site key** in `PUBLIC_TURNSTILE_SITE_KEY` and the **secret** in `TURNSTILE_SECRET`.

## 4. Test
`curl -X POST "$APPS_SCRIPT_URL" -H "content-type: text/plain" -d '{"secret":"...","type":"question","full_name":"Test","whatsapp":"+628123456789","consent":true}'` should return `{"ok":true,"reference":"NT-YYMMDD-01"}`, add a row and send a Telegram message. Delete test rows afterwards.

## Notes
- Apps Script web apps answer a POST with a redirect; `fetch` with `redirect: "follow"` handles it (already done in `lead.ts`). Do not call the web app straight from the browser.
- Secrets live only in Script Properties and Cloudflare environment variables, never in front-end code.
- Daily email/URL-fetch quotas in Apps Script are limited; the volume of a small tour business is far below them.
