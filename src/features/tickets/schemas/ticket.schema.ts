import { z } from "zod";

export const TicketState = z.enum([
  "REPORTED",
  "IN_PROGRESS",
  "PENDING_SECURITY",
  "DONE"
]);

export const Severity = z.enum([
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW"
]);

export const TicketSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
  asset: z.string(),
  assignedTeam: z.string().nullable(),
  assignee: z.string().email(),
  severity: Severity,
  state: TicketState,
  targetDate: z.string().datetime({ offset: true }),
  dueDate: z.string().datetime({ offset: true }).nullable(),
  lastModified: z.string().datetime({ offset: true })
});

export type Ticket = z.infer<typeof TicketSchema>;