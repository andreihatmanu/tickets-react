/** Generated from contract/openapirest.yml (OpenAPI 3.0.3). */
export interface components {
  schemas: {
    TicketState: "REPORTED" | "IN_PROGRESS" | "PENDING_SECURITY" | "DONE";
    TicketSeverity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    TicketStateFilter: "ALL" | "REPORTED" | "IN_PROGRESS" | "PENDING_SECURITY" | "DONE";
    SeverityFilter: "ALL" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    TicketSort: "TARGET_DATE" | "LAST_MODIFIED" | "SEVERITY";
    Direction: "ASC" | "DESC";
    Ticket: {
      id: string;
      key: string;
      title: string;
      asset: string;
      creatorTeam: string;
      assignedTeam: string | null;
      assignee: string;
      severity: components["schemas"]["TicketSeverity"];
      state: components["schemas"]["TicketState"];
      restricted: boolean;
      targetDate: string;
      dueDate: string | null;
      createdAt: string;
      lastModified: string;
    };
    Pagination: { offset: number; limit: number; totalElements: number };
    TicketPage: { data: components["schemas"]["Ticket"][]; pagination: components["schemas"]["Pagination"] };
    DueDateUpdate: { dueDate: string | null };
    CurrentUser: { team: string; permissions: string[] };
    Problem: { type: string; title: string; status: number; detail: string; instance?: string | null };
  };
}
export interface paths {
  "/api/v1/tickets": {
    get: {
      parameters: { query?: { offset?: number; limit?: number; q?: string; state?: components["schemas"]["TicketStateFilter"]; severity?: components["schemas"]["SeverityFilter"]; sort?: components["schemas"]["TicketSort"]; direction?: components["schemas"]["Direction"] }; header?: { "X-User-Team"?: string; "X-User-Permissions"?: string } };
      responses: { 200: { content: { "application/json": components["schemas"]["TicketPage"] } } };
    };
  };
  "/api/v1/tickets/{ticketId}": {
    patch: {
      parameters: { path: { ticketId: string }; header?: { "X-User-Team"?: string; "X-User-Permissions"?: string } };
      requestBody: { content: { "application/json": components["schemas"]["DueDateUpdate"] } };
      responses: { 200: { content: { "application/json": components["schemas"]["Ticket"] } } };
    };
  };
  "/api/v1/me": {
    get: {
      parameters: { header?: { "X-User-Team"?: string; "X-User-Permissions"?: string } };
      responses: { 200: { content: { "application/json": components["schemas"]["CurrentUser"] } } };
    };
  };
}
