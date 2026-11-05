import type { Ticket } from "../features/tickets/schemas/ticket.schema";
import { severityLabels, stateLabels } from "../features/tickets/ticket-labels";
import { formatDate } from "../hooks/utils";

type TicketRowProps = {
  ticket: Ticket;
};

export function TicketRow({ ticket }: TicketRowProps) {
  return (
    <tr>
      <td>{ticket.key}</td>
      <td>{ticket.asset}</td>
      <td>{ticket.assignedTeam ?? "—"}</td>
      <td>{ticket.assignee}</td>
      <td>{stateLabels[ticket.state]}</td>
      <td>{severityLabels[ticket.severity]}</td>
      <td>{formatDate(ticket.targetDate)}</td>
    </tr>
  );
}
