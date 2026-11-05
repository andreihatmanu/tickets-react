import { z } from "zod";
import type { components } from "../../../api/generated/schema";

export const TicketState = z.enum([
  "REPORTED",
  "IN_PROGRESS",
  "PENDING_SECURITY",
  "DONE"
] as const satisfies readonly components["schemas"]["TicketState"][]);

export const TicketSortSchema = z.enum([
  "TARGET_DATE",
  "LAST_MODIFIED",
  "SEVERITY"
] as const satisfies readonly components["schemas"]["TicketSort"][]);

export const SeveritySchema = z.enum([
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW"
] as const satisfies readonly components["schemas"]["TicketSeverity"][]);

export const Ticket: z.ZodType<components["schemas"]["Ticket"]> = z.object({
  id: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9-]+$/),
  key: z
    .string()
    .regex(/^[A-Z][A-Z0-9]+-[0-9]+$/)
    .max(32),
  asset: z.string().min(1).max(255),
  assignedTeam: z.string().min(1).max(100).nullable(),
  assignee: z.string().email().max(254),
  severity: SeveritySchema,
  state: TicketState,
  targetDate: z.string().max(35).datetime({ offset: true }),
  dueDate: z.string().max(35).datetime({ offset: true }).nullable(),
  lastModified: z.string().max(35).datetime({ offset: true })
});

export const TicketListResponseSchema: z.ZodType<components["schemas"]["TicketPage"]> = z.object({
  data: z.array(Ticket).max(100),
  pagination: z.object({
    offset: z.number().int().min(0).max(2_147_483_647),
    limit: z.number().int().min(1).max(100),
    totalElements: z.number().int().min(0).max(2_147_483_647)
  })
});

export type Ticket = components["schemas"]["Ticket"];
export type TicketStateSchema = components["schemas"]["TicketState"];
export type Severity = components["schemas"]["TicketSeverity"];
export type TicketListResponse = components["schemas"]["TicketPage"];
