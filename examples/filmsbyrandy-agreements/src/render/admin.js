// Randy's admin page: list bookings, mark payments received, create new clients.
// Data loads client-side with the admin token, so this HTML holds no client data.

import { CSS, FONTS } from './styles.js';

const ADMIN_CSS = `
.row{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
.row h3{font-size:16px}
.meta{color:var(--muted);font-size:14px;margin:4px 0 0}
.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.actions .btn{min-height:40px;padding:8px 14px;font-size:13px}
.card.hl{box-shadow:0 0 0 2px var(--cyan)}
.grid2{display:grid;grid-template-columns:1fr;gap:0 16px}
@media(min-width:640px){.grid2{grid-template-columns:1fr 1fr}}
.out{word-break:break-all;background:var(--bg2);padding:12px;border-radius:12px;margin-top:12px}
`;

const SCRIPT = String.raw`
(function(){
  var $ = function(s){return document.querySelector(s)};
  var token = ''; try { token = localStorage.getItem('fbr_admin') || ''; } catch(e){}
  function api(path, opts){ opts = opts || {}; opts.headers = Object.assign({ Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, opts.headers || {});
    return fetch(path, opts).then(function(r){ if (r.status === 401) { showLogin(); throw new Error('Wrong token'); } return r; }); }
  function esc(s){ var d=document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function money(c){ return '$' + (c/100).toLocaleString('en-US'); }
  var LABEL = { awaiting_signature:['warn','Awaiting signature'], deposit_pending:['warn','Deposit pending'], deposit_received:['ok','Deposit received'], paid_in_full:['ok','Paid in full'] };
  var METHOD = { venmo:'Venmo', apple_cash:'Apple Cash', zelle:'Zelle' };
  function showLogin(){ $('#login').hidden = false; $('#app').hidden = true; }
  $('#login-form').onsubmit = function(e){ e.preventDefault(); token = $('#token').value.trim(); try{ localStorage.setItem('fbr_admin', token); }catch(e){} load(); };
  $('#logout').onclick = function(){ try{ localStorage.removeItem('fbr_admin'); }catch(e){} token=''; showLogin(); };

  function card(a){
    var s = LABEL[a.payment_status] || LABEL.awaiting_signature, link = location.origin + '/agreement/' + a.id;
    var due = a.payment_choice === 'full' ? a.total_cents : a.deposit_cents;
    var acts = '<button class="btn" data-copy="'+esc(link)+'">Copy link</button><a class="btn" href="/agreement/'+a.id+'" target="_blank" rel="noopener">Open</a>';
    if (a.signed_at) {
      acts += '<button class="btn" data-pdf="'+a.id+'">PDF</button>';
      if (a.payment_status === 'deposit_pending') acts += '<button class="btn primary" data-status="'+(a.payment_choice==='full'?'paid_in_full':'deposit_received')+'" data-id="'+a.id+'">Mark '+(a.payment_choice==='full'?'paid in full':'deposit received')+'</button>';
      if (a.payment_status === 'deposit_received') acts += '<button class="btn primary" data-status="paid_in_full" data-id="'+a.id+'">Mark balance paid</button>';
      if (a.payment_status !== 'deposit_pending') acts += '<button class="btn" data-status="deposit_pending" data-id="'+a.id+'">Undo</button>';
    }
    return '<section class="card" id="'+a.id+'"><div class="row"><div><h3>'+esc(a.client_name)+'</h3><p class="meta">'+esc(a.event_date)+' &middot; '+esc(a.location)+' &middot; '+money(a.total_cents)+'</p></div><span class="pill '+s[0]+'">'+s[1]+'</span></div>'
      + (a.signed_at ? '<p class="meta">Signed '+new Date(a.signed_at).toLocaleString()+' from '+esc(a.signer_ip)+'. Chose '+(a.payment_choice==='full'?'pay in full':'deposit')+' ('+money(due)+') by '+esc(METHOD[a.payment_method]||'unspecified')+(a.payment_sent?', marked sent':', not marked sent')+(a.payment_reference?'. Ref: '+esc(a.payment_reference):'')+'</p>'
        + '<p class="meta">Venue: '+esc(a.venue_address||'-')+' &middot; Guests: '+esc(a.guest_count||'-')+(a.questions?'<br>Questions: '+esc(a.questions):'')+'</p>' : '')
      + '<div class="actions">'+acts+'</div></section>';
  }
  function load(){
    api('/api/admin/agreements').then(function(r){ return r.json(); }).then(function(j){
      $('#login').hidden = true; $('#app').hidden = false;
      $('#list').innerHTML = j.agreements.length ? j.agreements.map(card).join('') : '<p class="sub">No clients yet.</p>';
      var h = location.hash.slice(1); if (h && document.getElementById(h)) { var el = document.getElementById(h); el.classList.add('hl'); el.scrollIntoView({ block: 'center' }); }
    }).catch(function(){});
  }
  document.addEventListener('click', function(e){
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.copy) { navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Copied'; }
    if (b.dataset.status) { b.disabled = true; api('/api/admin/agreements/' + b.dataset.id + '/payment', { method: 'POST', body: JSON.stringify({ status: b.dataset.status }) }).then(load); }
    if (b.dataset.pdf) { api('/api/admin/agreements/' + b.dataset.pdf + '/pdf').then(function(r){ return r.blob(); }).then(function(blob){ var u = URL.createObjectURL(blob); window.open(u, '_blank'); }); }
  });
  $('#new-form').onsubmit = function(e){
    e.preventDefault(); var f = new FormData(e.target), body = {};
    f.forEach(function(v, k){ if (String(v).trim()) body[k] = String(v).trim(); });
    body.allow_pay_in_full = !!f.get('allow_pay_in_full');
    api('/api/admin/agreements', { method: 'POST', body: JSON.stringify(body) }).then(function(r){ return r.json(); }).then(function(j){
      $('#new-out').hidden = false; $('#new-out').textContent = j.error ? 'Error: ' + j.error : 'Link: ' + j.url;
      if (!j.error) { e.target.reset(); load(); }
    });
  };
  if (token) load(); else showLogin();
})();
`;

