import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CLIENT_STAGES,
  COI_STAGES,
  type Client,
  type ClientStage,
  type Coi,
  type CoiStage,
  type PipelineSummary
} from "@legal-leads/shared/types";
import {
  createClient,
  createCoi,
  getClients,
  getCois,
  getPipelineSummary,
  moveClientStage,
  moveCoiStage
} from "./lib/api";

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
  const [cois, setCois] = useState<Coi[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [coiForm, setCoiForm] = useState<CoiForm>(emptyCoiForm);
  const [clientForm, setClientForm] = useState<ClientForm>(emptyClientForm);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const coisByStage = useMemo(() => groupByStage(cois, COI_STAGES), [cois]);
  const clientsByStage = useMemo(() => groupByStage(clients, CLIENT_STAGES), [clients]);

  useEffect(() => {
    void refreshData();
  }, []);

  async function refreshData() {
    setError(null);
    try {
      const [nextSummary, nextCois, nextClients] = await Promise.all([
        getPipelineSummary(),
        getCois(),
        getClients()
      ]);
      setSummary(nextSummary);
      setCois(nextCois);
      setClients(nextClients);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh");
    }
  }

  async function onCreateCoi(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createCoi(coiForm);
      setCoiForm(emptyCoiForm);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create COI");
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

  async function moveCoi(item: Coi, dir: "prev" | "next") {
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

  return (
    <main className="page">
      <header className="hero">
        <h1>Legal Leads CRM</h1>
        <p>Pipeline 1 (COIs) + Pipeline 2 (Clients), linked by referral source.</p>
        {summary && (
          <div className="metrics">
            <span>COIs: {summary.coiCount}</span>
            <span>Clients: {summary.clientCount}</span>
            <span>Open Value: ${(summary.openClientValueCents / 100).toLocaleString()}</span>
          </div>
        )}
      </header>

      {error && <p className="error">{error}</p>}

      <section className="forms">
        <form className="card form" onSubmit={onCreateCoi}>
          <h2>New COI</h2>
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
            Create COI
          </button>
        </form>

        <form className="card form" onSubmit={onCreateClient}>
          <h2>New Client (from COI)</h2>
          <select
            required
            value={clientForm.coiId}
            onChange={(event) => setClientForm((v) => ({ ...v, coiId: event.target.value }))}
          >
            <option value="">Select referral COI</option>
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
        <h2>Pipeline 1: COIs</h2>
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
                    <button disabled={busy || stage === COI_STAGES[0]} onClick={() => moveCoi(coi, "prev")}>
                      ◀
                    </button>
                    <button
                      disabled={busy || stage === COI_STAGES[COI_STAGES.length - 1]}
                      onClick={() => moveCoi(coi, "next")}
                    >
                      ▶
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Pipeline 2: Clients</h2>
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
                    <button
                      disabled={busy || stage === CLIENT_STAGES[0]}
                      onClick={() => moveClient(client, "prev")}
                    >
                      ◀
                    </button>
                    <button
                      disabled={busy || stage === CLIENT_STAGES[CLIENT_STAGES.length - 1]}
                      onClick={() => moveClient(client, "next")}
                    >
                      ▶
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
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
  return value
    .split("_")
    .map((word) => word[0] + word.slice(1).toLowerCase())
    .join(" ");
}
