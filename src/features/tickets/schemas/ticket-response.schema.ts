import { z } from "zod";
import { Ticket } from "./ticket.schema";

export const TicketResponseSchema = z.object({
  data: z.array(Ticket).max(100),
  pagination: z.object({
    offset: z.number().int().min(0).max(2_147_483_647),
    limit: z.number().int().min(1).max(100),
    totalElements: z.number().int().min(0).max(2_147_483_647)
  })
});

export type TicketResponse = z.infer<typeof TicketResponseSchema>;
