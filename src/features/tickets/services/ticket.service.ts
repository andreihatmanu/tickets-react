import { TicketResponseSchema } from "../schemas/ticket-response.schema";
import type { components } from "../../../api/generated/schema";

export type TicketFilters = {
  offset: number;
  limit: number;
  q?: string;
  state?: components["schemas"]["TicketState"] | "ALL";
  severity?: components["schemas"]["TicketSeverity"] | "ALL";
  sort?: components["schemas"]["TicketSort"];
  direction?: "ASC" | "DESC";
};

export async function getTickets(filters: TicketFilters, signal?: AbortSignal) {
  const params = new URLSearchParams();

  params.set("offset", String(filters.offset));
  params.set("limit", String(filters.limit));

  if (filters.q?.trim()) {
    params.set("q", filters.q.trim());
  }

  if (filters.state && filters.state !== "ALL") {
    params.set("state", filters.state);
  }

  if (filters.severity && filters.severity !== "ALL") {
    params.set("severity", filters.severity);
  }

  params.set("sort", filters.sort ?? "LAST_MODIFIED");
  params.set("direction", filters.direction ?? "DESC");

  const response = await fetch(`/api/v1/tickets?${params.toString()}`, { signal });

  if (!response.ok) {
    throw new Error(`Error obteniendo tickets: ${response.status}`);
  }

  const json: unknown = await response.json();

  return TicketResponseSchema.parse(json);
}
