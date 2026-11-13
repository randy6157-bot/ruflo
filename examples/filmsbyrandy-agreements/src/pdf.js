// Signed agreement PDF (pdf-lib, runs inside the Worker).

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { longDate, money, stamp } from './util.js';
import { METHOD_LABELS, amountFor } from './payments.js';

// Standard PDF fonts only support WinAnsi; normalize anything else.
function ascii(text) {
  return String(text ?? '')
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-').replace(/…/g, '...').replace(/ /g, ' ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E¡-ÿ]/g, '');
}

const INK = rgb(0.08, 0.08, 0.14);
const MUTED = rgb(0.42, 0.42, 0.52);
const PURPLE = rgb(0.56, 0.27, 0.86);

export async function buildAgreementPdf(a) {
  const doc = await PDFDocument.create();
  doc.setTitle(`Films by Randy agreement - ${ascii(a.client_name)}`);
  doc.setAuthor('Films by Randy');
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  const W = 612, H = 792, M = 54, LW = W - M * 2;
  let page, y;
  const newPage = () => {
    page = doc.addPage([W, H]); y = H - M;
    page.drawText('FILMS BY RANDY', { x: M, y: H - 30, size: 8, font: bold, color: PURPLE });
    page.drawText(`Agreement ${a.id}`, { x: W - M - font.widthOfTextAtSize(`Agreement ${a.id}`, 8), y: H - 30, size: 8, font, color: MUTED });
  };
  const ensure = (h) => { if (y - h < M) newPage(); };
  const wrap = (text, f, size, width) => {
    const lines = [];
    for (const para of ascii(text).split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/)) {
        const test = line ? `${line} ${word}` : word;
        if (f.widthOfTextAtSize(test, size) > width && line) { lines.push(line); line = word; } else line = test;
      }
      lines.push(line);
    }
    return lines;
  };
  const para = (text, { f = font, size = 10, color = INK, gap = 4, indent = 0 } = {}) => {
    for (const line of wrap(text, f, size, LW - indent)) {
      ensure(size + 3);
      page.drawText(line, { x: M + indent, y: y - size, size, font: f, color });
      y -= size + 3;
    }
    y -= gap;
  };
  const rule = () => { ensure(12); page.drawLine({ start: { x: M, y: y - 4 }, end: { x: W - M, y: y - 4 }, thickness: 0.6, color: rgb(0.85, 0.85, 0.9) }); y -= 14; };
  const kv = (rows) => {
    for (const [k, v] of rows) {
      const lines = wrap(v || '-', font, 10, LW - 140);
      ensure(lines.length * 13 + 2);
      page.drawText(ascii(k), { x: M, y: y - 10, size: 10, font: bold, color: MUTED });
      lines.forEach((l, i) => page.drawText(l, { x: M + 140, y: y - 10 - i * 13, size: 10, font, color: INK }));
      y -= lines.length * 13 + 4;
    }
    y -= 6;
  };

  newPage();
  para('Client Agreement', { f: bold, size: 22, gap: 2 });
  para(`${a.event_type} coverage for ${a.client_name}`, { size: 12, color: MUTED, gap: 10 });
  rule();
  para('Summary', { f: bold, size: 13, color: PURPLE });
  kv([
    ['Client', a.client_name],
    ['Event date', longDate(a.event_date)],
    ['Location', a.location],
    ['Package', a.package],
    ...a.details.map((d) => [d.label, d.value]),
    ['Total', money(a.total_cents)],
    ['Deposit', money(a.deposit_cents)],
    ['Balance due', `${money(a.total_cents - a.deposit_cents)} by ${longDate(a.balance_due_date)}`],
  ]);
  rule();
  para('Terms', { f: bold, size: 13, color: PURPLE });
  a.terms.forEach((t, i) => {
    para(`${i + 1}. ${t.title}`, { f: bold, size: 10.5, gap: 1 });
    para(t.body, { size: 10, gap: 8 });
  });

  if (a.signed_at) {
    rule();
    para('Client details', { f: bold, size: 13, color: PURPLE });
    kv([
      ['Email', a.client_email],
      ['Venue address', a.venue_address],
      ['Guest count', a.guest_count],
      ['Questions', a.questions],
    ]);
    para('Payment', { f: bold, size: 13, color: PURPLE });
    kv([
      ['Option', `${a.payment_choice === 'full' ? 'Pay in full' : 'Deposit'} (${money(amountFor(a, a.payment_choice))})`],
      ['Method', METHOD_LABELS[a.payment_method] || 'Not specified'],
      ['Client marked sent', a.payment_sent ? 'Yes' : 'No'],
      ['Reference', a.payment_reference],
      ['Status', a.payment_status === 'deposit_pending' ? 'Deposit pending (awaiting confirmation by Films by Randy)' : a.payment_status.replace(/_/g, ' ')],
    ]);
    ensure(170);
    para('Signature', { f: bold, size: 13, color: PURPLE });
    if (a.signature_type === 'drawn' && a.signature_data?.startsWith('data:image/png;base64,')) {
      const png = await doc.embedPng(a.signature_data.split(',')[1]);
      const scale = Math.min(240 / png.width, 80 / png.height);
      page.drawImage(png, { x: M, y: y - png.height * scale, width: png.width * scale, height: png.height * scale });
      y -= png.height * scale + 4;
    } else {
      page.drawText(ascii(a.signature_data), { x: M, y: y - 26, size: 24, font: italic, color: INK });
      y -= 32;
    }
    page.drawLine({ start: { x: M, y }, end: { x: M + 260, y }, thickness: 0.8, color: INK });
    y -= 6;
    para(`${a.signer_name} (${a.signature_type === 'drawn' ? 'drawn' : 'typed'} electronic signature)`, { size: 9.5 });
    para(`Signed ${stamp(a.signed_at)} (${a.signed_at} UTC)`, { size: 8.5, color: MUTED, gap: 0 });
    para(`IP address ${a.signer_ip || 'unknown'}`, { size: 8.5, color: MUTED, gap: 0 });
    para(`Terms fingerprint (SHA-256) ${a.terms_sha256}`, { size: 7.5, color: MUTED, gap: 0 });
    para(`Agreed to terms: yes`, { size: 8.5, color: MUTED });
  }
  return doc.save();
}
