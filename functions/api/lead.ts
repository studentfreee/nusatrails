// Cloudflare Pages Function: POST /api/lead
// Validates the request, checks Turnstile, forwards to the Apps Script web app, returns the reference number.
// Needs @cloudflare/workers-types for the PagesFunction type (or replace it with a plain type).

interface Env {
  TURNSTILE_SECRET: string;
  APPS_SCRIPT_URL: string;
  APPS_SCRIPT_SECRET: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let d: any;
  try { d = await request.json(); } catch { return json({ ok: false, error: 'invalid_json' }, 400); }

  // Honeypot: real users never fill this hidden field. Pretend success.
  if (d.website) return json({ ok: true, reference: 'NT-000000-00' });

  const type = d.type === 'question' ? 'question' : 'booking';
  const cleanPhone = String(d.whatsapp ?? '').replace(/[\s\-()]/g, '');
  if (!d.full_name || String(d.full_name).length > 100) return fail('bad_name');
  if (!/^\+?[1-9]\d{7,14}$/.test(cleanPhone)) return fail('bad_whatsapp');
  if (d.consent !== true && type === 'booking') return fail('no_consent');
  if (String(d.notes ?? '').length > 1000) return fail('notes_too_long');
  if (type === 'booking') {
    if (!d.trip_slug) return fail('no_trip');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.start_date ?? ''))) return fail('bad_date');
    const n = parseInt(d.participants, 10);
    if (!(n >= 1 && n <= 20)) return fail('bad_participants');
  }

  // Turnstile (invisible bot check - checked when TURNSTILE_SECRET is configured)
  if (env?.TURNSTILE_SECRET) {
    const form = new FormData();
    form.append('secret', env.TURNSTILE_SECRET);
    form.append('response', String(d.turnstile_token ?? ''));
    const ip = request.headers.get('CF-Connecting-IP');
    if (ip) form.append('remoteip', ip);
    const check: any = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form })
      .then((r) => r.json()).catch(() => ({ success: false }));
    if (!check.success) return fail('bot_check_failed');
  }

  // If APPS_SCRIPT_URL is not set (e.g. local dev / testing), generate reference directly
  if (!env?.APPS_SCRIPT_URL) {
    const today = new Date();
    const yy = String(today.getFullYear()).slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return json({ ok: true, reference: `NT-${yy}${mm}${dd}-01` });
  }

  const payload = {
    secret: env.APPS_SCRIPT_SECRET, type, consent: true,
    trip_slug: d.trip_slug, trip_name: d.trip_name, start_date: d.start_date, participants: d.participants,
    accommodation: d.accommodation, pickup_area: d.pickup_area, hotel_name: d.hotel_name,
    full_name: d.full_name, whatsapp: cleanPhone, email: d.email, notes: d.notes, source_page: d.source_page,
  };
  try {
    const res = await fetch(env.APPS_SCRIPT_URL, {
      method: 'POST', redirect: 'follow',
      headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload),
    });
    const out: any = await res.json().catch(() => null);
    if (!res.ok || !out?.ok) return json({ ok: false, error: 'upstream_failed' }, 502);
    return json({ ok: true, reference: out.reference });
  } catch {
    return json({ ok: false, error: 'upstream_failed' }, 502);
  }
};
