PRAGMA foreign_keys = OFF;

CREATE TABLE cois_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  business_name TEXT,
  stage TEXT NOT NULL CHECK (stage IN ('INTRO_SCHEDULED', 'NO_SHOW', 'RESCHEDULE', 'INTRO_COMPLETED', 'ATTORNEY_SCHEDULED', 'ATTORNEY_COMPLETED', 'DOCS_SENT', 'DOCS_SIGNED', 'WON_REFERRING', 'LOST')),
  owner_user_id TEXT,
  notes TEXT,
  last_contact_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

INSERT INTO cois_new (
  id, name, email, phone, business_name, stage, owner_user_id, notes, last_contact_at, created_at, updated_at
)
SELECT
  id,
  name,
  email,
  phone,
  business_name,
  CASE stage
    WHEN 'NEW_CONTACT' THEN 'INTRO_SCHEDULED'
    WHEN 'INTRO' THEN 'INTRO_COMPLETED'
    WHEN 'RESCHEDULED' THEN 'RESCHEDULE'
    WHEN 'ATTORNEY_MEETING' THEN 'ATTORNEY_COMPLETED'
    WHEN 'DOC_SUBMISSION' THEN 'DOCS_SENT'
    WHEN 'DOC_SIGNED' THEN 'DOCS_SIGNED'
    WHEN 'REFERRING' THEN 'WON_REFERRING'
    ELSE 'INTRO_SCHEDULED'
  END,
  owner_user_id,
  notes,
  last_contact_at,
  created_at,
  updated_at
FROM cois;

DROP TABLE cois;
ALTER TABLE cois_new RENAME TO cois;

CREATE INDEX IF NOT EXISTS idx_cois_stage ON cois(stage);
CREATE INDEX IF NOT EXISTS idx_cois_owner ON cois(owner_user_id);

CREATE TABLE clients_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  business_name TEXT,
  stage TEXT NOT NULL CHECK (stage IN ('REFERRED', 'CONTACTED', 'ATTORNEY_SCHEDULED', 'NO_SHOW', 'RESCHEDULE', 'ATTORNEY_COMPLETED', 'PROP_SENT_REVIEW', 'CONTRACT_SENT', 'WON_INVOICE_OPEN', 'CLOSED_PAID', 'CLOSED_LOST')),
  deal_size_cents INTEGER NOT NULL DEFAULT 0,
  expected_close_date TEXT,
  owner_user_id TEXT,
  notes TEXT,
  last_contact_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

INSERT INTO clients_new (
  id, name, email, phone, business_name, stage, deal_size_cents, expected_close_date, owner_user_id, notes, last_contact_at, created_at, updated_at
)
SELECT
  id,
  name,
  email,
  phone,
  business_name,
  CASE stage
    WHEN 'NEW_CONTACT' THEN 'REFERRED'
    WHEN 'INTRO' THEN 'CONTACTED'
    WHEN 'DOC_PROPOSAL' THEN 'PROP_SENT_REVIEW'
    WHEN 'FINALIZED' THEN 'CONTRACT_SENT'
    WHEN 'INVOICE_PENDING' THEN 'WON_INVOICE_OPEN'
    WHEN 'PAID_CLOSED' THEN 'CLOSED_PAID'
    ELSE 'REFERRED'
  END,
  deal_size_cents,
  expected_close_date,
  owner_user_id,
  notes,
  last_contact_at,
  created_at,
  updated_at
FROM clients;

DROP TABLE clients;
ALTER TABLE clients_new RENAME TO clients;

CREATE INDEX IF NOT EXISTS idx_clients_stage ON clients(stage);
CREATE INDEX IF NOT EXISTS idx_clients_owner ON clients(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_expected_close ON clients(expected_close_date);

UPDATE stage_history
SET from_stage = CASE from_stage
  WHEN 'NEW_CONTACT' THEN 'INTRO_SCHEDULED'
  WHEN 'INTRO' THEN 'INTRO_COMPLETED'
  WHEN 'RESCHEDULED' THEN 'RESCHEDULE'
  WHEN 'ATTORNEY_MEETING' THEN 'ATTORNEY_COMPLETED'
  WHEN 'DOC_SUBMISSION' THEN 'DOCS_SENT'
  WHEN 'DOC_SIGNED' THEN 'DOCS_SIGNED'
  WHEN 'REFERRING' THEN 'WON_REFERRING'
  ELSE from_stage
END
WHERE entity_type = 'COI';

UPDATE stage_history
SET to_stage = CASE to_stage
  WHEN 'NEW_CONTACT' THEN 'INTRO_SCHEDULED'
  WHEN 'INTRO' THEN 'INTRO_COMPLETED'
  WHEN 'RESCHEDULED' THEN 'RESCHEDULE'
  WHEN 'ATTORNEY_MEETING' THEN 'ATTORNEY_COMPLETED'
  WHEN 'DOC_SUBMISSION' THEN 'DOCS_SENT'
  WHEN 'DOC_SIGNED' THEN 'DOCS_SIGNED'
  WHEN 'REFERRING' THEN 'WON_REFERRING'
  ELSE to_stage
END
WHERE entity_type = 'COI';

UPDATE stage_history
SET from_stage = CASE from_stage
  WHEN 'NEW_CONTACT' THEN 'REFERRED'
  WHEN 'INTRO' THEN 'CONTACTED'
  WHEN 'DOC_PROPOSAL' THEN 'PROP_SENT_REVIEW'
  WHEN 'FINALIZED' THEN 'CONTRACT_SENT'
  WHEN 'INVOICE_PENDING' THEN 'WON_INVOICE_OPEN'
  WHEN 'PAID_CLOSED' THEN 'CLOSED_PAID'
  ELSE from_stage
END
WHERE entity_type = 'CLIENT';

UPDATE stage_history
SET to_stage = CASE to_stage
  WHEN 'NEW_CONTACT' THEN 'REFERRED'
  WHEN 'INTRO' THEN 'CONTACTED'
  WHEN 'DOC_PROPOSAL' THEN 'PROP_SENT_REVIEW'
  WHEN 'FINALIZED' THEN 'CONTRACT_SENT'
  WHEN 'INVOICE_PENDING' THEN 'WON_INVOICE_OPEN'
  WHEN 'PAID_CLOSED' THEN 'CLOSED_PAID'
  ELSE to_stage
END
WHERE entity_type = 'CLIENT';

PRAGMA foreign_keys = ON;
