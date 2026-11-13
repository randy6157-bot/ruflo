// Direct-to-Randy payment options (no processor). Builds links + copy for
// Venmo, Apple Cash, and Zelle for a given amount.

import { amountPlain, money, shortDate } from './util.js';

export const METHOD_LABELS = { venmo: 'Venmo', apple_cash: 'Apple Cash', zelle: 'Zelle' };

export function paymentConfig(env) {
  return {
    venmo: (env.VENMO_HANDLE || '').replace(/^@/, ''),
    applePhone: env.APPLE_CASH_PHONE || '',
    zelle: env.ZELLE_ID || '',
    zelleName: env.ZELLE_NAME || 'Randy',
  };
}

/** Amount owed now for a choice ('deposit' | 'full'). */
export function amountFor(a, choice) {
  return choice === 'full' ? a.total_cents : a.deposit_cents;
}

export function noteFor(a, choice) {
  const label = choice === 'full' ? 'Paid in full' : 'Deposit';
  return `${label}, ${a.client_name}, ${shortDate(a.event_date)}`;
}

function digits(phone) {
  return phone.replace(/[^\d+]/g, '');
}

/** All the links/instructions for one payment option. */
export function paymentOption(env, a, choice) {
  const cfg = paymentConfig(env);
  const cents = amountFor(a, choice);
  const amount = amountPlain(cents);
  const note = noteFor(a, choice);
  const q = (s) => encodeURIComponent(s);
  return {
    choice,
    cents,
    amountLabel: money(cents),
    note,
    venmo: {
      handle: cfg.venmo,
      // Universal link: opens the Venmo app on phones, venmo.com on desktop.
      webUrl: `https://venmo.com/${q(cfg.venmo)}?txn=pay&amount=${amount}&note=${q(note)}`,
      appUrl: `venmo://paycharge?txn=pay&recipients=${q(cfg.venmo)}&amount=${amount}&note=${q(note)}`,
    },
    apple: {
      phone: cfg.applePhone,
      // iOS Messages composer prefilled with the note.
      smsUrl: `sms:${digits(cfg.applePhone)}&body=${q(note)}`,
    },
    zelle: { id: cfg.zelle, name: cfg.zelleName },
  };
}

/** Plain-language instructions (used in emails). */
export function instructionsText(opt) {
  return [
    `Venmo: send ${opt.amountLabel} to @${opt.venmo.handle} with the note "${opt.note}". Link: ${opt.venmo.webUrl}`,
    `Apple Cash: open Messages, start a conversation with ${opt.apple.phone}, tap the plus button, choose Apple Cash, enter ${opt.amountLabel}, and send it with the note "${opt.note}".`,
    `Zelle: in your banking app, send ${opt.amountLabel} to ${opt.zelle.id} (${opt.zelle.name}) with the memo "${opt.note}".`,
  ];
}
