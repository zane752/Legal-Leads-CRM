import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import {
  CLIENT_STAGES,
  COI_STAGES,
  type Client,
  type Coi,
  type DashboardReport,
  type EmailActivity,
  type PipelineSummary
} from "@legal-leads/shared/types";
import {
  createClient,
  createCoi,
  createEntityEmail,
  getClients,
  getCois,
  getDashboardReport,
  getEntityEmails,
  getPipelineSummary,
  moveClientStage,
  moveCoiStage,
  updateClientDetails,
  updateSp
} from "./lib/api";

type TabKey = "dashboard" | "sp" | "clients" | "reports" | "spProfile" | "clientProfile";

interface CoiForm {
  name: string;
  email: string;
  phone: string;
  businessName: string;
}

interface ClientForm {
  name: string;
  email: string;
  phone: string;
  businessName: string;
  dealSizeDollars: string;
  expectedCloseDate: string;
  coiId: string;
}

interface ContactForm {
  direction: "INBOUND" | "OUTBOUND";
  subject: string;
  snippet: string;
  sentAt: string;
}

const emptyCoiForm: CoiForm = { name: "", email: "", phone: "", businessName: "" };
const emptyClientForm: ClientForm = {
  name: "",
  email: "",
  phone: "",
  businessName: "",
  dealSizeDollars: "",
  expectedCloseDate: "",
  coiId: ""
};

