// Films by Randy private agreements: Cloudflare Worker entry point.
//
//   GET  /agreement/:id          client page (open or locked)
//   POST /agreement/:id/sign     one-shot signature submit
//   GET  /agreement/:id/pdf      signed PDF (client copy)
//   GET  /admin                  Randy's bookings page
//   *    /api/admin/...          admin JSON API (Bearer ADMIN_TOKEN)

import { createAgreement, getAgreement, listAgreements, listEvents, logEvent, setPaymentStatus, signAgreement, validateNewAgreement } from './db.js';
import { buildAgreementPdf } from './pdf.js';
import { emailClient, emailOwner } from './email.js';
import { renderLocked, renderNotFound, renderOpen } from './render/page.js';
import { renderAdmin } from './render/admin.js';
import { PRIVATE_HEADERS, clean, htmlResponse, json, newNonce, safeEqual, sha256Hex } from './util.js';

const METHODS = ['venmo', 'apple_cash', 'zelle'];

function baseUrl(env, req) {
  return env.PUBLIC_BASE_URL || new URL(req.url).origin;
}

function pdfResponse(bytes, a, inline = true) {
  const name = `Films-by-Randy-Agreement-${a.client_name.replace(/[^A-Za-z0-9]+/g, '-')}.pdf`;
  return new Response(bytes, {
    headers: { ...PRIVATE_HEADERS, 'Content-Type': 'application/pdf', 'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${name}"` },
  });
}

async function handleSign(req, env, ctx, id) {
  const a = await getAgreement(env.DB, id);
  if (!a) return json({ error: 'Not found' }, 404);
  if (a.locked) return json({ error: 'This agreement is already signed and locked.' }, 409);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid request' }, 400); }

  const email = clean(body.client_email, 200);
  const signerName = clean(body.signer_name, 120);
  const type = body.signature_type === 'typed' ? 'typed' : 'drawn';
  const sig = String(body.signature_data || '');
  const choice = body.payment_choice === 'full' && a.allow_pay_in_full ? 'full' : 'deposit';
  const method = METHODS.includes(body.payment_method) ? body.payment_method : null;

  if (body.agree !== true) return json({ error: 'You must agree to the terms.' }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Please enter a valid email.' }, 400);
  if (!signerName) return json({ error: 'Please enter your full name.' }, 400);
  if (type === 'drawn' && (!sig.startsWith('data:image/png;base64,') || sig.length > 400_000)) {
    return json({ error: 'Please draw your signature again.' }, 400);
  }
  if (type === 'typed' && !clean(sig, 120)) return json({ error: 'Please type your signature.' }, 400);
  if (body.payment_sent === true && !method) return json({ error: 'Please choose how you paid.' }, 400);

  const signed = {
    signed_at: new Date().toISOString(),
    signer_ip: req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || 'unknown',
    signer_user_agent: clean(req.headers.get('User-Agent'), 400),
    signer_name: signerName,
    signature_type: type,
    signature_data: type === 'typed' ? clean(sig, 120) : sig,
    terms_sha256: await sha256Hex(JSON.stringify(a.terms)),
    client_email: email,
    venue_address: clean(body.venue_address, 300) || null,
    guest_count: clean(body.guest_count, 40) || null,
    questions: clean(body.questions, 3000) || null,
    payment_choice: choice,
    payment_method: method,
    payment_sent: body.payment_sent === true,
    payment_reference: clean(body.payment_reference, 200) || null,
  };

  if (!(await signAgreement(env.DB, id, signed))) {
    return json({ error: 'This agreement is already signed and locked.' }, 409);
  }
  await logEvent(env.DB, id, 'signed', signed.signer_ip, { ua: signed.signer_user_agent, terms_sha256: signed.terms_sha256 });

  // Emails go out after the response so a slow mail API never blocks signing.
  const fresh = await getAgreement(env.DB, id);
  const url = baseUrl(env, req);
  ctx.waitUntil((async () => {
    const pdf = await buildAgreementPdf(fresh);
    for (const [who, fn] of [['owner', emailOwner], ['client', emailClient]]) {
      try {
        const r = await fn(env, fresh, pdf, url);
        await logEvent(env.DB, id, r?.skipped ? 'email_skipped' : 'email_sent', null, { to: who, id: r?.id });
      } catch (e) {
        console.error(`[email:${who}]`, e);
        await logEvent(env.DB, id, 'email_failed', null, { to: who, error: String(e.message || e).slice(0, 500) });
      }
    }
  })());

  return json({ ok: true });
}

async function handleAdmin(req, env, path) {
  const auth = req.headers.get('Authorization') || '';
  if (!env.ADMIN_TOKEN || !safeEqual(auth, `Bearer ${env.ADMIN_TOKEN}`)) return json({ error: 'Unauthorized' }, 401);

  if (path === '/api/admin/agreements' && req.method === 'GET') {
    const list = await listAgreements(env.DB);
    return json({ agreements: list.map(({ signature_data, terms, terms_json, ...rest }) => rest) });
  }
  if (path === '/api/admin/agreements' && req.method === 'POST') {
    let input;
    try { input = validateNewAgreement(await req.json()); } catch (e) { return json({ error: e.message }, 400); }
    const id = await createAgreement(env.DB, input);
    return json({ id, url: `${baseUrl(env, req)}/agreement/${id}` }, 201);
  }
  let m = path.match(/^\/api\/admin\/agreements\/([a-z0-9]+)\/payment$/);
  if (m && req.method === 'POST') {
    const { status } = await req.json().catch(() => ({}));
    try {
      const ok = await setPaymentStatus(env.DB, m[1], status);
      return ok ? json({ ok: true }) : json({ error: 'Not found or not signed yet' }, 404);
    } catch (e) { return json({ error: e.message }, 400); }
  }
  m = path.match(/^\/api\/admin\/agreements\/([a-z0-9]+)(\/pdf|\/events)?$/);
  if (m && req.method === 'GET') {
    const a = await getAgreement(env.DB, m[1]);
    if (!a) return json({ error: 'Not found' }, 404);
    if (m[2] === '/pdf') return pdfResponse(await buildAgreementPdf(a), a);
    if (m[2] === '/events') return json({ events: await listEvents(env.DB, a.id) });
    return json({ agreement: a, url: `${baseUrl(env, req)}/agreement/${a.id}` });
  }
  return json({ error: 'Not found' }, 404);
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const nonce = newNonce();

    if (path.startsWith('/api/admin')) return handleAdmin(req, env, path);
    if (path === '/admin' && req.method === 'GET') return htmlResponse(renderAdmin(nonce), nonce);

    const m = path.match(/^\/agreement\/([a-z0-9]+)(\/sign|\/pdf)?$/);
    if (m) {
      const [, id, action] = m;
      if (action === '/sign' && req.method === 'POST') return handleSign(req, env, ctx, id);
      const a = await getAgreement(env.DB, id);
      if (!a) return htmlResponse(renderNotFound(nonce), nonce, 404);
      if (action === '/pdf') {
        if (!a.locked) return new Response('Not signed yet', { status: 404, headers: PRIVATE_HEADERS });
        return pdfResponse(await buildAgreementPdf(a), a, false);
      }
      if (!action && req.method === 'GET') {
        if (!a.locked) ctx.waitUntil(logEvent(env.DB, id, 'viewed', req.headers.get('CF-Connecting-IP')));
        return htmlResponse(a.locked ? renderLocked(env, a, nonce) : renderOpen(env, a, nonce), nonce);
      }
    }
    if (path === '/robots.txt') return new Response('User-agent: *\nDisallow: /agreement/\nDisallow: /admin\n');
    return htmlResponse(renderNotFound(nonce), nonce, 404);
  },
};
