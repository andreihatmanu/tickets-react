import { useEffect, useState } from "react";
import { z } from "zod";

import { Pagination } from "../components/Pagination";
import { Spinner } from "../components/Spinner";
import { TicketRow } from "../components/TicketRow";

import type { Ticket } from "../features/tickets/schemas/ticket.schema";
import { Ticket as TicketSchema, TicketState } from "../features/tickets/schemas/ticket.schema";

import { mockTickets } from "../features/tickets/mocks/tickets.mock";

import { useDebounce } from "../hooks/useDebounce";
import { useTicketListParams } from "../hooks/useTicketListParams";
import { notify as n } from "../hooks/notify";

export const stateLabels: Record<z.infer<typeof TicketState>, string> = {
  REPORTED: "Reportado",
  IN_PROGRESS: "En curso",
  PENDING_SECURITY: "Pendiente de seguridad",
  DONE: "Hecho"
};

export const severityLabels: Record<string, string> = {
  CRITICAL: "Crítico",
  HIGH: "Alto",
  MEDIUM: "Medio",
  LOW: "Bajo"
};

export function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingMocks, setUsingMocks] = useState(false);

  // URL parameters
  const { params, setPage, setFilters } = useTicketListParams();
  const { offset, limit, state, q } = params;

  // Search input
  const [searchInput, setSearchInput] = useState(q);
  const debouncedSearch = useDebounce(searchInput);

  // Synchronize search input with URL navigation (back/forward)
  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  // Update URL after debounce
  useEffect(() => {
    if (debouncedSearch.trim() !== q) {
      setFilters({ q: debouncedSearch.trim() });
    }
  }, [debouncedSearch, q, setFilters]);

  // Load tickets
  useEffect(() => {
    const controller = new AbortController();

    const loadTickets = async () => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({
          offset: String(offset),
          limit: String(limit)
        });

        if (state !== "ALL") {
          queryParams.set("state", state);
        }

        if (q.trim()) {
          queryParams.set("q", q.trim());
        }

        const response = await fetch(`/api/v1/tickets?${queryParams.toString()}`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }

        const body = await response.json();

        const parsedTickets = z.array(TicketSchema).parse(body.data);

        setTickets(parsedTickets);
        setTotal(body.pagination.totalElements);
        setUsingMocks(false);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setTickets(mockTickets);
        setTotal(mockTickets.length);
        setUsingMocks(true);

        n.info("Mostrando datos de demostración debido a un error al obtener los tickets.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadTickets();

    return () => controller.abort();
  }, [offset, limit, state, q]);

  const now = Date.now();

  const expired = tickets.filter((ticket) => new Date(ticket.targetDate).getTime() < now);

  return (
    <div>
      <input
        type="search"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder="Buscar tickets..."
      />

      <select
        id="state"
        value={state}
        onChange={(event) => setFilters({ state: event.target.value as typeof state })}
      >
        <option value="ALL">Todos</option>

        {Object.keys(stateLabels).map((option) => (
          <option key={option} value={option}>
            {stateLabels[option as z.infer<typeof TicketState>]}
          </option>
        ))}
      </select>

      {usingMocks && <p role="status">Mostrando datos de demostración.</p>}

      {loading && <Spinner />}

      {error && <p role="alert">{error}</p>}

      {!loading && (
        <>
          <p>{expired.length} tickets caducados</p>

          <table>
            <thead>
              <tr>
                <th scope="col">Clave</th>
                <th scope="col">Asset</th>
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

          <Pagination
            total={total}
            offset={offset}
            limit={limit}
            disabled={loading}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}
