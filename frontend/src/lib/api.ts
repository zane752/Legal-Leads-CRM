import type {
  Client,
  ClientStage,
  Coi,
  CoiStage,
  CreateEmailActivityRequest,
  CreateClientRequest,
  CreateCoiRequest,
  DashboardReport,
  EmailActivity,
  PipelineSummary,
  StageChangeRequest,
  UpdateClientRequest,
  UpdateCoiRequest
} from "@legal-leads/shared/types";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "https://crm.zane-68d.workers.dev"
).replace(/\/$/, "");

function apiUrl(path: string): string {
  if (!API_BASE_URL) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
}

async function unwrap<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = `${response.status}`;
    try {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const payload = (await response.json()) as { error?: string };
        if (payload.error) {
          detail = payload.error;
        }
      } else {
        const text = (await response.text()).trim();
        if (text.startsWith("<!doctype") || text.startsWith("<html")) {
          detail = "API returned HTML instead of JSON. Set VITE_API_BASE_URL to your Worker URL and redeploy Pages.";
        } else if (text) {
          detail = text.slice(0, 180);
        }
      }
    } catch {
      // no-op
    }
    throw new Error(detail);
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("API returned non-JSON response. Check VITE_API_BASE_URL and Worker deployment.");
  }
}

export async function getPipelineSummary(): Promise<PipelineSummary> {
  return unwrap<PipelineSummary>(await fetch(apiUrl("/api/reports/summary")));
}

export async function getDashboardReport(month?: string): Promise<DashboardReport> {
  const query = month ? `?month=${encodeURIComponent(month)}` : "";
  return unwrap<DashboardReport>(await fetch(apiUrl(`/api/reports/dashboard${query}`)));
}

export async function getCois(): Promise<Coi[]> {
  return unwrap<Coi[]>(await fetch(apiUrl("/api/cois")));
}

export async function createCoi(payload: CreateCoiRequest): Promise<Coi> {
  return unwrap<Coi>(
    await fetch(apiUrl("/api/cois"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    })
  );
}

export async function moveCoiStage(id: string, toStage: CoiStage, reason?: string): Promise<Coi> {
  const payload: StageChangeRequest<CoiStage> = { toStage, reason };
  return unwrap<Coi>(
    await fetch(apiUrl(`/api/cois/${id}/stage`), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    })
  );
}

export async function updateSp(id: string, payload: UpdateCoiRequest): Promise<Coi> {
  return unwrap<Coi>(
    await fetch(apiUrl(`/api/cois/${id}`), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    })
  );
}

export async function getClients(): Promise<Client[]> {
  return unwrap<Client[]>(await fetch(apiUrl("/api/clients")));
}

export async function createClient(payload: CreateClientRequest): Promise<Client> {
  return unwrap<Client>(
    await fetch(apiUrl("/api/clients"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    })
  );
}

export async function moveClientStage(id: string, toStage: ClientStage, reason?: string): Promise<Client> {
  const payload: StageChangeRequest<ClientStage> = { toStage, reason };
  return unwrap<Client>(
    await fetch(apiUrl(`/api/clients/${id}/stage`), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    })
  );
}

export async function updateClientDetails(id: string, payload: UpdateClientRequest): Promise<Client> {
  return unwrap<Client>(
    await fetch(apiUrl(`/api/clients/${id}`), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    })
  );
}

export async function getEntityEmails(entity: "cois" | "clients", id: string): Promise<EmailActivity[]> {
  return unwrap<EmailActivity[]>(await fetch(apiUrl(`/api/${entity}/${id}/emails`)));
}

export async function createEntityEmail(
  entity: "cois" | "clients",
  id: string,
  payload: CreateEmailActivityRequest
): Promise<EmailActivity> {
  return unwrap<EmailActivity>(
    await fetch(apiUrl(`/api/${entity}/${id}/emails`), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    })
  );
}
