// End-to-end smoke test against `npm run dev` (http://localhost:8787).
//   node test/e2e.mjs <agreement-id> [screenshot-dir]
import { createRequire } from 'node:module';
const { chromium, devices } = createRequire(import.meta.url)('playwright');

const [id, shots = '.'] = process.argv.slice(2);
const base = process.env.BASE_URL || 'http://localhost:8787';
const token = process.env.ADMIN_TOKEN || 'dev-admin-token';
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } console.log('ok -', m); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

await page.goto(`${base}/agreement/${id}`);
assert(await page.getByText('$850').first().isVisible(), 'summary shows total');
await page.screenshot({ path: `${shots}/1-open.png`, fullPage: true });

// Pay-in-full toggles amounts + Venmo link
await page.locator('input[value=full]').check({ force: true });
assert((await page.locator('#venmo-btn').getAttribute('href')).includes('amount=850'), 'venmo link updates to 850');
await page.locator('input[value=deposit]').check({ force: true });
const venmo = await page.locator('#venmo-btn').getAttribute('href');
assert(venmo.includes('amount=425') && venmo.includes('note=Deposit%2C%20Maria%20Vasquez%2C%20Mar%2020%202027'), 'venmo link has deposit + note');

// Only the chosen method's instructions show
assert(!(await page.locator('.pay[data-method]').first().isVisible()) && !(await page.locator('#payment_sent').isVisible()), 'no payment instructions before choosing');
await page.selectOption('#payment_method', 'zelle');
assert(await page.locator('.pay[data-method=zelle]').isVisible() && !(await page.locator('.pay[data-method=venmo]').isVisible()), 'choosing Zelle shows only Zelle');
assert(await page.locator('.qr img').evaluate((i) => i.complete && i.naturalWidth > 0), 'Zelle QR image loads');
await page.locator('section:has(#pay-h)').screenshot({ path: `${shots}/payment-zelle.png` });
await page.selectOption('#payment_method', 'venmo');
assert(await page.locator('#venmo-btn').isVisible(), 'choosing Venmo shows the Venmo button');
// Validation: submitting without agreeing fails
await page.fill('#client_email', 'maria@example.com');
await page.locator('#submit').click();
assert((await page.locator('#err').textContent()).length > 0, 'blocks submit without signature');

await page.fill('#venue_address', '123 Example Rd, Danvers, MA');
await page.fill('#guest_count', '82');
await page.fill('#questions', 'Can we do a first look?');
await page.locator('#payment_sent').check();
await page.fill('#payment_reference', '@maria-v');
await page.locator('#pad').scrollIntoViewIfNeeded();
const box = await page.locator('#pad').boundingBox();
await page.mouse.move(box.x + 30, box.y + 120); await page.mouse.down();
for (let i = 0; i < 20; i++) await page.mouse.move(box.x + 30 + i * 12, box.y + 120 - Math.sin(i / 2) * 40);
await page.mouse.up();
await page.locator('#agree').check();
// Mobile browsers fire resize when the URL bar hides; ink must survive it.
await page.setViewportSize({ width: 390, height: 600 });
await page.setViewportSize({ width: 390, height: 664 });
await page.screenshot({ path: `${shots}/2-filled.png`, fullPage: true });
await Promise.all([page.waitForNavigation(), page.locator('#submit').click()]);
assert(await page.getByText('Signed and locked').isVisible(), 'page is locked after signing');
const inked = await page.locator('.sig-img img').evaluate((img) => {
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  return x.getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0);
});
assert(inked, 'stored signature contains ink after resizes');
await page.screenshot({ path: `${shots}/3-locked.png`, fullPage: true });

// Second submit is rejected
const again = await fetch(`${base}/agreement/${id}/sign`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agree: true }) });
assert(again.status === 409, 're-sign rejected with 409');

const pdf = await fetch(`${base}/agreement/${id}/pdf`);
const bytes = new Uint8Array(await pdf.arrayBuffer());
assert(pdf.status === 200 && new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-', 'signed PDF downloads');
await import('node:fs').then((fs) => fs.writeFileSync(`${shots}/agreement.pdf`, bytes));

// Admin
assert((await fetch(`${base}/api/admin/agreements`)).status === 401, 'admin API requires token');
const admin = await browser.newPage({ viewport: { width: 420, height: 900 } });
await admin.goto(`${base}/admin#${id}`);
await admin.fill('#token', token); await admin.locator('#login-form button').click();
const card = admin.locator(`[id="${id}"]`);
await card.getByText('Mark deposit received').click();
await card.getByText('Deposit received', { exact: true }).waitFor();
assert(true, 'admin marked deposit received');
await admin.screenshot({ path: `${shots}/4-admin.png`, fullPage: true });

const ev = await (await fetch(`${base}/api/admin/agreements/${id}/events`, { headers: { Authorization: `Bearer ${token}` } })).json();
assert(ev.events.map((e) => e.type).join(',').includes('signed'), `audit trail: ${ev.events.map((e) => e.type).join(', ')}`);
assert(errors.length === 0, `no browser errors ${errors.join(' | ')}`);
await browser.close();
