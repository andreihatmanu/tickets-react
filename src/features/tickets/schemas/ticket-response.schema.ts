import { z } from "zod";
import { TicketState } from "./ticket.schema";

export const TicketResponseSchema = z.object({
  data: z.array(TicketState),
  pagination: z.object({
    offset: z.number().int().nonnegative(),
    limit: z.number().int().min(1).max(100),
    totalElements: z.number().int().nonnegative()
  })
});

export type TicketResponse = z.infer<typeof TicketResponseSchema>;