export function App() {
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [dashboardReport, setDashboardReport] = useState<DashboardReport | null>(null);
  const [cois, setCois] = useState<Coi[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [coiForm, setCoiForm] = useState<CoiForm>(emptyCoiForm);
  const [clientForm, setClientForm] = useState<ClientForm>(emptyClientForm);
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [selectedSpId, setSelectedSpId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<EmailActivity[]>([]);
  const [contactForm, setContactForm] = useState<ContactForm>({
    direction: "OUTBOUND",
    subject: "",
    snippet: "",
    sentAt: toLocalDatetimeValue(new Date())
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedSp = useMemo(() => cois.find((row) => row.id === selectedSpId) ?? null, [cois, selectedSpId]);
  const selectedClient = useMemo(
    () => clients.find((row) => row.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  const coisByStage = useMemo(() => groupByStage(cois, COI_STAGES), [cois]);
  const clientsByStage = useMemo(() => groupByStage(clients, CLIENT_STAGES), [clients]);

  useEffect(() => {
    void refreshData();
  }, []);

  useEffect(() => {
    void loadTimeline();
  }, [selectedSpId, selectedClientId]);

  async function refreshData() {
    setError(null);
    try {
      const [nextSummary, nextReport, nextCois, nextClients] = await Promise.all([
        getPipelineSummary(),
        getDashboardReport(),
        getCois(),
        getClients()
      ]);
      setSummary(nextSummary);
      setDashboardReport(nextReport);
      setCois(nextCois);
      setClients(nextClients);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh");
    }
  }

  async function loadTimeline() {
    try {
      if (selectedSpId) {
        setTimeline(await getEntityEmails("cois", selectedSpId));
        return;
      }
      if (selectedClientId) {
        setTimeline(await getEntityEmails("clients", selectedClientId));
        return;
      }
      setTimeline([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contact timeline");
    }
  }

  async function onCreateSp(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createCoi(coiForm);
      setCoiForm(emptyCoiForm);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create SP");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateClient(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createClient({
        name: clientForm.name,
        email: clientForm.email,
        phone: clientForm.phone,
        businessName: clientForm.businessName,
        expectedCloseDate: clientForm.expectedCloseDate || undefined,
        dealSizeCents: Math.round((Number(clientForm.dealSizeDollars) || 0) * 100),
        coiId: clientForm.coiId
      });
      setClientForm(emptyClientForm);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create Client");
    } finally {
      setBusy(false);
    }
  }

  async function moveSp(item: Coi, dir: "prev" | "next") {
    const idx = COI_STAGES.indexOf(item.stage);
    const nextIdx = dir === "next" ? idx + 1 : idx - 1;
    if (nextIdx < 0 || nextIdx >= COI_STAGES.length) {
      return;
    }
    const toStage = COI_STAGES[nextIdx];
    const reason = dir === "prev" ? window.prompt("Reason for moving backward?") || undefined : undefined;
    setBusy(true);
    setError(null);
    try {
      await moveCoiStage(item.id, toStage, reason);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move stage");
    } finally {
      setBusy(false);
    }
  }

  async function moveClient(item: Client, dir: "prev" | "next") {
    const idx = CLIENT_STAGES.indexOf(item.stage);
    const nextIdx = dir === "next" ? idx + 1 : idx - 1;
    if (nextIdx < 0 || nextIdx >= CLIENT_STAGES.length) {
      return;
    }
    const toStage = CLIENT_STAGES[nextIdx];
    const reason = dir === "prev" ? window.prompt("Reason for moving backward?") || undefined : undefined;
    setBusy(true);
    setError(null);
    try {
      await moveClientStage(item.id, toStage, reason);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move stage");
    } finally {
      setBusy(false);
    }
  }

  async function saveSpDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSp) {
      return;
    }
    setBusy(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    try {
      await updateSp(selectedSp.id, {
        name: String(formData.get("name") || ""),
        email: String(formData.get("email") || ""),
        phone: String(formData.get("phone") || ""),
        businessName: String(formData.get("businessName") || ""),
        notes: String(formData.get("notes") || "")
      });
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save SP details");
    } finally {
      setBusy(false);
    }
  }

  async function saveClientDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClient) {
      return;
    }
    setBusy(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const dollars = Number(formData.get("dealSizeDollars") || 0);
    try {
      await updateClientDetails(selectedClient.id, {
        name: String(formData.get("name") || ""),
        email: String(formData.get("email") || ""),
        phone: String(formData.get("phone") || ""),
        businessName: String(formData.get("businessName") || ""),
        notes: String(formData.get("notes") || ""),
        dealSizeCents: Math.max(0, Math.round(dollars * 100)),
        expectedCloseDate: String(formData.get("expectedCloseDate") || "") || undefined
      });
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save Client details");
    } finally {
      setBusy(false);
    }
  }

  async function addContactEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const entity = selectedSpId ? "cois" : selectedClientId ? "clients" : null;
    const id = selectedSpId ?? selectedClientId;
    if (!entity || !id) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createEntityEmail(entity, id, {
        direction: contactForm.direction,
        subject: contactForm.subject,
        snippet: contactForm.snippet,
        sentAt: new Date(contactForm.sentAt).toISOString(),
        fromEmail: entity === "cois" ? selectedSp?.email : selectedClient?.email,
        toEmail: entity === "cois" ? selectedSp?.email : selectedClient?.email
      });
      setContactForm({
        direction: "OUTBOUND",
        subject: "",
        snippet: "",
        sentAt: toLocalDatetimeValue(new Date())
      });
      await refreshData();
      await loadTimeline();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add contact entry");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <header className="hero">
        <h1>Legal Leads CRM</h1>
        <p>Pipeline 1 (SPs) + Pipeline 2 (Clients), linked by referral source.</p>
        {summary && (
          <div className="metrics">
            <span>SPs: {summary.coiCount}</span>
            <span>Clients: {summary.clientCount}</span>
          </div>
        )}
      </header>

      <nav className="tabs">
        {[
          ["dashboard", "Dashboard"],
          ["sp", "SP Pipeline"],
          ["clients", "Client Pipeline"],
          ["reports", "Reports"]
        ].map(([key, label]) => (
          <button
            key={key}
            className={`tab ${activeTab === key ? "tab-active" : ""}`}
            onClick={() => setActiveTab(key as TabKey)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      {error && <p className="error">{error}</p>}

      {activeTab === "dashboard" && (
        <section>
          <h2>Expected Income by Month</h2>
          <p className="pipeline-metric">Income estimate uses 1.265% of each client deal size.</p>
          <BarChart
            labels={dashboardReport?.incomeByMonth.map((entry) => monthLabel(entry.month)) ?? []}
            values={dashboardReport?.incomeByMonth.map((entry) => entry.expectedIncomeCents / 100) ?? []}
            format={(value) => `$${Math.round(value).toLocaleString()}`}
          />
        </section>
      )}

      {activeTab === "sp" && (
        <>
          <section className="forms">
            <form className="card form" onSubmit={onCreateSp}>
              <h2>New SP</h2>
              <input
                required
                placeholder="Name"
                value={coiForm.name}
                onChange={(event) => setCoiForm((v) => ({ ...v, name: event.target.value }))}
              />
              <input
                required
                placeholder="Email"
                type="email"
                value={coiForm.email}
                onChange={(event) => setCoiForm((v) => ({ ...v, email: event.target.value }))}
              />
              <input
                placeholder="Phone"
                value={coiForm.phone}
                onChange={(event) => setCoiForm((v) => ({ ...v, phone: event.target.value }))}
              />
              <input
                placeholder="Business Name"
                value={coiForm.businessName}
                onChange={(event) => setCoiForm((v) => ({ ...v, businessName: event.target.value }))}
              />
              <button disabled={busy} type="submit">
                Create SP
              </button>
            </form>
          </section>

          <section>
            <h2>Pipeline 1: SPs</h2>
            <div className="board">
              {COI_STAGES.map((stage) => (
                <div key={stage} className="lane">
                  <h3>{stageLabel(stage)}</h3>
                  {coisByStage[stage].map((coi) => (
                    <article className="item" key={coi.id}>
                      <strong>{coi.name}</strong>
                      <span>{coi.businessName || "No business"}</span>
                      <span>{coi.email}</span>
                      <div className="actions">
                        <button disabled={busy || stage === COI_STAGES[0]} onClick={() => moveSp(coi, "prev")}>◀</button>
                        <button
                          disabled={busy || stage === COI_STAGES[COI_STAGES.length - 1]}
                          onClick={() => moveSp(coi, "next")}
                        >
                          ▶
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSpId(coi.id);
                            setSelectedClientId(null);
                            setActiveTab("spProfile");
                          }}
                        >
                          Open Profile
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {activeTab === "clients" && (
        <>
          <section className="forms">
            <form className="card form" onSubmit={onCreateClient}>
              <h2>New Client (from SP)</h2>
              <select
                required
                value={clientForm.coiId}
                onChange={(event) => setClientForm((v) => ({ ...v, coiId: event.target.value }))}
              >
                <option value="">Select referral SP</option>
                {cois.map((coi) => (
                  <option key={coi.id} value={coi.id}>
                    {coi.name} ({coi.businessName || "No business"})
                  </option>
                ))}
              </select>
              <input
                required
                placeholder="Name"
                value={clientForm.name}
                onChange={(event) => setClientForm((v) => ({ ...v, name: event.target.value }))}
              />
              <input
                required
                placeholder="Email"
                type="email"
                value={clientForm.email}
                onChange={(event) => setClientForm((v) => ({ ...v, email: event.target.value }))}
              />
              <input
                placeholder="Phone"
                value={clientForm.phone}
                onChange={(event) => setClientForm((v) => ({ ...v, phone: event.target.value }))}
              />
              <input
                placeholder="Business Name"
                value={clientForm.businessName}
                onChange={(event) => setClientForm((v) => ({ ...v, businessName: event.target.value }))}
              />
              <input
                placeholder="Deal Size ($)"
                type="number"
                min="0"
                step="0.01"
                value={clientForm.dealSizeDollars}
                onChange={(event) => setClientForm((v) => ({ ...v, dealSizeDollars: event.target.value }))}
              />
              <input
                placeholder="Expected Close Date"
                type="date"
                value={clientForm.expectedCloseDate}
                onChange={(event) => setClientForm((v) => ({ ...v, expectedCloseDate: event.target.value }))}
              />
              <button disabled={busy} type="submit">
                Create Client
              </button>
            </form>
          </section>

          <section>
            <h2>Pipeline 2: Clients</h2>
            {summary && (
              <p className="pipeline-metric">Open Value: ${(summary.openClientValueCents / 100).toLocaleString()}</p>
            )}
            <div className="board">
              {CLIENT_STAGES.map((stage) => (
                <div key={stage} className="lane">
                  <h3>{stageLabel(stage)}</h3>
                  {clientsByStage[stage].map((client) => (
                    <article className="item" key={client.id}>
                      <strong>{client.name}</strong>
                      <span>{client.businessName || "No business"}</span>
                      <span>{client.email}</span>
                      <span>${(client.dealSizeCents / 100).toLocaleString()}</span>
                      <div className="actions">
                        <button disabled={busy || stage === CLIENT_STAGES[0]} onClick={() => moveClient(client, "prev")}>◀</button>
                        <button
                          disabled={busy || stage === CLIENT_STAGES[CLIENT_STAGES.length - 1]}
                          onClick={() => moveClient(client, "next")}
                        >
                          ▶
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClientId(client.id);
                            setSelectedSpId(null);
                            setActiveTab("clientProfile");
                          }}
                        >
                          Open Profile
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {activeTab === "spProfile" && selectedSp && (
        <section>
          <div className="profile-head">
            <h2>SP Profile: {selectedSp.name}</h2>
            <button type="button" onClick={() => setActiveTab("sp")}>Back to SP Pipeline</button>
          </div>
          <section className="detail-grid">
            <form className="card form" onSubmit={saveSpDetails}>
              <h2>Edit SP</h2>
              <input name="name" defaultValue={selectedSp.name} required />
              <input name="email" type="email" defaultValue={selectedSp.email} required />
              <input name="phone" defaultValue={selectedSp.phone || ""} />
              <input name="businessName" defaultValue={selectedSp.businessName || ""} />
              <textarea name="notes" defaultValue={selectedSp.notes || ""} rows={4} placeholder="Notes" />
              <div className="detail-actions">
                <a href={`mailto:${selectedSp.email}`}>Email</a>
                {selectedSp.phone && <a href={`tel:${selectedSp.phone}`}>Call</a>}
                <button disabled={busy} type="submit">Save SP</button>
              </div>
            </form>
            <ContactPanel
              timeline={timeline}
              contactForm={contactForm}
              setContactForm={setContactForm}
              addContactEntry={addContactEntry}
              busy={busy}
            />
          </section>
        </section>
      )}

      {activeTab === "clientProfile" && selectedClient && (
        <section>
          <div className="profile-head">
            <h2>Client Profile: {selectedClient.name}</h2>
            <button type="button" onClick={() => setActiveTab("clients")}>Back to Client Pipeline</button>
          </div>
          <section className="detail-grid">
            <form className="card form" onSubmit={saveClientDetails}>
              <h2>Edit Client</h2>
              <input name="name" defaultValue={selectedClient.name} required />
              <input name="email" type="email" defaultValue={selectedClient.email} required />
              <input name="phone" defaultValue={selectedClient.phone || ""} />
              <input name="businessName" defaultValue={selectedClient.businessName || ""} />
              <input
                name="dealSizeDollars"
                type="number"
                step="0.01"
                defaultValue={(selectedClient.dealSizeCents / 100).toString()}
              />
              <input
                name="expectedCloseDate"
                type="date"
                defaultValue={selectedClient.expectedCloseDate || ""}
              />
              <textarea name="notes" defaultValue={selectedClient.notes || ""} rows={4} placeholder="Notes" />
              <div className="detail-actions">
                <a href={`mailto:${selectedClient.email}`}>Email</a>
                {selectedClient.phone && <a href={`tel:${selectedClient.phone}`}>Call</a>}
                <button disabled={busy} type="submit">Save Client</button>
              </div>
            </form>
            <ContactPanel
              timeline={timeline}
              contactForm={contactForm}
              setContactForm={setContactForm}
              addContactEntry={addContactEntry}
              busy={busy}
            />
          </section>
        </section>
      )}

      {activeTab === "spProfile" && !selectedSp && (
        <section className="card form">
          <h2>No SP selected</h2>
          <button type="button" onClick={() => setActiveTab("sp")}>Go to SP Pipeline</button>
        </section>
      )}

      {activeTab === "clientProfile" && !selectedClient && (
        <section className="card form">
          <h2>No Client selected</h2>
          <button type="button" onClick={() => setActiveTab("clients")}>Go to Client Pipeline</button>
        </section>
      )}

      {activeTab === "reports" && (
        <section className="report-grid">
          <article className="card report-card">
            <h2>Weekly SPs Signed (This Month)</h2>
            <BarChart
              labels={dashboardReport?.weekly.map((entry) => entry.weekLabel) ?? []}
              values={dashboardReport?.weekly.map((entry) => entry.spSignedCount) ?? []}
              format={(value) => `${Math.round(value)}`}
            />
          </article>
          <article className="card report-card">
            <h2>Weekly Clients Added (This Month)</h2>
            <BarChart
              labels={dashboardReport?.weekly.map((entry) => entry.weekLabel) ?? []}
              values={dashboardReport?.weekly.map((entry) => entry.clientsAddedCount) ?? []}
              format={(value) => `${Math.round(value)}`}
            />
          </article>
        </section>
      )}
    </main>
  );
}

function ContactPanel({
  timeline,
  contactForm,
  setContactForm,
  addContactEntry,
  busy
}: {
  timeline: EmailActivity[];
  contactForm: ContactForm;
  setContactForm: Dispatch<SetStateAction<ContactForm>>;
  addContactEntry: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  busy: boolean;
}) {
  return (
    <section className="card form">
      <h2>Contact Log</h2>
      <form className="form" onSubmit={addContactEntry}>
        <select
          value={contactForm.direction}
          onChange={(event) =>
            setContactForm((v) => ({ ...v, direction: event.target.value as ContactForm["direction"] }))
          }
        >
          <option value="OUTBOUND">Outbound</option>
          <option value="INBOUND">Inbound</option>
        </select>
        <input
          placeholder="Subject"
          value={contactForm.subject}
          onChange={(event) => setContactForm((v) => ({ ...v, subject: event.target.value }))}
        />
        <textarea
          rows={3}
          placeholder="Contact notes"
          value={contactForm.snippet}
          onChange={(event) => setContactForm((v) => ({ ...v, snippet: event.target.value }))}
        />
        <input
          type="datetime-local"
          value={contactForm.sentAt}
          onChange={(event) => setContactForm((v) => ({ ...v, sentAt: event.target.value }))}
        />
        <button disabled={busy} type="submit">Add Contact Entry</button>
      </form>

      <div className="timeline">
        {timeline.length === 0 && <p>No contact entries yet.</p>}
        {timeline.map((entry) => (
          <article className="timeline-item" key={entry.id}>
            <strong>{entry.direction === "OUTBOUND" ? "Sent" : "Received"}</strong>
            <span>{entry.subject || "No subject"}</span>
            <small>{new Date(entry.sentAt).toLocaleString()}</small>
            {entry.snippet && <p>{entry.snippet}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

function BarChart({
  labels,
  values,
  format
}: {
  labels: string[];
  values: number[];
  format: (value: number) => string;
}) {
  const max = Math.max(...values, 1);

  return (
    <div className="chart">
      {labels.map((label, index) => {
        const value = values[index] ?? 0;
        const height = Math.max(10, Math.round((value / max) * 120));
        return (
          <div key={label} className="chart-bar-wrap">
            <span className="chart-value">{format(value)}</span>
            <div className="chart-bar" style={{ height: `${height}px` }} />
            <span className="chart-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function monthLabel(value: string): string {
  const [year, month] = value.split("-").map((part) => Number(part));
  if (!year || !month) {
    return value;
  }
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function groupByStage<T extends { stage: TStage }, TStage extends string>(
  rows: T[],
  stages: readonly TStage[]
): Record<TStage, T[]> {
  const seeded = Object.fromEntries(stages.map((stage) => [stage, [] as T[]])) as Record<TStage, T[]>;
  for (const row of rows) {
    seeded[row.stage].push(row);
  }
  return seeded;
}

function stageLabel(value: string): string {
  const labels: Record<string, string> = {
    INTRO_SCHEDULED: "Intro Scheduled",
    NO_SHOW: "No Show",
    RESCHEDULE: "Reschedule",
    INTRO_COMPLETED: "Intro Completed",
    ATTORNEY_SCHEDULED: "Attorney Scheduled",
    ATTORNEY_COMPLETED: "Attorney Completed",
    DOCS_SENT: "Docs Sent",
    DOCS_SIGNED: "Docs Signed",
    WON_REFERRING: "Won/Referring",
    LOST: "Lost",
    REFERRED: "Referred",
    CONTACTED: "Contacted",
    PROP_SENT_REVIEW: "Prop Sent/Review",
    CONTRACT_SENT: "Contract Sent",
    WON_INVOICE_OPEN: "Won/Invoice Open",
    CLOSED_PAID: "Closed/ Paid",
    CLOSED_LOST: "Closed/Lost"
  };
  if (labels[value]) {
    return labels[value];
  }
  return value
    .split("_")
    .map((word) => word[0] + word.slice(1).toLowerCase())
    .join(" ");
}

function toLocalDatetimeValue(date: Date): string {
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
