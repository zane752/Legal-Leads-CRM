import {
  CLIENT_STAGES,
  COI_STAGES,
  type Client,
  type ClientStage,
  type Coi,
  type CoiStage,
  type CreateClientRequest,
  type CreateCoiRequest,
  type CreateEmailActivityRequest,
  type DashboardReport,
  type EmailActivity,
  type IncomeByMonthPoint,
  type PipelineSummary,
  type Referral,
  type StageChangeRequest,
  type UpdateClientRequest,
  type UpdateCoiRequest,
  type WeeklyReportBucket
} from "@legal-leads/shared/types";

export interface Env {
  DB: D1Database;
}

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
  "access-control-allow-headers": "content-type"
};

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS }
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }

      if (request.method === "GET" && url.pathname === "/api/health") {
        return json({ ok: true });
      }

      if (request.method === "GET" && url.pathname === "/api/stages") {
        return json({ coiStages: COI_STAGES, clientStages: CLIENT_STAGES });
      }

      if (request.method === "GET" && url.pathname === "/api/reports/summary") {
        return await getSummary(env.DB);
      }

      if (request.method === "GET" && url.pathname === "/api/reports/dashboard") {
        return await getDashboardReport(env.DB, url);
      }

      if (request.method === "GET" && url.pathname === "/api/cois") {
        return await listCois(env.DB, url);
      }

      if (request.method === "POST" && url.pathname === "/api/cois") {
        return await createCoi(env.DB, request);
      }

      if (request.method === "GET" && url.pathname === "/api/clients") {
        return await listClients(env.DB, url);
      }

      if (request.method === "POST" && url.pathname === "/api/clients") {
        return await createClient(env.DB, request);
      }

      if (request.method === "GET" && url.pathname === "/api/referrals") {
        return await listReferrals(env.DB, url);
      }

      const coiById = matchPath(url.pathname, /^\/api\/cois\/([^/]+)$/);
      if (coiById && request.method === "PATCH") {
        return await updateCoi(env.DB, coiById[1], request);
      }

      const coiStage = matchPath(url.pathname, /^\/api\/cois\/([^/]+)\/stage$/);
      if (coiStage && request.method === "POST") {
        return await changeCoiStage(env.DB, coiStage[1], request);
      }

      const clientById = matchPath(url.pathname, /^\/api\/clients\/([^/]+)$/);
      if (clientById && request.method === "PATCH") {
        return await updateClient(env.DB, clientById[1], request);
      }

      const clientStage = matchPath(url.pathname, /^\/api\/clients\/([^/]+)\/stage$/);
      if (clientStage && request.method === "POST") {
        return await changeClientStage(env.DB, clientStage[1], request);
      }

      const emailsPath = matchPath(url.pathname, /^\/api\/(cois|clients)\/([^/]+)\/emails$/);
      if (emailsPath && request.method === "GET") {
        return await listEmails(env.DB, emailsPath[1], emailsPath[2]);
      }

      if (emailsPath && request.method === "POST") {
        return await createEmail(env.DB, emailsPath[1], emailsPath[2], request);
      }

      return json({ error: "Not found" }, 404);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      return json({ error: message }, 400);
    }
  }
};

function matchPath(pathname: string, pattern: RegExp): RegExpMatchArray | null {
  return pathname.match(pattern);
}

async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function isCoiStage(value: string): value is CoiStage {
  return (COI_STAGES as readonly string[]).includes(value);
}

function isClientStage(value: string): value is ClientStage {
  return (CLIENT_STAGES as readonly string[]).includes(value);
}

function adjacentMove<T extends string>(stages: readonly T[], fromStage: T, toStage: T): boolean {
  const from = stages.indexOf(fromStage);
  const to = stages.indexOf(toStage);
  return Math.abs(to - from) === 1;
}

