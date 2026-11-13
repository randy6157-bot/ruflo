-- Films by Randy: private client agreements (Cloudflare D1)

CREATE TABLE IF NOT EXISTS agreements (
  id                  TEXT PRIMARY KEY,          -- unguessable slug used in the URL
  created_at          TEXT NOT NULL,
  client_name         TEXT NOT NULL,
  client_email        TEXT,
  event_type          TEXT NOT NULL DEFAULT 'Wedding',
  event_date          TEXT NOT NULL,             -- YYYY-MM-DD
  location            TEXT NOT NULL,
  package             TEXT NOT NULL,
  total_cents         INTEGER NOT NULL,
  deposit_cents       INTEGER NOT NULL,
  allow_pay_in_full   INTEGER NOT NULL DEFAULT 1,
  balance_due_date    TEXT NOT NULL,             -- YYYY-MM-DD
  balance_due_note    TEXT,                      -- e.g. "after the wedding"
  details_json        TEXT NOT NULL DEFAULT '[]',-- extra summary lines [{label, value}]
  terms_json          TEXT NOT NULL,             -- frozen terms [{title, body}]

  -- filled in when the client signs (row is locked once signed_at is set)
  signed_at           TEXT,
  signer_ip           TEXT,
  signer_user_agent   TEXT,
  signer_name         TEXT,
  signature_type      TEXT,                      -- 'drawn' | 'typed'
  signature_data      TEXT,                      -- PNG data URL or typed name
  terms_sha256        TEXT,                      -- hash of the exact terms shown at signing
  venue_address       TEXT,
  guest_count         TEXT,
  questions           TEXT,
  payment_choice      TEXT,                      -- 'deposit' | 'full'
  payment_method      TEXT,                      -- 'venmo' | 'apple_cash' | 'zelle'
  payment_sent        INTEGER,
  payment_reference   TEXT,

  -- managed by Randy
  payment_status      TEXT NOT NULL DEFAULT 'awaiting_signature',
                      -- awaiting_signature | deposit_pending | deposit_received | paid_in_full
  deposit_received_at TEXT,
  paid_in_full_at     TEXT
);

-- Append-only audit trail (event sourced): every state change lands here.
CREATE TABLE IF NOT EXISTS agreement_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  agreement_id  TEXT NOT NULL,
  at            TEXT NOT NULL,
  type          TEXT NOT NULL,   -- created | viewed | signed | email_sent | email_failed | payment_status
  ip            TEXT,
  data_json     TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_agreement ON agreement_events(agreement_id, at);
