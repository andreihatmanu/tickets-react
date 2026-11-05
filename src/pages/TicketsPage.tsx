import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";

import { Pagination } from "../components/Pagination";
import { Spinner } from "../components/Spinner";
import { TicketRow } from "../components/TicketRow";

import type { Ticket } from "../features/tickets/schemas/ticket.schema";
import { TicketState } from "../features/tickets/schemas/ticket.schema";

import { useDebounce } from "../hooks/useDebounce";
import { notify as n } from "../hooks/notify";

const stateLabels: Record<z.infer<typeof TicketState>, string> = {
  REPORTED: "Reportado",
  IN_PROGRESS: "En curso",
  PENDING_SECURITY: "Pendiente de seguridad",
  DONE: "Hecho"
};

export function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search input state
  const [searchParams, setSearchParams] = useSearchParams();
  const queryFromUrl = searchParams.get("q") ?? "";
  const [searchInput, setSearchInput] = useState(queryFromUrl);
  const debouncedSearch = useDebounce(searchInput);

  const offset = Math.max(0, Number(searchParams.get("offset")) || 0);
  const limit = 20;

  const stateParam = searchParams.get("state");
  const parsedState = TicketState.safeParse(stateParam);
  const state = parsedState.success ? parsedState.data : "ALL";

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
          throw new Error(`Error al cargar tickets (${response.status})`);
        }

        const body = await response.json();

        setTickets(body.data);
        setTotal(body.pagination.totalElements);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        const message = "No se han podido cargar los tickets.";

        setTickets([]);
        setTotal(0);
        setError(message);
        n.error(message);
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
      <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />

      <select value={state} onChange={(e) => changeState(e.target.value)}>
        <option value="ALL">Todos</option>

        {TicketState.options.map((option) => (
          <option key={option} value={option}>
            {stateLabels[option]}
          </option>
        ))}
      </select>

      {loading && <Spinner />}

      {error && <p role="alert">{error}</p>}

      {!loading && !error && <p>{expired.length} tickets caducados</p>}

      <table>
        <tbody>
          {tickets.map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket} onChange={() => setTickets([...tickets])} />
          ))}
        </tbody>
      </table>

      <Pagination
        total={total}
        offset={offset}
        limit={limit}
        onChange={(o: number) => {
          const params = new URLSearchParams(searchParams);
          params.set("offset", String(o));
          setSearchParams(params);
        }}
      />
    </div>
  );
}