export function renderAdmin(nonce) {
  const field = (name, label, type = 'text', extra = '') => `<div><label for="${name}">${label}</label><input type="${type}" id="${name}" name="${name}" ${extra}></div>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Bookings | Films by Randy</title>${FONTS}<style>${CSS}${ADMIN_CSS}</style></head>
<body><div class="wrap"><header class="brand"><span class="logo">FILMS BY <span>RANDY</span></span><span class="tag">Bookings</span></header>
<section id="login" class="card" hidden><h2>Sign in</h2><form id="login-form"><label for="token">Admin token</label><input type="text" id="token" autocomplete="current-password" style="-webkit-text-security:disc"><button class="btn primary block" style="margin-top:14px">Continue</button></form></section>
<div id="app" hidden>
<div class="row" style="margin-bottom:18px"><h1 style="font-size:28px">Bookings</h1><button class="btn" id="logout">Sign out</button></div>
<div id="list"></div>
<section class="card"><h2>New client</h2><p class="sub">Creates a private link. Leave terms blank to use the standard agreement.</p>
<form id="new-form"><div class="grid2">
${field('client_name', 'Client name', 'text', 'required')}${field('client_email', 'Client email (optional)', 'email')}
${field('event_type', 'Event type', 'text', 'value="Wedding"')}${field('event_date', 'Event date', 'date', 'required')}
${field('location', 'Location', 'text', 'required')}${field('package', 'Package', 'text', 'required')}
${field('price', 'Total price ($)', 'number', 'required min="0" step="0.01"')}${field('deposit', 'Deposit ($)', 'number', 'required min="0" step="0.01"')}
${field('balance_due_date', 'Balance due date', 'date', 'required')}${field('balance_due_note', 'Balance due note', 'text', 'placeholder="after the wedding"')}
${field('team', 'Team (optional)', 'text', 'placeholder="Randy (video) and Brandon (photography)"')}${field('delivery', 'Delivery (optional)', 'text')}
</div><label class="check"><input type="checkbox" name="allow_pay_in_full" checked><span>Allow paying in full</span></label>
<label for="terms">Custom terms (optional)</label><textarea id="terms" name="terms" placeholder="Title on the first line, paragraph below, blank line between sections"></textarea>
<button class="btn primary block" style="margin-top:14px">Create link</button></form><div class="out" id="new-out" hidden></div></section>
</div></div><script nonce="${nonce}">${SCRIPT}</script></body></html>`;
}
