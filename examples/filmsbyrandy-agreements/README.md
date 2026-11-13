# Films by Randy: private client agreements

Private, unguessable agreement pages at `filmsbyrandy.com/agreement/<id>`, running as a
Cloudflare Worker (D1 database) with email through Resend. The Worker only handles
`/agreement/*`, `/admin*`, and `/api/admin/*`; the rest of filmsbyrandy.com is untouched.

## What happens

1. You create a client (admin page or `npm run new-client`) and get a link like
   `https://filmsbyrandy.com/agreement/fsnbskhwmvsd` (12 random characters, about 60 bits).
2. The client reviews the summary and the agreement, fills in details, pays you directly
   (Venmo, Apple Cash, or Zelle), signs (draw or type), checks "I agree", and submits.
3. On submit:
   - the row is locked (a one-shot DB update; resubmits get a 409)
   - timestamp, IP (`CF-Connecting-IP`), user agent, and a SHA-256 of the exact terms are stored
   - status becomes **deposit pending**
   - you get an email with all details, the payment method, and the signed PDF
   - the client gets a confirmation with their PDF and payment instructions
4. You check your Venmo, Apple Cash, or Zelle activity, then tap **Mark payment received**
   (button in your email, or `filmsbyrandy.com/admin`).

Every state change is also written to the append-only `agreement_events` table.

## One-time setup

You need: the filmsbyrandy.com DNS zone on Cloudflare, and a Resend account with
filmsbyrandy.com verified as a sending domain.

```bash
npm install
npx wrangler login
npx wrangler d1 create filmsbyrandy-agreements   # paste database_id into wrangler.toml
npm run db:init                                  # creates tables (remote)
```

Edit `[vars]` in `wrangler.toml`: `VENMO_HANDLE`, `APPLE_CASH_PHONE`, `ZELLE_ID`,
`ZELLE_NAME`, `FROM_EMAIL` (must be on your Resend-verified domain), and `OWNER_EMAIL`.

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put ADMIN_TOKEN      # long random string, e.g. `openssl rand -hex 24`
npm run deploy
```

Optional extra lock: put `/admin*` and `/api/admin/*` behind Cloudflare Access (Zero Trust,
one-time PIN to your Gmail) in addition to the token.

## Creating a client

Admin page: open `https://filmsbyrandy.com/admin`, enter your token, and fill in **New client**.

Command line: write a JSON file like `clients/maria-vasquez.json`, then

```bash
ADMIN_TOKEN=... npm run new-client -- clients/maria-vasquez.json
# Maria Vasquez: https://filmsbyrandy.com/agreement/xxxxxxxxxxxx
```

Fields: `client_name`, `event_date` (YYYY-MM-DD), `location`, `package`, `price`, `deposit`,
`balance_due_date`, plus optional `client_email`, `event_type`, `balance_due_note`,
`allow_pay_in_full`, `team`, `delivery`, `guest_note`, `details` (extra summary rows), and
`terms`. Leave `terms` out to use the standard agreement in `src/terms.js`. Terms are copied
onto the agreement when it is created, so editing the template later never changes a link
you already sent.

## Local development

```bash
cp .dev.vars.example .dev.vars
npm run db:init:local
npm run dev                                   # http://localhost:8787
ADMIN_TOKEN=dev-admin-token npm run new-client -- clients/maria-vasquez.json --base http://localhost:8787
node test/e2e.mjs <id-from-above>             # browser smoke test (needs Playwright)
```

Without `RESEND_API_KEY`, emails are skipped and logged.
