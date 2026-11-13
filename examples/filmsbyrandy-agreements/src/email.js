// Transactional email through Resend (https://resend.com/docs/api-reference/emails/send-email).

import { bytesToBase64, esc, longDate, money, stamp } from './util.js';
import { METHOD_LABELS, instructionsText, paymentOption } from './payments.js';

async function send(env, msg) {
  if (!env.RESEND_API_KEY) {
    console.log('[email] RESEND_API_KEY not set, skipping send to', msg.to);
    return { skipped: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.FROM_EMAIL, ...msg }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return res.json();
}

const wrap = (inner) => `<!doctype html><html><body style="margin:0;background:#07070c;padding:24px 12px;font-family:Manrope,Helvetica,Arial,sans-serif;color:#f2f2f7">
<div style="max-width:560px;margin:0 auto;background:#11111c;border:1px solid #23233a;border-radius:20px;padding:28px 22px">
<div style="font:800 13px Helvetica,Arial;letter-spacing:.08em;color:#c084fc;margin-bottom:18px">FILMS BY RANDY</div>${inner}
<div style="margin-top:28px;padding-top:16px;border-top:1px solid #23233a;color:#6b6b85;font-size:12px">Films by Randy &middot; filmsbyrandy.com</div></div></body></html>`;

const row = (k, v) => `<tr><td style="padding:7px 12px 7px 0;color:#9a9ab2;font-size:14px;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:7px 0;font-size:14px;font-weight:600">${esc(v || '-')}</td></tr>`;

function fileName(a) {
  return `Films-by-Randy-Agreement-${a.client_name.replace(/[^A-Za-z0-9]+/g, '-')}.pdf`;
}

/** Email Randy: full details + signed PDF + one-click confirm link. */
export async function emailOwner(env, a, pdfBytes, baseUrl) {
  const opt = paymentOption(env, a, a.payment_choice);
  const html = wrap(`<h1 style="font:700 22px Helvetica,Arial;margin:0 0 6px">${esc(a.client_name)} signed</h1>
<p style="color:#9a9ab2;margin:0 0 18px">${esc(a.event_type)} on ${esc(longDate(a.event_date))} in ${esc(a.location)}</p>
<table style="border-collapse:collapse;width:100%">
${row('Package', a.package)}${row('Total', money(a.total_cents))}
${row('Payment option', `${a.payment_choice === 'full' ? 'Pay in full' : 'Deposit'} (${opt.amountLabel})`)}
${row('Method chosen', METHOD_LABELS[a.payment_method] || 'Not specified')}
${row('Client marked sent', a.payment_sent ? 'Yes' : 'No')}${row('Reference', a.payment_reference)}
${row('Look for note', opt.note)}
${row('Email', a.client_email)}${row('Venue address', a.venue_address)}${row('Guest count', a.guest_count)}
${row('Questions', a.questions)}
${row('Signed', stamp(a.signed_at))}${row('IP address', a.signer_ip)}</table>
<p style="margin:22px 0 10px;color:#fbbf24;font-weight:700">Status: deposit pending</p>
<p style="color:#9a9ab2;font-size:14px;margin:0 0 16px">Check your ${esc(METHOD_LABELS[a.payment_method] || 'Venmo, Apple Cash, or Zelle')} activity for ${esc(opt.amountLabel)}, then confirm it here:</p>
<a href="${esc(baseUrl)}/admin#${esc(a.id)}" style="display:inline-block;background:linear-gradient(120deg,#a855f7,#22d3ee);color:#07070c;text-decoration:none;font-weight:800;padding:13px 20px;border-radius:999px">Mark payment received</a>
<p style="color:#6b6b85;font-size:12px;margin:16px 0 0">Client page: ${esc(baseUrl)}/agreement/${esc(a.id)}</p>`);
  return send(env, {
    to: [env.OWNER_EMAIL],
    reply_to: a.client_email || undefined,
    subject: `Signed: ${a.client_name}, ${longDate(a.event_date)} (deposit pending)`,
    html,
    attachments: [{ filename: fileName(a), content: bytesToBase64(pdfBytes) }],
  });
}

/** Email the client: confirmation + their copy + payment instructions. */
export async function emailClient(env, a, pdfBytes, baseUrl) {
  if (!a.client_email) return { skipped: true };
  const opt = paymentOption(env, a, a.payment_choice);
  const first = a.client_name.split(' ')[0];
  const balance = a.payment_choice === 'full'
    ? 'You chose to pay in full, so nothing will be due later.'
    : `The remaining ${money(a.total_cents - a.deposit_cents)} is due by ${longDate(a.balance_due_date)}.`;
  const html = wrap(`<h1 style="font:700 22px Helvetica,Arial;margin:0 0 10px">Thank you, ${esc(first)}!</h1>
<p style="color:#d4d4e2;margin:0 0 18px">Your agreement for ${esc(longDate(a.event_date))} is signed. Your signed copy is attached as a PDF.</p>
<table style="border-collapse:collapse;width:100%">${row('Date', longDate(a.event_date))}${row('Location', a.location)}${row('Package', a.package)}${row('Total', money(a.total_cents))}${row('Due now', opt.amountLabel)}</table>
<h2 style="font:700 16px Helvetica,Arial;margin:22px 0 8px;color:#67e8f9">Payment</h2>
<p style="color:#d4d4e2;font-size:14px;margin:0 0 10px">${a.payment_sent ? `Thanks for sending your payment by ${esc(METHOD_LABELS[a.payment_method] || 'your chosen method')}. Randy will confirm it shortly and your date will be officially reserved.` : `Your date is reserved once your ${esc(opt.amountLabel)} payment is received. You can pay any of these ways:`}</p>
${a.payment_sent ? '' : `<ul style="color:#d4d4e2;font-size:14px;padding-left:18px;margin:0 0 10px">${instructionsText(opt).map((t) => `<li style="margin-bottom:6px">${esc(t)}</li>`).join('')}</ul>`}
<p style="color:#d4d4e2;font-size:14px;margin:0 0 18px">${esc(balance)}</p>
<a href="${esc(baseUrl)}/agreement/${esc(a.id)}" style="color:#67e8f9">View your agreement online</a>
<p style="color:#9a9ab2;font-size:14px;margin:18px 0 0">Questions? Just reply to this email.</p>`);
  return send(env, {
    to: [a.client_email],
    reply_to: env.OWNER_EMAIL,
    subject: `Your Films by Randy agreement for ${longDate(a.event_date)}`,
    html,
    attachments: [{ filename: fileName(a), content: bytesToBase64(pdfBytes) }],
  });
}
