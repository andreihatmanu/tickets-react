type TicketRowProps = {
  ticket: any;
  onChange: () => void;
};

export function TicketRow({ ticket, onChange }: TicketRowProps) {
  return (
    <tr>
      <td>{ticket.title ?? ticket.id ?? "Ticket"}</td>
      <td>{ticket.state ?? "—"}</td>
      <td>{ticket.targetDate ?? "—"}</td>
      <td>
        <button type="button" onClick={onChange}>
          Actualizar
        </button>
      </td>
    </tr>
  );
}
