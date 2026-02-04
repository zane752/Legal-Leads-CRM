export const COI_STAGES = [
  "INTRO_SCHEDULED",
  "NO_SHOW",
  "RESCHEDULE",
  "INTRO_COMPLETED",
  "ATTORNEY_SCHEDULED",
  "ATTORNEY_COMPLETED",
  "DOCS_SENT",
  "DOCS_SIGNED",
  "WON_REFERRING",
  "LOST"
] as const;

export const CLIENT_STAGES = [
  "REFERRED",
  "CONTACTED",
  "ATTORNEY_SCHEDULED",
  "NO_SHOW",
  "RESCHEDULE",
  "ATTORNEY_COMPLETED",
  "PROP_SENT_REVIEW",
  "CONTRACT_SENT",
  "WON_INVOICE_OPEN",
  "CLOSED_PAID",
  "CLOSED_LOST"
] as const;

export type CoiStage = (typeof COI_STAGES)[number];
export type ClientStage = (typeof CLIENT_STAGES)[number];

export interface PipelineSummary {
  coiCount: number;
  clientCount: number;
  openClientValueCents: number;
}

export interface Coi {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  businessName: string | null;
  stage: CoiStage;
  notes: string | null;
  lastContactAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  businessName: string | null;
  stage: ClientStage;
  dealSizeCents: number;
  expectedCloseDate: string | null;
  notes: string | null;
  lastContactAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Referral {
  id: string;
  coiId: string;
  clientId: string;
  referredAt: string;
  status: "ACTIVE" | "ARCHIVED";
}

export interface StageChangeRequest<TStage extends string> {
  toStage: TStage;
  reason?: string;
  changedByUserId?: string;
}

export interface CreateCoiRequest {
  name: string;
  email: string;
  phone?: string;
  businessName?: string;
  notes?: string;
}

export interface UpdateCoiRequest {
  name?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  notes?: string;
}

export interface CreateClientRequest {
  name: string;
  email: string;
  phone?: string;
  businessName?: string;
  notes?: string;
  dealSizeCents?: number;
  expectedCloseDate?: string;
  coiId: string;
}

export interface UpdateClientRequest {
  name?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  notes?: string;
  dealSizeCents?: number;
  expectedCloseDate?: string;
}

export interface EmailActivity {
  id: string;
  entityType: "COI" | "CLIENT";
  entityId: string;
  direction: "INBOUND" | "OUTBOUND";
  subject: string | null;
  fromEmail: string | null;
  toEmail: string | null;
  sentAt: string;
  threadId: string | null;
  snippet: string | null;
  createdAt: string;
}

export interface CreateEmailActivityRequest {
  direction: "INBOUND" | "OUTBOUND";
  subject?: string;
  fromEmail?: string;
  toEmail?: string;
  sentAt: string;
  threadId?: string;
  snippet?: string;
}

export interface WeeklyReportBucket {
  weekLabel: string;
  spSignedCount: number;
  clientsAddedCount: number;
}

export interface IncomeByMonthPoint {
  month: string;
  expectedIncomeCents: number;
}

export interface DashboardReport {
  weekly: WeeklyReportBucket[];
  incomeByMonth: IncomeByMonthPoint[];
}
