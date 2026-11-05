import type { components } from "../../api/generated/schema";

type TicketState = components["schemas"]["TicketState"];
type TicketSeverity = components["schemas"]["TicketSeverity"];

export const stateLabels: Record<TicketState, string> = {
  REPORTED: "Reportado",
  IN_PROGRESS: "En curso",
  PENDING_SECURITY: "Pendiente de seguridad",
  DONE: "Hecho"
};

export const severityLabels: Record<TicketSeverity, string> = {
  CRITICAL: "Crítico",
  HIGH: "Alto",
  MEDIUM: "Medio",
  LOW: "Bajo"
};
