import { useEffect, useRef, useState } from "react";

import { Pagination } from "../components/Pagination";
import { Spinner } from "../components/Spinner";
import { TicketRow } from "../components/TicketRow";
import type { Ticket } from "../features/tickets/schemas/ticket.schema";
import { severityLabels, stateLabels } from "../features/tickets/ticket-labels";
import {
  getTickets,
  getMe,
  apiErrorMessage,
  PROFILES,
  updateTicketDueDate,
  type ProfileId
} from "../features/tickets/services/ticket.service";
import { useDebounce } from "../hooks/useDebounce";
import { notify } from "../hooks/notify";
import { useTicketListParams } from "../hooks/useTicketListParams";

export function TicketsPage({
  profile,
  setProfile
}: {
  profile: ProfileId;
  setProfile: (profile: ProfileId) => void;
}) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  const { params, setPage, setFilters } = useTicketListParams();
  const { offset, limit, state, severity, sort, direction, q } = params;
  const [searchInput, setSearchInput] = useState(q);
  const debouncedSearch = useDebounce(searchInput);
  const lastUrlQuery = useRef(q);
  const skipNextDebouncedUpdate = useRef(false);

  useEffect(() => {
    if (q !== lastUrlQuery.current) {
      lastUrlQuery.current = q;
      skipNextDebouncedUpdate.current = true;
      setSearchInput(q);
    }
  }, [q]);

  useEffect(() => {
    if (skipNextDebouncedUpdate.current) {
      skipNextDebouncedUpdate.current = false;
      return;
    }
    const normalizedSearch = debouncedSearch.trim();
    if (normalizedSearch !== q) setFilters({ q: normalizedSearch });
  }, [debouncedSearch, q, setFilters]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadTickets() {
      setLoading(true);
      setError("");
      try {
        const me = await getMe(profile, controller.signal);
        if (controller.signal.aborted) return;
        setUserPermissions(me.permissions);
        const response = await getTickets(params, controller.signal, profile);
        if (controller.signal.aborted) return;
        setTickets(response.data);
        setTotal(response.pagination.totalElements);
      } catch (cause) {
        if (controller.signal.aborted || (cause instanceof Error && cause.name === "AbortError"))
          return;
        const message = apiErrorMessage(cause);
        setError(message);
        setTickets([]);
        setTotal(0);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadTickets();
    return () => controller.abort();
  }, [offset, limit, state, severity, sort, direction, q, profile]);

  const canUpdate = userPermissions.includes("tickets.update");
  const expired = tickets.filter(
    (ticket) => ticket.state !== "DONE" && ticket.targetDate < new Date().toISOString().slice(0, 10)
  ).length;

  async function handleUpdateDueDate(ticketId: string, dueDate: string) {
    try {
      const updated = await updateTicketDueDate(ticketId, dueDate, profile);
      setTickets((current) => current.map((ticket) => (ticket.id === ticketId ? updated : ticket)));
      notify.success(`${updated.key}: fecha compromiso actualizada`);
    } catch (cause) {
      notify.error(apiErrorMessage(cause));
      console.error("[TicketRow] Error al actualizar", cause);
    }
  }

  return (
    <main>
      <header className="app-header">
        <div>
          <p className="eyebrow">CLASSORA TECHNOLOGIES · SECURITY</p>
          <h1>Mini Tickets</h1>
          <p className="subtitle">Gestión de hallazgos de seguridad por equipos</p>
        </div>
        <div className="profile-field">
          <label htmlFor="profile">Perfil simulado</label>
          <select
            id="profile"
            value={profile}
            onChange={(event) => {
              setProfile(event.target.value as ProfileId);
              setTickets([]);
              setUserPermissions([]);
              setTotal(0);
              setError("");
              setPage(0);
            }}
          >
            {Object.entries(PROFILES).map(([id, item]) => (
              <option key={id} value={id}>
                {item.label}
              </option>
            ))}
          </select>
          <small>{PROFILES[profile].permissions.join(", ")}</small>
        </div>
      </header>

      <section className="filters" aria-label="Filtros de tickets">
        <div className="filter-field">
          <label htmlFor="ticket-search">Buscar</label>
          <input
            id="ticket-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Clave, título, activo, equipo o responsable"
          />
        </div>
        <div className="filter-field">
          <label htmlFor="ticket-state">Estado</label>
          <select
            id="ticket-state"
            value={state}
            onChange={(event) => setFilters({ state: event.target.value as typeof state })}
          >
            <option value="ALL">Todos</option>
            {Object.entries(stateLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="ticket-severity">Severidad</label>
          <select
            id="ticket-severity"
            value={severity}
            onChange={(event) => setFilters({ severity: event.target.value as typeof severity })}
          >
            <option value="ALL">Todas</option>
            {Object.entries(severityLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="ticket-sort">Ordenar por</label>
          <select
            id="ticket-sort"
            value={sort}
            onChange={(event) => setFilters({ sort: event.target.value as typeof sort })}
          >
            <option value="LAST_MODIFIED">Última modificación</option>
            <option value="TARGET_DATE">Fecha objetivo</option>
            <option value="SEVERITY">Severidad</option>
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="ticket-direction">Dirección</label>
          <select
            id="ticket-direction"
            value={direction}
            onChange={(event) => setFilters({ direction: event.target.value as typeof direction })}
          >
            <option value="DESC">Descendente</option>
            <option value="ASC">Ascendente</option>
          </select>
        </div>
      </section>

      {error && (
        <p className="error-notice" role="alert">
          {error}
        </p>
      )}
      {loading && <Spinner label="Actualizando tickets…" size="small" />}
      <div className="list-summary">
        <p>
          {total} tickets visibles · {expired} caducados en esta página
        </p>
        <p>La fecha objetivo es inmutable; la fecha compromiso la establece el equipo.</p>
      </div>

      <div className="table-container" aria-busy={loading}>
        <table>
          <thead>
            <tr>
              <th scope="col">Ticket</th>
              <th scope="col">Activo</th>
              <th scope="col">Equipos</th>
              <th scope="col">Responsable</th>
              <th scope="col">Estado</th>
              <th scope="col">Severidad</th>
              <th scope="col">Fecha objetivo</th>
              <th scope="col">Fecha compromiso</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <TicketRow
                key={ticket.id}
                ticket={ticket}
                canUpdate={canUpdate}
                onUpdateDueDate={handleUpdateDueDate}
              />
            ))}
          </tbody>
        </table>
        {!loading && !error && tickets.length === 0 && (
          <p className="empty-state" role="status">
            No hay tickets visibles que coincidan con los filtros.
          </p>
        )}
      </div>

      <Pagination
        total={total}
        offset={offset}
        limit={limit}
        disabled={loading}
        onChange={setPage}
      />
    </main>
  );
}
