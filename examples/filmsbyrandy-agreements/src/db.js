// D1 data access + input validation for agreements.

import { defaultTerms } from './terms.js';
import { clean, isoDate, newId } from './util.js';

const PAYMENT_STATUSES = ['awaiting_signature', 'deposit_pending', 'deposit_received', 'paid_in_full'];

export function hydrate(row) {
  if (!row) return null;
  return {
    ...row,
    allow_pay_in_full: !!row.allow_pay_in_full,
    payment_sent: !!row.payment_sent,
    details: JSON.parse(row.details_json || '[]'),
    terms: JSON.parse(row.terms_json || '[]'),
    locked: !!row.signed_at,
  };
}

export async function logEvent(db, agreementId, type, ip = null, data = null) {
  await db
    .prepare('INSERT INTO agreement_events (agreement_id, at, type, ip, data_json) VALUES (?, ?, ?, ?, ?)')
    .bind(agreementId, new Date().toISOString(), type, ip, data ? JSON.stringify(data) : null)
    .run();
}

function toCents(value, field) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${field} must be a positive dollar amount`);
  return Math.round(n * 100);
}

/** Validate the "new client" input Randy provides. Amounts are in dollars. */
export function validateNewAgreement(input) {
  const errors = [];
  const need = (k) => { if (!clean(input[k])) errors.push(`${k} is required`); };
  ['client_name', 'event_date', 'location', 'package', 'price', 'deposit', 'balance_due_date'].forEach(need);
  if (input.event_date && !isoDate(input.event_date)) errors.push('event_date must be YYYY-MM-DD');
  if (input.balance_due_date && !isoDate(input.balance_due_date)) errors.push('balance_due_date must be YYYY-MM-DD');
  if (errors.length) throw new Error(errors.join('; '));

  const total_cents = toCents(input.price, 'price');
  const deposit_cents = toCents(input.deposit, 'deposit');
  if (deposit_cents > total_cents) throw new Error('deposit cannot exceed price');

  const a = {
    client_name: clean(input.client_name, 120),
    client_email: clean(input.client_email, 200) || null,
    event_type: clean(input.event_type, 60) || 'Wedding',
    event_date: input.event_date,
    location: clean(input.location, 200),
    package: clean(input.package, 300),
    total_cents,
    deposit_cents,
    allow_pay_in_full: input.allow_pay_in_full === false ? 0 : 1,
    balance_due_date: input.balance_due_date,
    balance_due_note: clean(input.balance_due_note, 120) || null,
    details: Array.isArray(input.details)
      ? input.details.map((d) => ({ label: clean(d.label, 60), value: clean(d.value, 300) })).filter((d) => d.label && d.value)
      : [],
  };

  let terms = input.terms;
  if (typeof terms === 'string' && terms.trim()) {
    // Plain text terms: blank-line separated paragraphs, first line of each is the title.
    terms = terms.trim().split(/\n\s*\n/).map((block) => {
      const [title, ...rest] = block.trim().split('\n');
      return { title: clean(title, 120), body: clean(rest.join(' '), 5000) };
    });
  }
  if (!Array.isArray(terms) || !terms.length) {
    terms = defaultTerms({ ...a, team: input.team, delivery: input.delivery, guest_note: input.guest_note });
  }
  a.terms = terms.map((t) => ({ title: clean(t.title, 120), body: clean(t.body, 5000) }));
  return a;
}

export async function createAgreement(db, a) {
  const id = newId();
  await db
    .prepare(`INSERT INTO agreements
      (id, created_at, client_name, client_email, event_type, event_date, location, package,
       total_cents, deposit_cents, allow_pay_in_full, balance_due_date, balance_due_note,
       details_json, terms_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, new Date().toISOString(), a.client_name, a.client_email, a.event_type, a.event_date,
      a.location, a.package, a.total_cents, a.deposit_cents, a.allow_pay_in_full, a.balance_due_date,
      a.balance_due_note, JSON.stringify(a.details), JSON.stringify(a.terms))
    .run();
  await logEvent(db, id, 'created');
  return id;
}

export async function getAgreement(db, id) {
  if (!/^[a-z0-9]{6,32}$/.test(id || '')) return null;
  return hydrate(await db.prepare('SELECT * FROM agreements WHERE id = ?').bind(id).first());
}

export async function listAgreements(db) {
  const { results } = await db.prepare('SELECT * FROM agreements ORDER BY event_date ASC').all();
  return results.map(hydrate);
}

/**
 * Lock-in the signature. The WHERE signed_at IS NULL guard makes this a
 * one-shot write even if two submits race.
 * @returns {Promise<boolean>} true if this call signed it, false if already locked
 */
export async function signAgreement(db, id, s) {
  const res = await db
    .prepare(`UPDATE agreements SET
        signed_at = ?, signer_ip = ?, signer_user_agent = ?, signer_name = ?, signature_type = ?,
        signature_data = ?, terms_sha256 = ?, client_email = ?, venue_address = ?, guest_count = ?,
        questions = ?, payment_choice = ?, payment_method = ?, payment_sent = ?, payment_reference = ?,
        payment_status = 'deposit_pending'
      WHERE id = ? AND signed_at IS NULL`)
    .bind(s.signed_at, s.signer_ip, s.signer_user_agent, s.signer_name, s.signature_type,
      s.signature_data, s.terms_sha256, s.client_email, s.venue_address, s.guest_count,
      s.questions, s.payment_choice, s.payment_method, s.payment_sent ? 1 : 0, s.payment_reference, id)
    .run();
  return res.meta.changes === 1;
}

export async function setPaymentStatus(db, id, status) {
  if (!PAYMENT_STATUSES.includes(status)) throw new Error('invalid status');
  const now = new Date().toISOString();
  const res = await db
    .prepare(`UPDATE agreements SET payment_status = ?,
        deposit_received_at = CASE WHEN ? IN ('deposit_received','paid_in_full') THEN COALESCE(deposit_received_at, ?) ELSE NULL END,
        paid_in_full_at = CASE WHEN ? = 'paid_in_full' THEN COALESCE(paid_in_full_at, ?) ELSE NULL END
      WHERE id = ? AND signed_at IS NOT NULL`)
    .bind(status, status, now, status, now, id)
    .run();
  if (res.meta.changes === 1) await logEvent(db, id, 'payment_status', null, { status });
  return res.meta.changes === 1;
}

export async function listEvents(db, id) {
  const { results } = await db
    .prepare('SELECT at, type, ip, data_json FROM agreement_events WHERE agreement_id = ? ORDER BY id ASC')
    .bind(id)
    .all();
  return results;
}
