import { useState } from "react";
import type { Ticket } from "../features/tickets/schemas/ticket.schema";
import { severityLabels, stateLabels } from "../features/tickets/ticket-labels";
import { formatDate } from "../hooks/utils";

type TicketRowProps = {
  ticket: Ticket;
  canUpdate: boolean;
  onUpdateDueDate: (ticketId: string, dueDate: string | null) => Promise<void>;
};

export function TicketRow({ ticket, canUpdate, onUpdateDueDate }: TicketRowProps) {
  const [dueDate, setDueDate] = useState(ticket.dueDate?.slice(0, 10) ?? "");
  const [saving, setSaving] = useState(false);

  async function saveDueDate() {
    setSaving(true);
    try {
      await onUpdateDueDate(
        ticket.id,
        dueDate ? new Date(`${dueDate}T12:00:00Z`).toISOString() : null
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr>
      <td>
        <strong>{ticket.key}</strong>
        <small className="ticket-title">{ticket.title}</small>
        {ticket.restricted && <span className="restricted-label">Restringido</span>}
      </td>
      <td>{ticket.asset}</td>
      <td>{ticket.creatorTeam} → {ticket.assignedTeam ?? "Sin asignar"}</td>
      <td>{ticket.assignee}</td>
      <td>{stateLabels[ticket.state]}</td>
      <td>{severityLabels[ticket.severity]}</td>
      <td>{formatDate(ticket.targetDate)}</td>
      <td>
        {canUpdate && ticket.state !== "DONE" ? (
          <div className="due-date-editor">
            <input
              aria-label={`Fecha compromiso ${ticket.key}`}
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
            <button type="button" onClick={() => void saveDueDate()} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        ) : ticket.dueDate ? formatDate(ticket.dueDate) : "—"}
      </td>
    </tr>
  );
}
