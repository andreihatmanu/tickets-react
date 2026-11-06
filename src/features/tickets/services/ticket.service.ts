import { TicketListResponseSchema, Ticket, CurrentUserSchema, ProblemSchema } from "../schemas/ticket.schema";
import type { components } from "../../../api/generated/schema";

export const PROFILES = {
  developer: { label: "Developer", team: "Payments", permissions: ["tickets.read"] },
  lead: { label: "Team lead", team: "Payments", permissions: ["tickets.read", "tickets.update"] },
  security: { label: "Security", team: "Security Champions", permissions: ["tickets.read", "tickets.update", "tickets.read.all"] }
} as const;
export type ProfileId = keyof typeof PROFILES;
export type TicketFilters = {
  offset: number; limit: number; q?: string;
  state?: components["schemas"]["TicketStateFilter"] | "ALL";
  severity?: components["schemas"]["SeverityFilter"] | "ALL";
  assignedTeam?: string; expiredOnly?: boolean;
  sort?: components["schemas"]["TicketSort"]; direction?: "ASC" | "DESC";
};
export type ApiProblem = { status: number; title: string; detail: string; instance?: string | null };
export class ApiError extends Error {
  constructor(public readonly status: number, public readonly problem: ApiProblem) {
    super(problem.detail); this.name = "ApiError";
  }
}
function profileHeaders(profileId: ProfileId): Record<string, string> {
  const profile = PROFILES[profileId];
  return { "X-User-Team": profile.team, "X-User-Permissions": profile.permissions.join(",") };
}
async function request<T>(url: string, init: RequestInit, parse: (value: unknown) => T): Promise<T> {
  const response = await fetch(url, init);
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = ProblemSchema.safeParse(payload);
    const problem: ApiProblem = parsed.success
      ? parsed.data
      : { status: response.status, title: "Error", detail: `La solicitud ha fallado (${response.status}).` };
    throw new ApiError(response.status, problem);
  }
  return parse(payload);
}
export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return error instanceof Error ? error.message : "Ha ocurrido un error inesperado.";
  switch (error.status) {
    case 403: return "No tienes permisos para realizar esta acción.";
    case 404: return "El ticket no existe o no está disponible para tu perfil.";
    case 409: return "El ticket está finalizado y no se puede modificar.";
    case 422: return "Los datos enviados no son válidos. Comprueba la fecha y los filtros.";
    default: return error.problem.detail || "No se ha podido completar la operación.";
  }
}
export async function getMe(profile: ProfileId, signal?: AbortSignal) {
  return request("/api/v1/me", { signal, headers: profileHeaders(profile) }, (data) => CurrentUserSchema.parse(data));
}
export async function getTickets(filters: TicketFilters, signal?: AbortSignal, profile: ProfileId = "developer") {
  const params = new URLSearchParams({ offset: String(filters.offset), limit: String(filters.limit), sort: filters.sort ?? "LAST_MODIFIED", direction: filters.direction ?? "DESC" });
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.state && filters.state !== "ALL") params.set("state", filters.state);
  if (filters.severity && filters.severity !== "ALL") params.set("severity", filters.severity);
  if (filters.assignedTeam) params.set("assignedTeam", filters.assignedTeam);
  if (filters.expiredOnly) params.set("expiredOnly", "true");
  return request(`/api/v1/tickets?${params}`, { signal, headers: profileHeaders(profile) }, (data) => TicketListResponseSchema.parse(data));
}
export async function getTicket(ticketId: string, profile: ProfileId, signal?: AbortSignal) {
  return request(`/api/v1/tickets/${ticketId}`, { signal, headers: profileHeaders(profile) }, (data) => Ticket.parse(data));
}
export async function updateTicketDueDate(ticketId: string, dueDate: string, profile: ProfileId) {
  return request(`/api/v1/tickets/${ticketId}`, { method: "PATCH", headers: { ...profileHeaders(profile), "Content-Type": "application/json" }, body: JSON.stringify({ dueDate }) }, (data) => Ticket.parse(data));
}
