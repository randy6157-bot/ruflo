// Default agreement terms. Built once at creation time and frozen on the
// agreement row, so later edits to this file never change a sent agreement.
// Copy rule: no em dashes.

import { money, longDate } from './util.js';

/**
 * @param {object} a  agreement input (client_name, event_date, location, package,
 *                    total_cents, deposit_cents, balance_due_date, balance_due_note,
 *                    allow_pay_in_full, coverage, team, delivery)
 * @returns {{title: string, body: string}[]}
 */
export function defaultTerms(a) {
  const date = longDate(a.event_date);
  const balance = a.total_cents - a.deposit_cents;
  const team = a.team || 'Randy (video) and Brandon (photography)';
  const delivery = a.delivery || 'Photo gallery within 3 weeks of the event. Wedding film within 6 weeks of the event.';
  const balanceWhen = a.balance_due_note
    ? `${a.balance_due_note}, no later than ${longDate(a.balance_due_date)}`
    : `no later than ${longDate(a.balance_due_date)}`;

  return [
    {
      title: 'The parties',
      body: `This agreement is between Films by Randy ("Films by Randy", "we", "us") and ${a.client_name} ("Client", "you") for coverage of your ${String(a.event_type || 'wedding').toLowerCase()} on ${date} in ${a.location}.`,
    },
    {
      title: 'Services',
      body: `Package: ${a.package}. Coverage is provided by ${team}. Coverage hours run consecutively and include setup time at the first location. Additional coverage on the day can be added if we are available, at a rate we agree on in writing.`,
    },
    {
      title: 'Fees and payment',
      body: `The total fee is ${money(a.total_cents)}. A deposit of ${money(a.deposit_cents)} is due when you sign to reserve your date. The remaining balance of ${money(balance)} is due ${balanceWhen}.${a.allow_pay_in_full ? ` You may also choose to pay the full ${money(a.total_cents)} up front.` : ''} Payments are sent directly to Films by Randy by Venmo, Apple Cash, or Zelle. Your date is officially reserved once we confirm receipt of the deposit.`,
    },
    {
      title: 'Deposit',
      body: 'The deposit holds your date and means we turn away other inquiries for that day. For that reason the deposit is non-refundable, except as described under "If we cannot attend" below.',
    },
    {
      title: 'Guest count and event details',
      body: `Please share your final guest count, venue address, and timeline at least 30 days before the event.${a.guest_note ? ' ' + a.guest_note : ''} Coverage, team size, and pricing are based on the details in this agreement. A significant change in guest count or schedule may require an adjustment that we will agree on together in writing.`,
    },
    {
      title: 'Delivery',
      body: `${delivery} Files are delivered through a private online gallery or download link. Delivery times start the day after the event. Final files are released once the balance is paid in full.`,
    },
    {
      title: 'Creative approach',
      body: 'You are hiring us for our style and judgment. We will work from your shot list and priorities, but we cannot guarantee any specific moment, pose, or person will be captured, especially when venue rules, lighting, weather, or timing are outside our control. Music, editing style, and image selection are made at our creative discretion.',
    },
    {
      title: 'Meals and breaks',
      body: 'For coverage of 6 hours or more, please provide a meal for each team member at about the same time your guests eat, so we are ready the moment the next part of the day begins.',
    },
    {
      title: 'Cancellation and rescheduling',
      body: 'If you cancel, the deposit is kept and any amount paid beyond the deposit is refunded. If you need to change the date, we will move your booking to a new date if we are available, and your deposit carries over once. If we are not available on the new date, the change is treated as a cancellation.',
    },
    {
      title: 'If we cannot attend',
      body: 'If illness, emergency, or circumstances beyond our control prevent a team member from attending, we will do our best to send a qualified replacement. If no replacement is possible, we will refund all payments made for the services we could not provide. Our total liability under this agreement is limited to the amount you have paid us.',
    },
    {
      title: 'Image use',
      body: 'You receive a personal use license to share, print, and enjoy your photos and film. Films by Randy keeps the copyright and may use selected images and clips in our portfolio, website, and social media. If you would prefer we keep your work private, tell us in the questions box and we will respect that.',
    },
    {
      title: 'Whole agreement',
      body: 'This agreement is the full understanding between us. Changes must be agreed in writing (email counts). Signing electronically on this page has the same effect as signing on paper.',
    },
  ];
}
