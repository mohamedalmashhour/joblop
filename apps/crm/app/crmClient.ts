// Typed shapes mirrored from the API serializers (apps/api/src/crm/crmRoutes.ts) and small fetch
// helpers that talk to this app's own BFF (/api/crm/*). All reads/writes go through the BFF, which
// forwards the staff session to the API; the API enforces platform-administrator authority.
import type { Stage, ContactType } from "./ui";

export type Contact = {
  id: string;
  type: ContactType;
  stage: Stage;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  assigneeUserId: string | null;
  assigneeName: string | null;
  userId: string | null;
  organizationId: string | null;
  externalJobLeadId: string | null;
  linkedUserName: string | null;
  linkedUserEmail: string | null;
  linkedOrganizationName: string | null;
  linkedLeadTitle: string | null;
  consentOptedIn: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Activity = {
  id: string;
  kind: "note" | "call" | "email" | "stage_change" | "task";
  body: string | null;
  actorUserId: string | null;
  actorName: string | null;
  createdAt: string;
};

export type BoardColumn = { stage: Stage; contacts: Contact[] };

export type Lead = {
  id: string;
  title: string;
  employer: string | null;
  location: string | null;
  url: string;
  lastSeenAt: string;
};

async function parse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(detail?.message ?? `Request failed (${response.status}).`);
  }
  return (await response.json()) as T;
}

export const crmApi = {
  listContacts: (params: { stage?: string | undefined; type?: string | undefined; q?: string | undefined } = {}) => {
    const search = new URLSearchParams();
    if (params.stage) search.set("stage", params.stage);
    if (params.type) search.set("type", params.type);
    if (params.q) search.set("q", params.q);
    const qs = search.toString();
    return fetch(`/api/crm/contacts${qs ? `?${qs}` : ""}`, { cache: "no-store" }).then(
      parse<{ contacts: Contact[]; board: BoardColumn[]; total: number }>
    );
  },
  getContact: (id: string) =>
    fetch(`/api/crm/contacts/${id}`, { cache: "no-store" }).then(parse<{ contact: Contact; activities: Activity[] }>),
  createContact: (body: {
    type: ContactType;
    name?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    source?: string | undefined;
  }) => post<{ contact: Contact }>("/api/crm/contacts", body),
  updateContact: (id: string, body: Record<string, unknown>) =>
    patch<{ contact: Contact }>(`/api/crm/contacts/${id}`, body),
  moveStage: (id: string, stage: Stage) => post<{ contact: Contact }>(`/api/crm/contacts/${id}/stage`, { stage }),
  assign: (id: string, assigneeUserId: string | null) =>
    post<{ contact: Contact }>(`/api/crm/contacts/${id}/assign`, { assigneeUserId }),
  addActivity: (id: string, body: { kind: "note" | "call" | "email" | "task"; body?: string | undefined }) =>
    post<{ activity: Activity }>(`/api/crm/contacts/${id}/activities`, body),
  listLeads: () => fetch("/api/crm/leads", { cache: "no-store" }).then(parse<{ leads: Lead[] }>),
  importLead: (id: string) =>
    post<{ contact: Contact; alreadyImported?: boolean }>(`/api/crm/leads/${id}/import`, {})
};

function post<T>(path: string, body: unknown): Promise<T> {
  return fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  }).then(parse<T>);
}

function patch<T>(path: string, body: unknown): Promise<T> {
  return fetch(path, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  }).then(parse<T>);
}
