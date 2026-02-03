PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cois (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  business_name TEXT,
  stage TEXT NOT NULL CHECK (stage IN ('NEW_CONTACT', 'INTRO', 'RESCHEDULED', 'ATTORNEY_MEETING', 'DOC_SUBMISSION', 'DOC_SIGNED', 'REFERRING')),
  owner_user_id TEXT,
  notes TEXT,
  last_contact_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  business_name TEXT,
  stage TEXT NOT NULL CHECK (stage IN ('NEW_CONTACT', 'INTRO', 'DOC_PROPOSAL', 'FINALIZED', 'INVOICE_PENDING', 'PAID_CLOSED')),
  deal_size_cents INTEGER NOT NULL DEFAULT 0,
  expected_close_date TEXT,
  owner_user_id TEXT,
  notes TEXT,
  last_contact_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  coi_id TEXT NOT NULL,
  client_id TEXT NOT NULL UNIQUE,
  referred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coi_id) REFERENCES cois(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_activities (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('COI', 'CLIENT')),
  entity_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  subject TEXT,
  from_email TEXT,
  to_email TEXT,
  sent_at TEXT NOT NULL,
  thread_id TEXT,
  snippet TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stage_history (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('COI', 'CLIENT')),
  entity_id TEXT NOT NULL,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by_user_id TEXT,
  reason TEXT,
  changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (changed_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_cois_stage ON cois(stage);
CREATE INDEX IF NOT EXISTS idx_cois_owner ON cois(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_stage ON clients(stage);
CREATE INDEX IF NOT EXISTS idx_clients_owner ON clients(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_expected_close ON clients(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_referrals_coi_id ON referrals(coi_id);
CREATE INDEX IF NOT EXISTS idx_email_entity ON email_activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_stage_history_entity ON stage_history(entity_type, entity_id);