function mapCoi(row: Record<string, unknown>): Coi {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    phone: nullableString(row.phone),
    businessName: nullableString(row.business_name),
    stage: String(row.stage) as CoiStage,
    notes: nullableString(row.notes),
    lastContactAt: nullableString(row.last_contact_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function mapClient(row: Record<string, unknown>): Client {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    phone: nullableString(row.phone),
    businessName: nullableString(row.business_name),
    stage: String(row.stage) as ClientStage,
    dealSizeCents: Number(row.deal_size_cents ?? 0),
    expectedCloseDate: nullableString(row.expected_close_date),
    notes: nullableString(row.notes),
    lastContactAt: nullableString(row.last_contact_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function mapReferral(row: Record<string, unknown>): Referral {
  return {
    id: String(row.id),
    coiId: String(row.coi_id),
    clientId: String(row.client_id),
    referredAt: String(row.referred_at),
    status: String(row.status) as Referral["status"]
  };
}

function mapEmail(row: Record<string, unknown>): EmailActivity {
  return {
    id: String(row.id),
    entityType: String(row.entity_type) as EmailActivity["entityType"],
    entityId: String(row.entity_id),
    direction: String(row.direction) as EmailActivity["direction"],
    subject: nullableString(row.subject),
    fromEmail: nullableString(row.from_email),
    toEmail: nullableString(row.to_email),
    sentAt: String(row.sent_at),
    threadId: nullableString(row.thread_id),
    snippet: nullableString(row.snippet),
    createdAt: String(row.created_at)
  };
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
}

async function getSummary(db: D1Database): Promise<Response> {
  const coiCount = await db
    .prepare("SELECT COUNT(*) AS count FROM cois")
    .first<{ count: number }>();

  const clientCount = await db
    .prepare("SELECT COUNT(*) AS count FROM clients")
    .first<{ count: number }>();

  const openClientValue = await db
    .prepare("SELECT COALESCE(SUM(deal_size_cents), 0) AS total FROM clients WHERE stage NOT IN (?, ?)")
    .bind("CLOSED_PAID", "CLOSED_LOST")
    .first<{ total: number }>();

  const payload: PipelineSummary = {
    coiCount: coiCount?.count ?? 0,
    clientCount: clientCount?.count ?? 0,
    openClientValueCents: openClientValue?.total ?? 0
  };

  return json(payload);
}

async function getDashboardReport(db: D1Database, url: URL): Promise<Response> {
  const monthParam = url.searchParams.get("month");
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : currentMonthKey();

  const weeklySignedRows = await db
    .prepare(
      `SELECT
        ((CAST(strftime('%d', substr(changed_at, 1, 10)) AS INTEGER) - 1) / 7) + 1 AS week_index,
        COUNT(*) AS count
      FROM stage_history
      WHERE entity_type = 'COI'
        AND to_stage = 'DOCS_SIGNED'
        AND substr(changed_at, 1, 7) = ?
      GROUP BY week_index`
    )
    .bind(month)
    .all<{ week_index: number; count: number }>();

  const weeklyClientsRows = await db
    .prepare(
      `SELECT
        ((CAST(strftime('%d', substr(created_at, 1, 10)) AS INTEGER) - 1) / 7) + 1 AS week_index,
        COUNT(*) AS count
      FROM clients
      WHERE substr(created_at, 1, 7) = ?
      GROUP BY week_index`
    )
    .bind(month)
    .all<{ week_index: number; count: number }>();

  const signedMap = new Map<number, number>(
    (weeklySignedRows.results ?? []).map((row) => [Number(row.week_index), Number(row.count)])
  );
  const clientMap = new Map<number, number>(
    (weeklyClientsRows.results ?? []).map((row) => [Number(row.week_index), Number(row.count)])
  );

  const weekly: WeeklyReportBucket[] = [1, 2, 3, 4, 5].map((week) => ({
    weekLabel: `Week ${week}`,
    spSignedCount: signedMap.get(week) ?? 0,
    clientsAddedCount: clientMap.get(week) ?? 0
  }));

  const months = lastMonthKeys(6);
  const incomeRows = await db
    .prepare(
      `SELECT
        substr(expected_close_date, 1, 7) AS month,
        CAST(ROUND(SUM(deal_size_cents * 0.01265), 0) AS INTEGER) AS expected_income_cents
      FROM clients
      WHERE expected_close_date IS NOT NULL
        AND substr(expected_close_date, 1, 7) IN (${months.map(() => "?").join(",")})
      GROUP BY month`
    )
    .bind(...months)
    .all<{ month: string; expected_income_cents: number }>();

  const incomeMap = new Map<string, number>(
    (incomeRows.results ?? []).map((row) => [String(row.month), Number(row.expected_income_cents ?? 0)])
  );
  const incomeByMonth: IncomeByMonthPoint[] = months.map((entry) => ({
    month: entry,
    expectedIncomeCents: incomeMap.get(entry) ?? 0
  }));

  const payload: DashboardReport = { weekly, incomeByMonth };
  return json(payload);
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function lastMonthKeys(count: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

async function listCois(db: D1Database, url: URL): Promise<Response> {
  const stage = url.searchParams.get("stage");
  if (stage && !isCoiStage(stage)) {
    return json({ error: "Invalid COI stage filter" }, 400);
  }

  const rowsResult = stage
    ? await db
        .prepare("SELECT * FROM cois WHERE stage = ? ORDER BY created_at DESC")
        .bind(stage)
        .all<Record<string, unknown>>()
    : await db.prepare("SELECT * FROM cois ORDER BY created_at DESC").all<Record<string, unknown>>();

  return json((rowsResult.results ?? []).map(mapCoi));
}

async function createCoi(db: D1Database, request: Request): Promise<Response> {
  const body = await readJson<CreateCoiRequest>(request);
  assert(body.name?.trim(), "COI name is required");
  assert(body.email?.trim(), "COI email is required");

  const id = crypto.randomUUID();
  const stage: CoiStage = "INTRO_SCHEDULED";
  const timestamp = nowIso();

  await db
    .prepare(
      "INSERT INTO cois (id, name, email, phone, business_name, stage, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(
      id,
      body.name.trim(),
      body.email.trim(),
      body.phone?.trim() || null,
      body.businessName?.trim() || null,
      stage,
      body.notes?.trim() || null,
      timestamp,
      timestamp
    )
    .run();

  await db
    .prepare(
      "INSERT INTO stage_history (id, entity_type, entity_id, from_stage, to_stage, reason, changed_at) VALUES (?, 'COI', ?, NULL, ?, ?, ?)"
    )
    .bind(crypto.randomUUID(), id, stage, "Created", timestamp)
    .run();

  const row = await db.prepare("SELECT * FROM cois WHERE id = ?").bind(id).first<Record<string, unknown>>();
  return json(mapCoi(row ?? {}), 201);
}

async function updateCoi(db: D1Database, id: string, request: Request): Promise<Response> {
  const body = await readJson<UpdateCoiRequest>(request);
  const existing = await db.prepare("SELECT * FROM cois WHERE id = ?").bind(id).first<Record<string, unknown>>();
  assert(existing, "COI not found");

  const timestamp = nowIso();
  await db
    .prepare(
      "UPDATE cois SET name = ?, email = ?, phone = ?, business_name = ?, notes = ?, updated_at = ? WHERE id = ?"
    )
    .bind(
      body.name?.trim() || String(existing.name),
      body.email?.trim() || String(existing.email),
      body.phone?.trim() || nullableString(existing.phone),
      body.businessName?.trim() || nullableString(existing.business_name),
      body.notes?.trim() || nullableString(existing.notes),
      timestamp,
      id
    )
    .run();

  const row = await db.prepare("SELECT * FROM cois WHERE id = ?").bind(id).first<Record<string, unknown>>();
  return json(mapCoi(row ?? {}));
}

async function changeCoiStage(db: D1Database, id: string, request: Request): Promise<Response> {
  const body = await readJson<StageChangeRequest<CoiStage>>(request);
  assert(body.toStage, "toStage is required");
  assert(isCoiStage(body.toStage), "Invalid COI stage");

  const existing = await db.prepare("SELECT * FROM cois WHERE id = ?").bind(id).first<Record<string, unknown>>();
  assert(existing, "COI not found");

  const fromStage = String(existing.stage) as CoiStage;
  const toStage = body.toStage;
  const isBackwards = COI_STAGES.indexOf(toStage) < COI_STAGES.indexOf(fromStage);
  const isAllowed = adjacentMove(COI_STAGES, fromStage, toStage) || isBackwards;
  assert(isAllowed, "Only adjacent forward or backward stage changes are allowed");
  if (isBackwards) {
    assert(body.reason?.trim(), "Reason is required for backward stage moves");
  }

  const timestamp = nowIso();
  await db
    .prepare("UPDATE cois SET stage = ?, updated_at = ? WHERE id = ?")
    .bind(toStage, timestamp, id)
    .run();

  await db
    .prepare(
      "INSERT INTO stage_history (id, entity_type, entity_id, from_stage, to_stage, changed_by_user_id, reason, changed_at) VALUES (?, 'COI', ?, ?, ?, ?, ?, ?)"
    )
    .bind(crypto.randomUUID(), id, fromStage, toStage, body.changedByUserId || null, body.reason || null, timestamp)
    .run();

  const row = await db.prepare("SELECT * FROM cois WHERE id = ?").bind(id).first<Record<string, unknown>>();
  return json(mapCoi(row ?? {}));
}

async function listClients(db: D1Database, url: URL): Promise<Response> {
  const stage = url.searchParams.get("stage");
  if (stage && !isClientStage(stage)) {
    return json({ error: "Invalid client stage filter" }, 400);
  }

  const rowsResult = stage
    ? await db
        .prepare("SELECT * FROM clients WHERE stage = ? ORDER BY created_at DESC")
        .bind(stage)
        .all<Record<string, unknown>>()
    : await db.prepare("SELECT * FROM clients ORDER BY created_at DESC").all<Record<string, unknown>>();

  return json((rowsResult.results ?? []).map(mapClient));
}

async function createClient(db: D1Database, request: Request): Promise<Response> {
  const body = await readJson<CreateClientRequest>(request);
  assert(body.name?.trim(), "Client name is required");
  assert(body.email?.trim(), "Client email is required");
  const referralCoiId = body.coiId?.trim() || null;
  if (referralCoiId) {
    const sourceCoi = await db.prepare("SELECT id FROM cois WHERE id = ?").bind(referralCoiId).first();
    assert(sourceCoi, "Referral SP not found");
  }

  const id = crypto.randomUUID();
  const stage: ClientStage = "REFERRED";
  const timestamp = nowIso();

  await db
    .prepare(
      "INSERT INTO clients (id, name, email, phone, business_name, stage, deal_size_cents, expected_close_date, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(
      id,
      body.name.trim(),
      body.email.trim(),
      body.phone?.trim() || null,
      body.businessName?.trim() || null,
      stage,
      Math.max(0, body.dealSizeCents ?? 0),
      body.expectedCloseDate || null,
      body.notes?.trim() || null,
      timestamp,
      timestamp
    )
    .run();

  if (referralCoiId) {
    await db
      .prepare(
        "INSERT INTO referrals (id, coi_id, client_id, referred_at, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)"
      )
      .bind(crypto.randomUUID(), referralCoiId, id, timestamp, timestamp, timestamp)
      .run();
  }

  await db
    .prepare(
      "INSERT INTO stage_history (id, entity_type, entity_id, from_stage, to_stage, reason, changed_at) VALUES (?, 'CLIENT', ?, NULL, ?, ?, ?)"
    )
    .bind(crypto.randomUUID(), id, stage, referralCoiId ? "Created from referral" : "Created with no SP", timestamp)
    .run();

  const row = await db.prepare("SELECT * FROM clients WHERE id = ?").bind(id).first<Record<string, unknown>>();
  return json(mapClient(row ?? {}), 201);
}

async function updateClient(db: D1Database, id: string, request: Request): Promise<Response> {
  const body = await readJson<UpdateClientRequest>(request);
  const existing = await db.prepare("SELECT * FROM clients WHERE id = ?").bind(id).first<Record<string, unknown>>();
  assert(existing, "Client not found");

  const currentStage = String(existing.stage) as ClientStage;
  if (["PROP_SENT_REVIEW", "CONTRACT_SENT", "WON_INVOICE_OPEN", "CLOSED_PAID"].includes(currentStage)) {
    const closeDate = body.expectedCloseDate ?? nullableString(existing.expected_close_date);
    assert(closeDate, "expectedCloseDate is required once client reaches Prop Sent/Review or later");
  }

  const timestamp = nowIso();
  await db
    .prepare(
      "UPDATE clients SET name = ?, email = ?, phone = ?, business_name = ?, deal_size_cents = ?, expected_close_date = ?, notes = ?, updated_at = ? WHERE id = ?"
    )
    .bind(
      body.name?.trim() || String(existing.name),
      body.email?.trim() || String(existing.email),
      body.phone?.trim() || nullableString(existing.phone),
      body.businessName?.trim() || nullableString(existing.business_name),
      Math.max(0, body.dealSizeCents ?? Number(existing.deal_size_cents ?? 0)),
      body.expectedCloseDate || nullableString(existing.expected_close_date),
      body.notes?.trim() || nullableString(existing.notes),
      timestamp,
      id
    )
    .run();

  const row = await db.prepare("SELECT * FROM clients WHERE id = ?").bind(id).first<Record<string, unknown>>();
  return json(mapClient(row ?? {}));
}

async function changeClientStage(db: D1Database, id: string, request: Request): Promise<Response> {
  const body = await readJson<StageChangeRequest<ClientStage>>(request);
  assert(body.toStage, "toStage is required");
  assert(isClientStage(body.toStage), "Invalid client stage");

  const existing = await db.prepare("SELECT * FROM clients WHERE id = ?").bind(id).first<Record<string, unknown>>();
  assert(existing, "Client not found");

  const fromStage = String(existing.stage) as ClientStage;
  const toStage = body.toStage;
  const isBackwards = CLIENT_STAGES.indexOf(toStage) < CLIENT_STAGES.indexOf(fromStage);
  const isAllowed = adjacentMove(CLIENT_STAGES, fromStage, toStage) || isBackwards;
  assert(isAllowed, "Only adjacent forward or backward stage changes are allowed");
  if (isBackwards) {
    assert(body.reason?.trim(), "Reason is required for backward stage moves");
  }

  if (["PROP_SENT_REVIEW", "CONTRACT_SENT", "WON_INVOICE_OPEN", "CLOSED_PAID"].includes(toStage)) {
    assert(nullableString(existing.expected_close_date), "expectedCloseDate is required before this stage");
  }

  const timestamp = nowIso();
  await db
    .prepare("UPDATE clients SET stage = ?, updated_at = ? WHERE id = ?")
    .bind(toStage, timestamp, id)
    .run();

  await db
    .prepare(
      "INSERT INTO stage_history (id, entity_type, entity_id, from_stage, to_stage, changed_by_user_id, reason, changed_at) VALUES (?, 'CLIENT', ?, ?, ?, ?, ?, ?)"
    )
    .bind(crypto.randomUUID(), id, fromStage, toStage, body.changedByUserId || null, body.reason || null, timestamp)
    .run();

  const row = await db.prepare("SELECT * FROM clients WHERE id = ?").bind(id).first<Record<string, unknown>>();
  return json(mapClient(row ?? {}));
}

async function listReferrals(db: D1Database, url: URL): Promise<Response> {
  const coiId = url.searchParams.get("coiId");
  const rowsResult = coiId
    ? await db
        .prepare("SELECT * FROM referrals WHERE coi_id = ? ORDER BY referred_at DESC")
        .bind(coiId)
        .all<Record<string, unknown>>()
    : await db.prepare("SELECT * FROM referrals ORDER BY referred_at DESC").all<Record<string, unknown>>();

  return json((rowsResult.results ?? []).map(mapReferral));
}

async function listEmails(db: D1Database, entityPath: string, id: string): Promise<Response> {
  const entityType = entityPath === "cois" ? "COI" : "CLIENT";
  const rowsResult = await db
    .prepare("SELECT * FROM email_activities WHERE entity_type = ? AND entity_id = ? ORDER BY sent_at DESC")
    .bind(entityType, id)
    .all<Record<string, unknown>>();
  return json((rowsResult.results ?? []).map(mapEmail));
}

async function createEmail(
  db: D1Database,
  entityPath: string,
  id: string,
  request: Request
): Promise<Response> {
  const body = await readJson<CreateEmailActivityRequest>(request);
  assert(body.sentAt, "sentAt is required");

  const entityType = entityPath === "cois" ? "COI" : "CLIENT";
  const exists = await db
    .prepare(entityPath === "cois" ? "SELECT id FROM cois WHERE id = ?" : "SELECT id FROM clients WHERE id = ?")
    .bind(id)
    .first();
  assert(exists, "Entity not found");

  const emailId = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO email_activities (id, entity_type, entity_id, direction, subject, from_email, to_email, sent_at, thread_id, snippet, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(
      emailId,
      entityType,
      id,
      body.direction,
      body.subject?.trim() || null,
      body.fromEmail?.trim() || null,
      body.toEmail?.trim() || null,
      body.sentAt,
      body.threadId?.trim() || null,
      body.snippet?.trim() || null,
      nowIso()
    )
    .run();

  await db
    .prepare(entityPath === "cois" ? "UPDATE cois SET last_contact_at = ?, updated_at = ? WHERE id = ?" : "UPDATE clients SET last_contact_at = ?, updated_at = ? WHERE id = ?")
    .bind(body.sentAt, nowIso(), id)
    .run();

  const row = await db
    .prepare("SELECT * FROM email_activities WHERE id = ?")
    .bind(emailId)
    .first<Record<string, unknown>>();

  return json(mapEmail(row ?? {}), 201);
}
