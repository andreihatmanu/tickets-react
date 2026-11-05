import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Pagination } from "../components/Pagination";
import { Spinner } from "../components/Spinner";
import { TicketRow } from "../components/TicketRow";

export function TicketsPage() {
  const { teamId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const offset = parseInt(searchParams.get("offset")!);
  const limit = 20;
  const state = searchParams.get("state") || "ALL";
  useEffect(() => {
    setLoading(true);
    fetch(
      `/api/v1/teams/${teamId!}/tickets? offset=${offset}&limit=${limit}&state=${state}&q=${search}`,
    )
      .then((r) => r.json())
      .then((body) => {
        setTickets(body.data);
        setTotal(body.pagination.totalElements);
        setLoading(false);
      });
  }, [offset, state, search]);
  const changeState = (value: string) => {
    searchParams.set("state", value);
    setSearchParams(searchParams);
  };
  const expired = tickets.filter((t) => new Date(t.targetDate) < new Date());
  return (
    <div>
      {" "}
      <input value={search} onChange={(e) => setSearch(e.target.value)} />{" "}
      <select value={state} onChange={(e) => changeState(e.target.value)}>
        {" "}
        <option value="ALL">Todos</option>{" "}
        <option value="REPORTED">Reportado</option>{" "}
        <option value="IN_PROGRESS">En curso</option>{" "}
        <option value="DONE">Hecho</option>{" "}
      </select>{" "}
      {loading && <Spinner />} <p>{expired.length} tickets caducados</p>{" "}
      <table>
        {" "}
        Classora Technologies · Prueba técnica · react-senior 2 / 5
        <tbody>
          {" "}
          {tickets.map((t, i) => (
            <TicketRow
              key={i}
              ticket={t}
              onChange={() => setTickets([...tickets])}
            />
          ))}{" "}
        </tbody>{" "}
      </table>{" "}
      <Pagination
        total={total}
        offset={offset}
        limit={limit}
        onChange={(o: number) => {
          searchParams.set("offset", String(o));
          setSearchParams(searchParams);
        }}
      />{" "}
    </div>
  );
}
