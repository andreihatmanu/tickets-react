import { z } from "zod";
import type { components } from "../../../api/generated/schema";

export const TicketState = z.enum(["REPORTED", "IN_PROGRESS", "PENDING_SECURITY", "DONE"]);
export const TicketSortSchema = z.enum(["TARGET_DATE", "LAST_MODIFIED", "SEVERITY"]);
export const SeveritySchema = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

export const Ticket: z.ZodType<components["schemas"]["Ticket"]> = z.object({
  id: z.string().uuid(),
  key: z.string().regex(/^SEC-[0-9]{4,6}$/).max(16),
  title: z.string().min(1).max(200),
  asset: z.string().min(1).max(100),
  creatorTeam: z.string().min(1).max(100),
  assignedTeam: z.string().max(100).nullable(),
  assignee: z.string().email().max(254),
  severity: SeveritySchema,
  state: TicketState,
  restricted: z.boolean(),
  targetDate: z.string().date(),
  dueDate: z.string().datetime({ offset: true }).nullable(),
  createdAt: z.string().datetime({ offset: true }),
  lastModified: z.string().datetime({ offset: true })
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
