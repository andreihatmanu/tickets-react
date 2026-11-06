import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Ticket } from "../features/tickets/schemas/ticket.schema";
import {
  apiErrorMessage,
  getTicket,
  type ProfileId
} from "../features/tickets/services/ticket.service";
import { stateLabels, severityLabels } from "../features/tickets/ticket-labels";

export function TicketDetailPage({ profile }: { profile: ProfileId }) {
  const { ticketId = "" } = useParams();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setTicket(null);
    setNotFound(false);
    setError("");
    getTicket(ticketId, profile, controller.signal)
      .then(setTicket)
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        if (cause && typeof cause === "object" && "status" in cause && cause.status === 404)
          setNotFound(true);
        else setError(apiErrorMessage(cause));
      });
    return () => controller.abort();
  }, [ticketId, profile]);
  if (notFound)
    return (
      <main>
        <h1>Ticket no encontrado</h1>
        <p>El ticket no existe o no está disponible para tu perfil.</p>
        <Link to="/">Volver al listado</Link>
      </main>
    );
  if (error)
    return (
      <main>
        <p role="alert">{error}</p>
        <Link to="/">Volver al listado</Link>
      </main>
    );
  if (!ticket)
    return (
      <main>
        <p role="status">Cargando ticket…</p>
      </main>
    );
  return (
    <main>
      <Link to="/">← Volver al listado</Link>
      <h1>{ticket.key}</h1>
      <h2>{ticket.title}</h2>
      <dl>
        <dt>Activo</dt>
        <dd>{ticket.asset}</dd>
        <dt>Estado</dt>
        <dd>{stateLabels[ticket.state]}</dd>
        <dt>Severidad</dt>
        <dd>{severityLabels[ticket.severity]}</dd>
        <dt>Equipo asignado</dt>
        <dd>{ticket.assignedTeam ?? "Sin asignar"}</dd>
        <dt>Fecha objetivo</dt>
        <dd>{ticket.targetDate}</dd>
        <dt>Fecha compromiso</dt>
        <dd>{ticket.dueDate ?? "—"}</dd>
      </dl>
    </main>
  );
}
