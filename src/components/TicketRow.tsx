import type { Ticket } from "../features/tickets/schemas/ticket.schema";
import { severityLabels, stateLabels } from "../pages/TicketsPage";
import { useFormatDate } from "../hooks/utils";
type TicketRowProps = {
  ticket: Ticket;
  onChange?: () => void;
};
const { formatDate } = useFormatDate();
export function TicketRow({ ticket, onChange }: TicketRowProps) {
  return (
    <tr>
      <td>{ticket.key ?? ticket.id ?? "---"}</td>
      <td>{ticket.asset ?? "---"}</td>
      <td>{ticket.assignedTeam ?? "---"}</td>
      <td>{ticket.assignee ?? "---"}</td>
      <td>{ticket.state ? stateLabels[ticket.state as keyof typeof stateLabels] : ticket.state}</td>
      <td>
        {ticket.severity
          ? severityLabels[ticket.severity as keyof typeof severityLabels]
          : ticket.severity}
      </td>
      <td>{ticket.targetDate ? formatDate(ticket.targetDate) : "—"}</td>
    </tr>
  );
}
