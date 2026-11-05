import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Pagination } from "../components/Pagination";
import { Spinner } from "../components/Spinner";
import { TicketRow } from "../components/TicketRow";

import type { Ticket } from "../features/tickets/schemas/ticket.schema";

import { useDebounce } from "../hooks/useDebounce";
import { notify as n } from "../hooks/notify";

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
  const state = searchParams.get("state") || "ALL";

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

        setTickets([]);
        setTotal(0);
        n.error("No se han podido cargar los tickets.");
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

  const expired = tickets.filter((ticket) => new Date(ticket.targetDate) < new Date());

  return (
    <div>
      <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />

      <select value={state} onChange={(e) => changeState(e.target.value)}>
        <option value="ALL">Todos</option>
        <option value="REPORTED">Reportado</option>
        <option value="IN_PROGRESS">En curso</option>
        <option value="PENDING_SECURITY">Pendiente de seguridad</option>
        <option value="DONE">Hecho</option>
      </select>

      {loading && <Spinner label="Cargando tickets..." />}

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
