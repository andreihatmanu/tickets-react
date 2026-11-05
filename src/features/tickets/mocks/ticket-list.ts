import type { Ticket } from "../schemas/ticket.schema";
import type { TicketListParams } from "../../../hooks/useTicketListParams";
import { mockTickets } from "./tickets.mock";

export function getMockTicketPage(params: TicketListParams) {
  const query = params.q.toLocaleLowerCase("es");

  const filtered = mockTickets.filter((ticket) => {
    const matchesQuery =
      query.length === 0 ||
      [ticket.key, ticket.asset, ticket.assignedTeam ?? "", ticket.assignee].some((value) =>
        value.toLocaleLowerCase("es").includes(query)
      );
    const matchesState = params.state === "ALL" || ticket.state === params.state;
    const matchesSeverity = params.severity === "ALL" || ticket.severity === params.severity;

    return matchesQuery && matchesState && matchesSeverity;
  });

  const compare = (left: Ticket, right: Ticket): number => {
    let result = 0;

    if (params.sort === "SEVERITY") {
      const severityOrder = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
      result = severityOrder.indexOf(left.severity) - severityOrder.indexOf(right.severity);
    } else {
      const leftDate = params.sort === "TARGET_DATE" ? left.targetDate : left.lastModified;
      const rightDate = params.sort === "TARGET_DATE" ? right.targetDate : right.lastModified;
      result = new Date(leftDate).getTime() - new Date(rightDate).getTime();
    }

    return params.direction === "DESC" ? -result : result;
  };

  filtered.sort(compare);

  return {
    data: filtered.slice(params.offset, params.offset + params.limit),
    total: filtered.length
  };
}
