import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";

import { Pagination } from "../components/Pagination";
import { Spinner } from "../components/Spinner";
import { TicketRow } from "../components/TicketRow";

import type { Ticket } from "../features/tickets/schemas/ticket.schema";
import { Ticket as TypeTicket, TicketState } from "../features/tickets/schemas/ticket.schema";

import { mockTickets } from "../features/tickets/mocks/tickets.mock";

import { useDebounce } from "../hooks/useDebounce";
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

  // Search input state
  const [searchParams, setSearchParams] = useSearchParams();
  const queryFromUrl = searchParams.get("q") ?? "";
  const [searchInput, setSearchInput] = useState(queryFromUrl);
  const debouncedSearch = useDebounce(searchInput);

  const offset = Math.max(0, Number(searchParams.get("offset")) || 0);
  const limit = 20;

  const stateParam = searchParams.get("state");
  const parsedState = TicketState.safeParse(stateParam);

  const state: z.infer<typeof TicketState> | "ALL" = parsedState.success ? parsedState.data : "ALL";

  useEffect(() => {
    setSearchInput(queryFromUrl);
  }, [queryFromUrl]);

  useEffect(() => {
    const controller = new AbortController();

    const loadTickets = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          offset: String(offset),
          limit: String(limit)
        });

        if (state !== "ALL") {
          params.set("state", state);
        }

        if (debouncedSearch.trim()) {
          params.set("q", debouncedSearch.trim());
        }

        const response = await fetch(`/api/v1/tickets?${params.toString()}`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }

        const body = await response.json();

        const parsedTickets = z.array(TypeTicket).parse(body.data);

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
  }, [offset, limit, state, debouncedSearch]);

  const changeState = (value: string) => {
    const params = new URLSearchParams(searchParams);

    if (value === "ALL") {
      params.delete("state");
    } else {
      params.set("state", value);
    }

    params.set("offset", "0");
    setSearchParams(params);
  };

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

      <select id="state" value={state} onChange={(event) => changeState(event.target.value)}>
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
            <tr>
            <th scope="col">Clave</th>
            <th scope="col">Asset</th>
            <th scope="col">Equipo asignado</th>
            <th scope="col">Responsable</th>
            <th scope="col">Estado</th>
            <th scope="col">Severidad</th>
            <th scope="col">Fecha objetivo</th>
            <th scope="col">Acciones</th>
          </tr>
            <tbody>
              {tickets.map((ticket) => (
                <TicketRow
                  key={ticket.id}
                  ticket={ticket}
                  //onChange={() => setTickets([...tickets])}
                />
              ))}
            </tbody>
          </table>

          <Pagination
            total={total}
            offset={offset}
            limit={limit}
            onChange={(newOffset: number) => {
              const params = new URLSearchParams(searchParams);
              params.set("offset", String(newOffset));
              setSearchParams(params);
            }}
          />
        </>
      )}
    </div>
  );
}
