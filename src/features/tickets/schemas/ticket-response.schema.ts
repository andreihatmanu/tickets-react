import { z } from "zod";
import { TicketSchema } from "./ticket.schema";

export const TicketResponseSchema = z.object({
  data: z.array(TicketSchema),
  pagination: z.object({
    offset: z.number().int().nonnegative(),
    limit: z.number().int().min(1).max(100),
    totalElements: z.number().int().nonnegative()
  })
});

export type TicketResponse = z.infer<typeof TicketResponseSchema>;