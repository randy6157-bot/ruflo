// Browser script for the open agreement page, shipped inline (with a CSP nonce).

export const PAGE_SCRIPT = String.raw`
(function(){
  var D = window.__AGREEMENT__, $ = function(s){return document.querySelector(s)}, $$ = function(s){return Array.prototype.slice.call(document.querySelectorAll(s))};
  var form = $('#agreement-form'), err = $('#err'), toast = $('#toast');
  function say(msg){ toast.textContent = msg; toast.classList.add('show'); setTimeout(function(){toast.classList.remove('show')}, 1800); }

  // Terms expand
  $('#terms-toggle').onclick = function(){ var t=$('#terms'); t.classList.toggle('open'); this.textContent = t.classList.contains('open') ? 'Collapse agreement' : 'Show full agreement'; };

  // Payment choice
  var choice = 'deposit';
  function applyChoice(){
    var o = D.options[choice];
    $$('[data-amount]').forEach(function(el){ el.textContent = o.amountLabel; });
    $$('[data-note]').forEach(function(el){ el.textContent = o.note; });
    $('[data-balance]').textContent = o.balance;
    $('#venmo-btn').href = o.venmo; $('#apple-btn').href = o.sms;
  }
  $$('input[name=payment_choice]').forEach(function(r){ r.onchange = function(){ choice = r.value; applyChoice(); }; });

  // Venmo: try the app first on phones, fall back to venmo.com
  var mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  $('#venmo-btn').onclick = function(e){
    if(!mobile) return;
    e.preventDefault(); var o = D.options[choice], left = false;
    document.addEventListener('visibilitychange', function h(){ if(document.hidden){ left = true; document.removeEventListener('visibilitychange', h); } });
    window.location.href = o.venmoApp;
    setTimeout(function(){ if(!left) window.location.href = o.venmo; }, 1400);
    $('#payment_method').value = 'venmo';
  };
  $('#apple-btn').addEventListener('click', function(){ $('#payment_method').value = 'apple_cash'; });

  // Copy buttons
  $$('[data-copy]').forEach(function(b){ b.onclick = function(){
    var v = b.getAttribute('data-copy');
    (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function(){ say('Copied ' + v); }, function(){
      var t=document.createElement('textarea'); t.value=v; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); say('Copied ' + v);
    });
    if (v.indexOf('@') > -1 || b.textContent.indexOf('Zelle') > -1) $('#payment_method').value = 'zelle';
    else $('#payment_method').value = $('#payment_method').value || 'apple_cash';
  }; });

  // Signature: draw or type. Strokes are kept as points (0..1 of the pad) and
  // redrawn synchronously, so mobile resize events (URL bar show/hide) never lose ink.
  var mode = 'drawn', canvas = $('#pad'), ctx = canvas.getContext('2d'), strokes = [], cur = null;
  function paint(c, w, h, lw){
    c.clearRect(0, 0, w, h);
    c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#141428'; c.fillStyle = '#141428';
    strokes.forEach(function(s){
      if (s.length === 1) { c.beginPath(); c.arc(s[0].x * w, s[0].y * h, lw / 2, 0, 7); c.fill(); return; }
      c.beginPath(); c.moveTo(s[0].x * w, s[0].y * h);
      for (var i = 1; i < s.length; i++) c.lineTo(s[i].x * w, s[i].y * h);
      c.stroke();
    });
  }
  function sizePad(){
    var r = canvas.getBoundingClientRect(); if (!r.width) return;
    var dpr = window.devicePixelRatio || 1, W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); paint(ctx, r.width, r.height, 2.6);
  }
  sizePad(); window.addEventListener('resize', sizePad);
  function pt(e){ var r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; }
  canvas.addEventListener('pointerdown', function(e){ e.preventDefault(); canvas.setPointerCapture(e.pointerId); cur = [pt(e)]; strokes.push(cur); sizePad(); });
  canvas.addEventListener('pointermove', function(e){ if (!cur) return; cur.push(pt(e)); sizePad(); });
  ['pointerup','pointercancel'].forEach(function(t){ canvas.addEventListener(t, function(){ cur = null; }); });
  $('#pad-clear').onclick = function(){ strokes = []; sizePad(); };
  $$('.sigtabs button').forEach(function(b){ b.onclick = function(){
    mode = b.getAttribute('data-mode');
    $$('.sigtabs button').forEach(function(x){ x.setAttribute('aria-selected', String(x === b)); });
    $('#pad-wrap').hidden = mode !== 'drawn'; $('#typed-wrap').hidden = mode !== 'typed';
    if (mode === 'drawn') sizePad();
  }; });
  $('#signer_name').oninput = function(){ $('#typed-preview').textContent = this.value || ' '; };

  function signatureData(){
    if (mode === 'typed') return $('#signer_name').value.trim();
    var out = document.createElement('canvas'); out.width = 640; out.height = 180;
    paint(out.getContext('2d'), out.width, out.height, 4);
    return out.toDataURL('image/png');
  }

  form.onsubmit = function(e){
    e.preventDefault(); err.textContent = '';
    var v = function(id){ return ($('#' + id).value || '').trim(); };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('client_email'))) return fail('Please enter your email so we can send your signed copy.', '#client_email');
    if (!v('signer_name')) return fail('Please enter your full name.', '#signer_name');
    if (mode === 'drawn' && !strokes.length) return fail('Please draw your signature, or switch to Type.', '#pad');
    if (!$('#agree').checked) return fail('Please check "I agree to the terms" to continue.', '#agree');
    if ($('#payment_sent').checked && !v('payment_method')) return fail('Please choose how you paid.', '#payment_method');
    var btn = $('#submit'); btn.disabled = true; btn.textContent = 'Submitting...';
    fetch('/agreement/' + D.id + '/sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      client_email: v('client_email'), venue_address: v('venue_address'), guest_count: v('guest_count'), questions: v('questions'),
      payment_choice: choice, payment_sent: $('#payment_sent').checked, payment_method: v('payment_method'), payment_reference: v('payment_reference'),
      signer_name: v('signer_name'), signature_type: mode, signature_data: signatureData(), agree: true
    }) }).then(function(r){ return r.json().then(function(j){ return { ok: r.ok, j: j }; }); }).then(function(res){
      if (!res.ok) throw new Error(res.j.error || 'Something went wrong.');
      window.location.reload();
    }).catch(function(e){ btn.disabled = false; btn.textContent = 'Sign and submit'; fail(e.message || 'Network error. Please try again.'); });
  };
  function fail(msg, sel){ err.textContent = msg; if (sel) { var el = $(sel); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (el.focus) el.focus({ preventScroll: true }); } return false; }
})();
`;
