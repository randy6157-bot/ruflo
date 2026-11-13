#!/usr/bin/env node
// Create a client agreement and print its private link.
//   ADMIN_TOKEN=... node scripts/new-client.mjs clients/maria-vasquez.json [--base https://filmsbyrandy.com]
import { readFile } from 'node:fs/promises';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const baseIdx = args.indexOf('--base');
const base = (baseIdx > -1 ? args[baseIdx + 1] : process.env.BASE_URL) || 'https://filmsbyrandy.com';
const token = process.env.ADMIN_TOKEN;

if (!file || !token) {
  console.error('Usage: ADMIN_TOKEN=... node scripts/new-client.mjs <client.json> [--base URL]');
  process.exit(1);
}

const input = JSON.parse(await readFile(file, 'utf8'));
const res = await fetch(`${base}/api/admin/agreements`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(input),
});
const out = await res.json();
if (!res.ok) {
  console.error('Failed:', out.error || res.status);
  process.exit(1);
}
console.log(`${input.client_name}: ${out.url}`);
