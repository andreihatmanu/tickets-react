import { z } from "zod";
import type { components } from "../../../api/generated/schema";

export const TicketState = z.enum([
  "REPORTED",
  "IN_PROGRESS",
  "PENDING_SECURITY",
  "DONE",
] as const satisfies readonly components["schemas"]["TicketState"][]);

export const SeveritySchema = z.enum([
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
] as const satisfies readonly components["schemas"]["TicketSeverity"][]);

export const Ticket: z.ZodType<components["schemas"]["Ticket"]> = z.object({
  id: z.string().uuid().max(36),
  key: z.string().regex(/^SEC-[0-9]{1,10}$/).max(32),
  asset: z.string().max(128),
  assignedTeam: z.string().max(128).nullable(),
  assignee: z.string().email().max(254),
  severity: SeveritySchema,
  state: TicketState,
  targetDate: z.string().max(35).datetime({ offset: true }),
  dueDate: z.string().max(35).datetime({ offset: true }).nullable(),
  lastModified: z.string().max(35).datetime({ offset: true }),
});

export const TicketListResponseSchema: z.ZodType<components["schemas"]["TicketPage"]> = z.object({
  data: z.array(Ticket).max(100),
  pagination: z.object({
    offset: z.number().int().min(0).max(1_000_000),
    limit: z.number().int().min(1).max(100),
    totalElements: z.number().int().min(0).max(2_147_483_647),
  }),
});

export type Ticket = components["schemas"]["Ticket"];
export type TicketStateSchema = components["schemas"]["TicketState"];
export type Severity = components["schemas"]["TicketSeverity"];
export type TicketListResponse = components["schemas"]["TicketPage"];
