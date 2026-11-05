import { useEffect, useRef, useState } from "react";

import { Pagination } from "../components/Pagination";
import { Spinner } from "../components/Spinner";
import { TicketRow } from "../components/TicketRow";

import { getMockTicketPage } from "../features/tickets/mocks/ticket-list";
import { severityLabels, stateLabels } from "../features/tickets/ticket-labels";
import type { Ticket } from "../features/tickets/schemas/ticket.schema";
import { getTickets } from "../features/tickets/services/ticket.service";

import { useDebounce } from "../hooks/useDebounce";
import { notify } from "../hooks/notify";
import { useTicketListParams } from "../hooks/useTicketListParams";

export function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [usingMockData, setUsingMockData] = useState(false);
  const hasNotifiedMocks = useRef(false);

  const { params, setPage, setFilters } = useTicketListParams();
  const { offset, limit, state, severity, sort, direction, q } = params;

  const [searchInput, setSearchInput] = useState(q);
  const debouncedSearch = useDebounce(searchInput);
  const lastUrlQuery = useRef(q);
  const skipNextDebouncedUpdate = useRef(false);

  // Keep the input synchronized when the user navigates with browser back/forward.
  useEffect(() => {
    if (q !== lastUrlQuery.current) {
      lastUrlQuery.current = q;
      skipNextDebouncedUpdate.current = true;
      setSearchInput(q);
    }
  }, [q]);

  // Debounce belongs at the UI boundary: URL changes (and API requests) happen after typing pauses.
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

      try {
        const response = await getTickets(params, controller.signal);
        if (controller.signal.aborted) return;

        setTickets(response.data);
        setTotal(response.pagination.totalElements);
        setUsingMockData(false);
      } catch (error) {
        if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
          return;
        }

        const mockPage = getMockTicketPage(params);
        setTickets(mockPage.data);
        setTotal(mockPage.total);
        setUsingMockData(true);

        if (!hasNotifiedMocks.current) {
          notify.warning("No se pudo conectar con la API. Se muestran datos de demostración.");
          hasNotifiedMocks.current = true;
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadTickets();
    return () => controller.abort();
  }, [offset, limit, state, severity, sort, direction, q]);

  const expired = tickets.filter((ticket) => new Date(ticket.targetDate).getTime() < Date.now());

  return (
    <main>
      <h1>Tickets de seguridad</h1>

      <section className="filters" aria-label="Filtros de tickets">
        <div className="filter-field">
          <label htmlFor="ticket-search">Buscar</label>
          <input
            id="ticket-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Clave, activo, equipo o responsable"
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

      {usingMockData && (
        <p className="demo-notice" role="status">
          Estás viendo datos de demostración; pueden no reflejar el estado real del sistema.
        </p>
      )}

      {loading && <Spinner label="Actualizando tickets..." size="small" />}

      <p aria-live="polite">{expired.length} tickets caducados en esta página</p>

      <div className="table-container" aria-busy={loading}>
        <table>
          <thead>
            <tr>
              <th scope="col">Clave</th>
              <th scope="col">Activo</th>
              <th scope="col">Equipo asignado</th>
              <th scope="col">Responsable</th>
              <th scope="col">Estado</th>
              <th scope="col">Severidad</th>
              <th scope="col">Fecha objetivo</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} />
            ))}
          </tbody>
        </table>

        {!loading && tickets.length === 0 && (
          <p className="empty-state" role="status">
            No se han encontrado tickets con estos filtros.
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
