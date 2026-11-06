import { TicketResponseSchema } from "../schemas/ticket-response.schema";
import { Ticket } from "../schemas/ticket.schema";
import type { components } from "../../../api/generated/schema";

export const PROFILES = {
  developer: { label: "Developer · Payments", team: "Payments", permissions: ["tickets.read"] },
  lead: { label: "Team lead · Payments", team: "Payments", permissions: ["tickets.read", "tickets.update"] },
  security: {
    label: "Security · Security Champions",
    team: "Security Champions",
    permissions: ["tickets.read", "tickets.update", "tickets.read.all"]
  }
} as const;

export type ProfileId = keyof typeof PROFILES;
export type TicketFilters = {
  offset: number;
  limit: number;
  q?: string;
  state?: components["schemas"]["TicketState"] | "ALL";
  severity?: components["schemas"]["TicketSeverity"] | "ALL";
  sort?: components["schemas"]["TicketSort"];
  direction?: "ASC" | "DESC";
};

function profileHeaders(profileId: ProfileId): Record<string, string> {
  const profile = PROFILES[profileId];
  return {
    "X-User-Team": profile.team,
    "X-User-Permissions": profile.permissions.join(",")
  };
}

export async function getTickets(filters: TicketFilters, signal?: AbortSignal, profile: ProfileId = "developer") {
  const params = new URLSearchParams();
  params.set("offset", String(filters.offset));
  params.set("limit", String(filters.limit));
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.state && filters.state !== "ALL") params.set("state", filters.state);
  if (filters.severity && filters.severity !== "ALL") params.set("severity", filters.severity);
  params.set("sort", filters.sort ?? "LAST_MODIFIED");
  params.set("direction", filters.direction ?? "DESC");

  const response = await fetch(`/api/v1/tickets?${params}`, {
    signal,
    headers: profileHeaders(profile)
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new Error(problem?.detail ?? `Error obteniendo tickets: ${response.status}`);
  }
  return TicketResponseSchema.parse(await response.json());
}

export async function updateTicketDueDate(ticketId: string, dueDate: string | null, profile: ProfileId) {
  const response = await fetch(`/api/v1/tickets/${ticketId}`, {
    method: "PATCH",
    headers: { ...profileHeaders(profile), "Content-Type": "application/json" },
    body: JSON.stringify({ dueDate })
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new Error(problem?.detail ?? `Error actualizando ticket: ${response.status}`);
  }
  return Ticket.parse(await response.json());
}
