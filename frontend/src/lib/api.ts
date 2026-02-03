import type {
  Client,
  ClientStage,
  Coi,
  CoiStage,
  CreateClientRequest,
  CreateCoiRequest,
  PipelineSummary,
  StageChangeRequest
} from "@legal-leads/shared/types";

async function unwrap<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = `${response.status}`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        detail = payload.error;
      }
    } catch {
      // no-op
    }
    throw new Error(detail);
  }
  return (await response.json()) as T;
}

export async function getPipelineSummary(): Promise<PipelineSummary> {
  return unwrap<PipelineSummary>(await fetch("/api/reports/summary"));
}

export async function getCois(): Promise<Coi[]> {
  return unwrap<Coi[]>(await fetch("/api/cois"));
}

export async function createCoi(payload: CreateCoiRequest): Promise<Coi> {
  return unwrap<Coi>(
    await fetch("/api/cois", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    })
  );
}

export async function moveCoiStage(id: string, toStage: CoiStage, reason?: string): Promise<Coi> {
  const payload: StageChangeRequest<CoiStage> = { toStage, reason };
  return unwrap<Coi>(
    await fetch(`/api/cois/${id}/stage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    })
  );
}

export async function getClients(): Promise<Client[]> {
  return unwrap<Client[]>(await fetch("/api/clients"));
}

export async function createClient(payload: CreateClientRequest): Promise<Client> {
  return unwrap<Client>(
    await fetch("/api/clients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    })
  );
}

export async function moveClientStage(id: string, toStage: ClientStage, reason?: string): Promise<Client> {
  const payload: StageChangeRequest<ClientStage> = { toStage, reason };
  return unwrap<Client>(
    await fetch(`/api/clients/${id}/stage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    })
  );
}
