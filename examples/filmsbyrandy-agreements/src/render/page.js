// The private client agreement page (open for signing, or locked after).

import { esc, longDate, money, stamp } from '../util.js';
import { METHOD_LABELS, paymentOption } from '../payments.js';
import { CSS, FONTS } from './styles.js';
import { PAGE_SCRIPT } from './page-script.js';

function shell(title, body, nonce, script = '') {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#07070c"><title>${esc(title)}</title>${FONTS}<style>${CSS}</style></head>
<body><div class="wrap">
<header class="brand"><a class="logo" href="https://filmsbyrandy.com">FILMS BY <span>RANDY</span></a><span class="tag">Private agreement</span></header>
${body}
<footer class="foot"><div class="sig">Randy</div>Films by Randy &middot; filmsbyrandy.com<br>This page is private to you. Please do not share the link.</footer>
</div>${script ? `<script nonce="${nonce}">${script}</script>` : ''}</body></html>`;
}

function summaryCard(a) {
  const rows = [
    ['Client', a.client_name],
    ['Event', a.event_type],
    ['Date', longDate(a.event_date)],
    ['Location', a.location],
    ['Package', a.package],
    ...a.details.map((d) => [d.label, d.value]),
    ['Deposit', money(a.deposit_cents)],
    ['Balance due', `${money(a.total_cents - a.deposit_cents)} by ${longDate(a.balance_due_date)}`],
  ];
  return `<section class="card rate" aria-labelledby="sum-h">
  <p class="eyebrow" id="sum-h">Your booking</p>
  <span class="pill purple">${esc(a.package.split(',')[0])}</span>
  <div class="total">${money(a.total_cents)}<small>total</small></div>
  <dl class="kv">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
</section>`;
}

function termsCard(a, n) {
  return `<section class="card" aria-labelledby="terms-h">
  <div class="card-h"><span class="step">${n}</span><h2 id="terms-h">The agreement</h2></div>
  <p class="sub">Please read the full agreement before signing.</p>
  <div class="terms" id="terms" tabindex="0">${a.terms.map((t) => `<h3>${esc(t.title)}</h3><p>${esc(t.body)}</p>`).join('')}</div>
  <button type="button" class="link-btn" id="terms-toggle">Show full agreement</button>
</section>`;
}

function detailsCard(a) {
  return `<section class="card" aria-labelledby="det-h">
  <div class="card-h"><span class="step">2</span><h2 id="det-h">A few details</h2></div>
  <p class="sub">Fill in anything you know now. You can always email updates later.</p>
  <label for="client_email">Your email <span class="opt">(for your signed copy)</span></label>
  <input type="email" id="client_email" name="client_email" autocomplete="email" required value="${esc(a.client_email || '')}">
  <label for="venue_address">Venue address</label>
  <input type="text" id="venue_address" name="venue_address" autocomplete="street-address" placeholder="Venue name and street address">
  <label for="guest_count">Guest count <span class="opt">(an estimate is fine)</span></label>
  <input type="text" id="guest_count" name="guest_count" inputmode="numeric" placeholder="e.g. 80 to 85">
  <label for="questions">Questions or concerns <span class="opt">(optional)</span></label>
  <textarea id="questions" name="questions" placeholder="Timeline, must-have shots, anything on your mind"></textarea>
</section>`;
}

function paymentCard(env, a) {
  const dep = paymentOption(env, a, 'deposit');
  const full = paymentOption(env, a, 'full');
  const seg = a.allow_pay_in_full && a.deposit_cents < a.total_cents
    ? `<div class="seg" role="radiogroup" aria-label="How much to pay now">
    <label><input type="radio" name="payment_choice" value="deposit" checked><span class="box"><span>Deposit now</span><b>${dep.amountLabel}</b><span>Balance after the event</span></span></label>
    <label><input type="radio" name="payment_choice" value="full"><span class="box"><span>Pay in full</span><b>${full.amountLabel}</b><span>Nothing due later</span></span></label>
  </div>`
    : '<input type="hidden" name="payment_choice" value="deposit">';
  return `<section class="card" aria-labelledby="pay-h">
  <div class="card-h"><span class="step">3</span><h2 id="pay-h">Payment</h2></div>
  <p class="sub">Pay Randy directly with whichever app you prefer. Your date is reserved once the deposit is confirmed.</p>
  ${seg}
  <div class="due"><span>Due now: <b data-amount>${dep.amountLabel}</b></span><span data-balance>Balance of ${money(a.total_cents - a.deposit_cents)} due by ${longDate(a.balance_due_date)}</span></div>
  <div class="pay"><div class="pay-h"><h3>Venmo</h3><span class="handle">@${esc(dep.venmo.handle)}</span></div>
    <p>Opens Venmo with the amount and note filled in.</p>
    <div class="btn-row"><a class="btn primary" id="venmo-btn" href="${esc(dep.venmo.webUrl)}" target="_blank" rel="noopener">Pay <span data-amount>${dep.amountLabel}</span> on Venmo</a></div></div>
  <div class="pay"><div class="pay-h"><h3>Apple Pay (Apple Cash)</h3></div>
    <ol><li>Open Messages and start a text to <b class="handle">${esc(dep.apple.phone)}</b>.</li>
    <li>Tap the plus button, then Apple Cash.</li><li>Enter <b data-amount>${dep.amountLabel}</b> and send. Add the note <b data-note>${esc(dep.note)}</b>.</li></ol>
    <div class="btn-row"><a class="btn" id="apple-btn" href="${esc(dep.apple.smsUrl)}">Open Messages</a>
    <button type="button" class="btn" data-copy="${esc(dep.apple.phone)}">Copy number</button></div></div>
  <div class="pay"><div class="pay-h"><h3>Zelle</h3><span class="handle">${esc(dep.zelle.id)}</span></div>
    <p>Send <b data-amount>${dep.amountLabel}</b> to ${esc(dep.zelle.name)} from your banking app with the memo <b data-note>${esc(dep.note)}</b>.</p>
    <div class="btn-row"><button type="button" class="btn" data-copy="${esc(dep.zelle.id)}">Copy Zelle ${dep.zelle.id.includes('@') ? 'email' : 'number'}</button></div></div>
  <label class="check"><input type="checkbox" id="payment_sent" name="payment_sent"><span>I have sent my payment</span></label>
  <label for="payment_method">How did you pay?</label>
  <select id="payment_method" name="payment_method"><option value="">Choose one</option>${Object.entries(METHOD_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
  <label for="payment_reference">Payment reference <span class="opt">(optional)</span></label>
  <input type="text" id="payment_reference" name="payment_reference" placeholder="Name on the account or confirmation code">
</section>`;
}

function signCard(a) {
  return `<section class="card" aria-labelledby="sign-h">
  <div class="card-h"><span class="step">4</span><h2 id="sign-h">Sign</h2></div>
  <label for="signer_name">Full legal name</label>
  <input type="text" id="signer_name" name="signer_name" autocomplete="name" value="${esc(a.client_name)}" required>
  <div class="sigtabs" role="tablist" style="margin-top:16px">
    <button type="button" role="tab" aria-selected="true" data-mode="drawn">Draw</button>
    <button type="button" role="tab" aria-selected="false" data-mode="typed">Type</button></div>
  <div id="pad-wrap"><div class="sigpad"><canvas id="pad" aria-label="Signature pad"></canvas><div class="line"></div><div class="hint">Sign above the line</div></div>
    <button type="button" class="link-btn" id="pad-clear">Clear signature</button></div>
  <div id="typed-wrap" hidden><div class="typed-preview" id="typed-preview">${esc(a.client_name)}</div></div>
  <label class="check"><input type="checkbox" id="agree" name="agree" required><span>I agree to the terms of this agreement and understand that signing here is the same as signing on paper.</span></label>
  <p class="err" id="err" role="alert"></p>
  <button type="submit" class="btn primary block" id="submit" style="margin-top:8px">Sign and submit</button>
</section>`;
}

export function renderOpen(env, a, nonce) {
  const dep = paymentOption(env, a, 'deposit');
  const full = paymentOption(env, a, 'full');
  const data = {
    id: a.id,
    options: {
      deposit: { amountLabel: dep.amountLabel, note: dep.note, venmo: dep.venmo.webUrl, venmoApp: dep.venmo.appUrl, sms: dep.apple.smsUrl, balance: `Balance of ${money(a.total_cents - a.deposit_cents)} due by ${longDate(a.balance_due_date)}` },
      full: { amountLabel: full.amountLabel, note: full.note, venmo: full.venmo.webUrl, venmoApp: full.venmo.appUrl, sms: full.apple.smsUrl, balance: 'Nothing due later' },
    },
  };
  const first = a.client_name.split(' ')[0];
  const body = `<p class="eyebrow">${esc(a.event_type)} &middot; ${esc(longDate(a.event_date))}</p>
<h1>Hi ${esc(first)}, let's make it <em>official</em>.</h1>
<p class="lede">Here is everything for your booking with Films by Randy. Review the agreement, add any details, send your deposit, and sign. It takes about five minutes.</p>
${summaryCard(a)}
<form id="agreement-form" novalidate>
${termsCard(a, 1)}${detailsCard(a)}${paymentCard(env, a)}${signCard(a)}
</form><div class="toast" id="toast" role="status"></div>`;
  return shell(`Agreement for ${a.client_name} | Films by Randy`, body, nonce,
    `window.__AGREEMENT__=${JSON.stringify(data).replace(/</g, '\\u003c')};${PAGE_SCRIPT}`);
}

export function statusPill(a) {
  const map = {
    awaiting_signature: ['warn', 'Awaiting signature'],
    deposit_pending: ['warn', 'Deposit pending'],
    deposit_received: ['ok', 'Deposit received'],
    paid_in_full: ['ok', 'Paid in full'],
  };
  const [cls, label] = map[a.payment_status] || map.awaiting_signature;
  return `<span class="pill ${cls}">${label}</span>`;
}

export function renderLocked(env, a, nonce) {
  const opt = paymentOption(env, a, a.payment_choice || 'deposit');
  const sig = a.signature_type === 'drawn'
    ? `<div class="sig-img"><img src="${esc(a.signature_data)}" alt="Signature of ${esc(a.signer_name)}"></div>`
    : `<div class="typed-preview">${esc(a.signature_data)}</div>`;
  const pending = a.payment_status === 'deposit_pending';
  const body = `<div class="notice"><h2>Signed and locked</h2><p class="sub" style="margin:6px 0 0">Thank you, ${esc(a.signer_name)}. This agreement was signed ${esc(stamp(a.signed_at))} and can no longer be edited. A copy was emailed to you.</p></div>
${summaryCard(a)}
<section class="card"><div class="card-h"><h2>Payment</h2></div>
  <p>${statusPill(a)}</p>
  <dl class="kv"><div><dt>Option</dt><dd>${a.payment_choice === 'full' ? 'Pay in full' : 'Deposit'} (${opt.amountLabel})</dd></div>
  <div><dt>Method</dt><dd>${esc(METHOD_LABELS[a.payment_method] || 'Not specified')}</dd></div>
  <div><dt>Marked as sent</dt><dd>${a.payment_sent ? 'Yes' : 'Not yet'}</dd></div></dl>
  ${pending ? `<p class="sub" style="margin-top:14px">Randy will confirm your payment from his ${esc(METHOD_LABELS[a.payment_method] || 'payment')} activity. If you have not sent it yet: Venmo <a href="${esc(opt.venmo.webUrl)}" target="_blank" rel="noopener">@${esc(opt.venmo.handle)}</a>, Apple Cash to ${esc(opt.apple.phone)}, or Zelle to ${esc(opt.zelle.id)}, with the note "${esc(opt.note)}".</p>` : ''}
</section>
<section class="card"><div class="card-h"><h2>Signature</h2></div>${sig}
  <p class="sub" style="margin-top:12px">${esc(a.signer_name)} &middot; ${esc(stamp(a.signed_at))}</p>
  <a class="btn" href="/agreement/${esc(a.id)}/pdf">Download signed PDF</a></section>
${termsCard(a, '')}`.replace('<span class="step"></span>', '');
  return shell(`Signed agreement | Films by Randy`, body, nonce,
    `document.getElementById('terms-toggle').onclick=function(){var t=document.getElementById('terms');t.classList.toggle('open');this.textContent=t.classList.contains('open')?'Collapse agreement':'Show full agreement'};`);
}

export function renderNotFound(nonce) {
  return shell('Not found | Films by Randy',
    '<h1>Link not <em>found</em>.</h1><p class="lede">This agreement link is not valid. Please check the link Randy sent you, or reply to his message.</p>', nonce);
}
